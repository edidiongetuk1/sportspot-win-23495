import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ---- Admin authentication ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Invalid authentication' }, 401);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) return json({ error: 'Unauthorized - Admin access required' }, 403);

    const { withdrawalId, action, adminNotes } = await req.json();
    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return json({ error: 'Invalid request parameters' }, 400);
    }

    // ---- Reject path ----
    if (action === 'reject') {
      const { data: rejected, error: rejectError } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (rejectError) throw rejectError;
      if (!rejected) return json({ error: 'Withdrawal not found or already processed' }, 404);

      return json({ success: true, message: 'Withdrawal rejected' });
    }

    // ---- Approve path: claim the row atomically (pending -> processing) ----
    const { data: withdrawal, error: claimError } = await supabase
      .from('withdrawals')
      .update({
        status: 'processing',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq('id', withdrawalId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (claimError) throw claimError;
    if (!withdrawal) return json({ error: 'Withdrawal not found or already processed' }, 404);

    const failWithdrawal = async (reason: string, restore: 'pending' | 'failed' = 'failed') => {
      await supabase
        .from('withdrawals')
        .update({ status: restore, failure_reason: reason })
        .eq('id', withdrawalId);
    };

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      await failWithdrawal('Payouts not configured', 'pending');
      return json({ error: 'Payouts not configured' }, 500);
    }

    // ---- Balance check + debit ----
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, balance, email')
      .eq('id', withdrawal.user_id)
      .maybeSingle();

    if (!profile) {
      await failWithdrawal('User profile not found', 'pending');
      return json({ error: 'User profile not found' }, 404);
    }

    const currentBalance = Number(profile.balance);
    const amount = Number(withdrawal.amount);

    if (!(amount > 0)) {
      await failWithdrawal('Invalid withdrawal amount');
      return json({ error: 'Invalid withdrawal amount' }, 400);
    }
    if (currentBalance < amount) {
      await failWithdrawal('Insufficient balance', 'pending');
      return json({ error: 'Insufficient balance' }, 400);
    }

    const newBalance = currentBalance - amount;
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', profile.id);

    if (debitError) {
      await failWithdrawal('Failed to debit balance', 'pending');
      throw debitError;
    }

    const refund = async () => {
      const { data: fresh } = await supabase
        .from('profiles').select('balance').eq('id', profile.id).maybeSingle();
      if (fresh) {
        await supabase
          .from('profiles')
          .update({ balance: Number(fresh.balance) + amount })
          .eq('id', profile.id);
      }
    };

    // ---- Resolve or create the Paystack transfer recipient ----
    let recipientCode: string | null = withdrawal.recipient_code ?? null;
    const bankCode: string | null = withdrawal.bank_code ?? null;

    if (!recipientCode) {
      if (!bankCode) {
        await refund();
        await failWithdrawal('Missing bank code — user must resubmit with a selected bank', 'pending');
        return json({ error: 'Withdrawal is missing a bank code. Ask the user to resubmit with a bank selected.' }, 400);
      }

      const { data: saved } = await supabase
        .from('payout_recipients')
        .select('recipient_code')
        .eq('provider', 'paystack')
        .eq('user_id', withdrawal.user_id)
        .eq('account_number', withdrawal.account_number)
        .eq('bank_code', bankCode)
        .maybeSingle();

      recipientCode = saved?.recipient_code ?? null;

      if (!recipientCode) {
        const recRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nuban',
            name: profile.email,
            account_number: withdrawal.account_number,
            bank_code: bankCode,
            currency: 'NGN',
          }),
        });
        const recBody = await recRes.json();
        if (!recRes.ok || !recBody.status) {
          console.error('Recipient creation failed:', recBody);
          await refund();
          await failWithdrawal(recBody.message ?? 'Failed to create transfer recipient', 'pending');
          return json({ error: recBody.message ?? 'Failed to create transfer recipient' }, 502);
        }
        recipientCode = recBody.data.recipient_code;

        await supabase.from('payout_recipients').upsert({
          provider: 'paystack',
          user_id: withdrawal.user_id,
          account_number: withdrawal.account_number,
          bank_code: bankCode,
          bank_name: withdrawal.bank_name,
          recipient_code: recipientCode,
        }, { onConflict: 'provider,user_id,account_number,bank_code' });
      }
    }

    // ---- Initiate the transfer (idempotent via our own reference) ----
    const reference = `wd_${withdrawalId}`;
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: 'Wallet withdrawal',
        reference,
      }),
    });
    const transferBody = await transferRes.json();

    if (!transferRes.ok || !transferBody.status) {
      console.error('Transfer initiation failed:', transferBody);
      await refund();
      await failWithdrawal(transferBody.message ?? 'Transfer initiation failed');
      return json({ error: transferBody.message ?? 'Transfer initiation failed' }, 502);
    }

    const transferStatus: string = transferBody.data.status; // pending | otp | success | ...
    const finalStatus = transferStatus === 'success' ? 'approved' : 'processing';

    await supabase
      .from('withdrawals')
      .update({
        status: finalStatus,
        recipient_code: recipientCode,
        transfer_code: transferBody.data.transfer_code,
        transfer_reference: transferBody.data.reference ?? reference,
        processed_at: finalStatus === 'approved' ? new Date().toISOString() : null,
        failure_reason: null,
      })
      .eq('id', withdrawalId);

    await supabase.from('audit_logs').insert({
      user_id: withdrawal.user_id,
      action_type: 'withdrawal',
      amount: -amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: withdrawalId,
      reference_type: 'withdrawal',
      metadata: {
        account_number: withdrawal.account_number,
        bank_name: withdrawal.bank_name,
        bank_code: bankCode,
        approved_by: user.id,
        admin_notes: adminNotes,
        provider: 'paystack',
        transfer_code: transferBody.data.transfer_code,
        transfer_reference: transferBody.data.reference ?? reference,
        transfer_status: transferStatus,
      },
    });

    console.log('Transfer initiated:', { withdrawalId, transferStatus, newBalance });

    return json({
      success: true,
      message:
        transferStatus === 'success'
          ? 'Payout sent successfully'
          : 'Payout initiated — awaiting confirmation from the payment provider',
      status: finalStatus,
      newBalance,
    });
  } catch (error) {
    console.error('Withdrawal processing error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
