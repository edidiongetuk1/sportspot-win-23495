import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, verif-hash',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedHash = Deno.env.get('FLUTTERWAVE_WEBHOOK_HASH');
    const flwSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!expectedHash || !flwSecret) {
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('verif-hash');
    if (!signature || signature !== expectedHash) {
      console.error('Invalid verif-hash');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = await req.json();
    console.log('Flutterwave event:', event?.event, event?.data?.status);

    const data = event.data || event;
    const status = data.status;
    const txId = data.id;
    const txRef = data.tx_ref;

    if (status !== 'successful' || !txId) {
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify with Flutterwave API
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: { Authorization: `Bearer ${flwSecret}` },
    });
    const verify = await verifyRes.json();
    if (!verifyRes.ok || verify.status !== 'success' || verify.data.status !== 'successful') {
      console.error('Verification failed:', verify);
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verified = verify.data;
    if (verified.tx_ref !== txRef || verified.currency !== 'NGN') {
      return new Response(JSON.stringify({ error: 'Mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amount = Number(verified.amount);
    const userId = verified.meta?.user_id;
    if (!userId || !amount) {
      return new Response(JSON.stringify({ error: 'Missing user_id or amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Idempotency: check audit log for this reference
    const { data: existing } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('reference_type', 'deposit')
      .contains('metadata', { flw_tx_ref: txRef })
      .maybeSingle();

    if (existing) {
      console.log('Already processed:', txRef);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles').select('id, balance').eq('id', userId).single();
    if (pErr || !profile) {
      console.error('Profile not found', pErr);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance + amount;

    const { error: uErr } = await supabase
      .from('profiles').update({ balance: newBalance }).eq('id', userId);
    if (uErr) throw uErr;

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: 'deposit',
      amount,
      balance_before: oldBalance,
      balance_after: newBalance,
      reference_type: 'deposit',
      metadata: { flw_tx_ref: txRef, flw_tx_id: txId, provider: 'flutterwave' },
    });

    console.log('Credited', userId, amount);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
