import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const flwSecret = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flwSecret) {
      return new Response(JSON.stringify({ error: 'Flutterwave not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;
    const email = claimsData.claims.email;

    const { amount, redirect_url } = await req.json();
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > 10_000_000) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tx_ref = `dep_${userId}_${Date.now()}`;

    const payload = {
      tx_ref,
      amount: amt,
      currency: 'NGN',
      redirect_url,
      customer: { email },
      customizations: { title: 'GameX Deposit', description: 'Wallet top-up' },
      meta: { user_id: userId },
    };

    const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${flwSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const flwData = await flwRes.json();
    if (!flwRes.ok || flwData.status !== 'success') {
      console.error('Flutterwave init failed:', flwData);
      return new Response(JSON.stringify({ error: 'Payment init failed', details: flwData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ link: flwData.data.link, tx_ref }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('initiate error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
