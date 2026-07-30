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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();
    if (!reference || typeof reference !== 'string') {
      return json({ error: 'Payment reference is required' }, 400);
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return json({ error: 'Payment verification not configured' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } }
    );
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return json({ error: 'Payment verification failed', details: verifyData.message }, 400);
    }

    const customerEmail = verifyData.data.customer.email as string;
    const depositAmount = Number(verifyData.data.amount) / 100;

    // Resolve user: prefer metadata.user_id, fall back to email lookup
    let userId: string | undefined = verifyData.data.metadata?.user_id;
    if (!userId) {
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;
      userId = users.find((u) => u.email === customerEmail)?.id;
    }
    if (!userId) return json({ error: 'User not found' }, 404);

    // ---- Strict idempotency: unique (provider, reference) claim ----
    const { error: claimError } = await supabase
      .from('payment_credits')
      .insert({ provider: 'paystack', reference, user_id: userId, amount: depositAmount });

    if (claimError) {
      if (claimError.code === '23505') {
        const { data: p } = await supabase
          .from('profiles').select('balance').eq('id', userId).maybeSingle();
        console.log('Duplicate credit blocked for reference:', reference);
        return json({
          success: true,
          alreadyProcessed: true,
          amount: depositAmount,
          newBalance: p ? Number(p.balance) : undefined,
          message: 'Transaction already processed',
        });
      }
      throw claimError;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id, balance').eq('id', userId).maybeSingle();

    if (profileError || !profile) {
      await supabase.from('payment_credits')
        .delete().eq('provider', 'paystack').eq('reference', reference);
      return json({ error: 'Profile not found' }, 404);
    }

    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance + depositAmount;

    const { error: updateError } = await supabase
      .from('profiles').update({ balance: newBalance }).eq('id', profile.id);

    if (updateError) {
      await supabase.from('payment_credits')
        .delete().eq('provider', 'paystack').eq('reference', reference);
      throw updateError;
    }

    await supabase.from('audit_logs').insert({
      user_id: profile.id,
      action_type: 'deposit',
      amount: depositAmount,
      balance_before: oldBalance,
      balance_after: newBalance,
      reference_type: 'deposit',
      metadata: {
        payment_reference: reference,
        provider: 'paystack',
        customer_email: customerEmail,
        verified_at: new Date().toISOString(),
      },
    });

    return json({
      success: true,
      alreadyProcessed: false,
      amount: depositAmount,
      newBalance,
      message: 'Deposit processed successfully',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
