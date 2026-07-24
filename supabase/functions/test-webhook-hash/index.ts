import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId, _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const { candidate } = await req.json();
    const expected = Deno.env.get('FLUTTERWAVE_WEBHOOK_HASH') ?? '';
    const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';

    const cand = String(candidate ?? '');
    const matches = expected.length > 0 && cand === expected;

    return json({
      matches,
      expected_configured: expected.length > 0,
      expected_length: expected.length,
      candidate_length: cand.length,
      secret_key_configured: secretKey.length > 0,
      preview_hint: expected.length > 0
        ? `${expected.slice(0, 2)}…${expected.slice(-2)} (${expected.length} chars)`
        : 'not set',
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
