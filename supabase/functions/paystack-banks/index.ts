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
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) return json({ error: 'Payments not configured' }, 500);

    // Require a signed-in user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? 'banks';

    if (action === 'banks') {
      const res = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100', {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      });
      const body = await res.json();
      if (!res.ok || !body.status) return json({ error: body.message ?? 'Failed to load banks' }, 502);
      const banks = (body.data as any[])
        .map((b) => ({ name: b.name, code: b.code }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return json({ banks });
    }

    if (action === 'resolve') {
      const accountNumber = (url.searchParams.get('account_number') ?? '').trim();
      const bankCode = (url.searchParams.get('bank_code') ?? '').trim();
      if (!/^\d{10}$/.test(accountNumber) || !/^\d{2,10}$/.test(bankCode)) {
        return json({ error: 'Invalid account number or bank' }, 400);
      }
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      const body = await res.json();
      if (!res.ok || !body.status) {
        return json({ error: body.message ?? 'Could not verify account' }, 400);
      }
      return json({ accountName: body.data.account_name });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('paystack-banks error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
