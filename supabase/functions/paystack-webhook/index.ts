import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
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
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return json({ error: 'Webhook not configured' }, 500);
    }

    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(paystackSecret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const hashBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    if (event.event !== 'charge.success') {
      return json({ received: true });
    }

    const { customer, amount, metadata, reference } = event.data;
    const depositAmount = Number(amount) / 100;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let userId: string | undefined = metadata?.user_id;
    if (!userId) {
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;
      userId = users.find((u) => u.email === customer.email)?.id;
    }
    if (!userId) {
      console.error('User not found for email:', customer.email);
      return json({ error: 'User not found' }, 404);
    }

    // ---- Strict idempotency: unique (provider, reference) claim ----
    const { error: claimError } = await supabase
      .from('payment_credits')
      .insert({ provider: 'paystack', reference, user_id: userId, amount: depositAmount });

    if (claimError) {
      if (claimError.code === '23505') {
        console.log('Duplicate credit blocked for reference:', reference);
        return json({ success: true, alreadyProcessed: true });
      }
      throw claimError;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id, balance').eq('id', userId).maybeSingle();

    if (profileError || !profile) {
      await supabase.from('payment_credits')
        .delete().eq('provider', 'paystack').eq('reference', reference);
      console.error('Profile not found for user:', userId);
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
        customer_email: customer.email,
      },
    });

    console.log('Balance updated:', { userId: profile.id, oldBalance, newBalance });
    return json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
