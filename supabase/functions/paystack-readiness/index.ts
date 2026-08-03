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

type Check = {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail' | 'unknown';
  detail: string;
  fix?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ---- Admin only ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) return json({ error: 'Invalid authentication' }, 401);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) return json({ error: 'Unauthorized - Admin access required' }, 403);

    const checks: Check[] = [];
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');

    // 1. Secret key present + valid + mode
    if (!secret) {
      checks.push({
        id: 'secret_key',
        label: 'Paystack secret key',
        status: 'fail',
        detail: 'PAYSTACK_SECRET_KEY is not configured.',
        fix: 'Add your Paystack secret key (Settings → API Keys & Webhooks) as a backend secret.',
      });
      return json({ ready: false, checks, pendingPayoutTotal: 0 });
    }

    const live = secret.startsWith('sk_live_');
    checks.push({
      id: 'secret_key',
      label: 'Paystack secret key',
      status: 'ok',
      detail: live ? 'Live secret key configured.' : 'Test-mode secret key configured.',
      fix: live ? undefined : 'Test keys cannot move real money — swap in your live secret key to pay users.',
    });

    const psFetch = (path: string, init?: RequestInit) =>
      fetch(`https://api.paystack.co${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });

    // 2. Balance
    let availableBalance = 0;
    let currency = 'NGN';
    try {
      const res = await psFetch('/balance');
      const body = await res.json();
      if (res.status === 401) {
        checks.push({
          id: 'balance',
          label: 'Paystack balance',
          status: 'fail',
          detail: 'Paystack rejected the secret key (401).',
          fix: 'The stored key is invalid or revoked. Generate a new secret key in Paystack and update it here.',
        });
      } else if (!res.ok || !body.status) {
        checks.push({
          id: 'balance',
          label: 'Paystack balance',
          status: 'warn',
          detail: body.message ?? 'Could not read balance.',
        });
      } else {
        const entry = (body.data as any[])?.[0];
        availableBalance = Number(entry?.balance ?? 0) / 100;
        currency = entry?.currency ?? 'NGN';
        checks.push({
          id: 'balance',
          label: 'Paystack balance',
          status: availableBalance > 0 ? 'ok' : 'warn',
          detail: `${currency} ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} available.`,
          fix:
            availableBalance > 0
              ? undefined
              : 'Payouts draw from your Paystack balance. Wait for settlement of collected payments or fund your balance directly.',
        });
      }
    } catch (e) {
      checks.push({
        id: 'balance',
        label: 'Paystack balance',
        status: 'unknown',
        detail: e instanceof Error ? e.message : 'Balance lookup failed.',
      });
    }

    // 3. Transfers enabled (listing transfers requires the transfers product to be active)
    try {
      const res = await psFetch('/transfer?perPage=1');
      const body = await res.json();
      if (res.ok && body.status) {
        checks.push({
          id: 'transfers',
          label: 'Transfers (payouts) enabled',
          status: 'ok',
          detail: 'Your account can call the Transfer API.',
        });
      } else if (res.status === 403 || /not.*(enabled|activated|allowed)|permission/i.test(body.message ?? '')) {
        checks.push({
          id: 'transfers',
          label: 'Transfers (payouts) enabled',
          status: 'fail',
          detail: body.message ?? 'Transfers are not enabled on this account.',
          fix: 'In Paystack, complete business verification and add a settlement account, then request Transfers access (Settings → Preferences / contact support).',
        });
      } else {
        checks.push({
          id: 'transfers',
          label: 'Transfers (payouts) enabled',
          status: 'warn',
          detail: body.message ?? `Unexpected response (${res.status}).`,
        });
      }
    } catch (e) {
      checks.push({
        id: 'transfers',
        label: 'Transfers (payouts) enabled',
        status: 'unknown',
        detail: e instanceof Error ? e.message : 'Transfer check failed.',
      });
    }

    // 4. OTP requirement — inferred from recent transfers stuck in "otp"
    try {
      const res = await psFetch('/transfer?perPage=20');
      const body = await res.json();
      const rows: any[] = res.ok && body.status ? body.data ?? [] : [];
      const otpStuck = rows.filter((t) => t.status === 'otp');
      if (rows.length === 0) {
        checks.push({
          id: 'otp',
          label: 'Transfers OTP',
          status: 'unknown',
          detail: 'No transfers yet, so OTP behaviour cannot be confirmed.',
          fix: 'Paystack cannot report this setting via API. Check Settings → Preferences → Transfers OTP and turn it off so approvals complete automatically.',
        });
      } else if (otpStuck.length > 0) {
        checks.push({
          id: 'otp',
          label: 'Transfers OTP',
          status: 'fail',
          detail: `${otpStuck.length} transfer(s) are waiting for an OTP.`,
          fix: 'Disable "Transfers OTP" in Paystack Settings → Preferences, then re-approve. Otherwise every payout stalls awaiting a code.',
        });
      } else {
        checks.push({
          id: 'otp',
          label: 'Transfers OTP',
          status: 'ok',
          detail: 'Recent transfers completed without waiting for an OTP.',
        });
      }
    } catch (e) {
      checks.push({
        id: 'otp',
        label: 'Transfers OTP',
        status: 'unknown',
        detail: e instanceof Error ? e.message : 'OTP check failed.',
      });
    }

    // 5. Webhook events — verified from our own processed history
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/paystack-webhook`;
    const { count: finalisedCount } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .in('status', ['approved', 'failed']);

    const { data: stuck } = await supabase
      .from('withdrawals')
      .select('id, updated_at')
      .eq('status', 'processing')
      .lt('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if ((finalisedCount ?? 0) > 0 && (stuck?.length ?? 0) === 0) {
      checks.push({
        id: 'webhook',
        label: 'Transfer webhook events',
        status: 'ok',
        detail: 'Payout events have been received and applied.',
      });
    } else if ((stuck?.length ?? 0) > 0) {
      checks.push({
        id: 'webhook',
        label: 'Transfer webhook events',
        status: 'fail',
        detail: `${stuck!.length} payout(s) stuck in "processing" for over an hour — webhook events are likely not arriving.`,
        fix: `Point transfer.success, transfer.failed and transfer.reversed at ${webhookUrl} in Paystack Settings → API Keys & Webhooks.`,
      });
    } else {
      checks.push({
        id: 'webhook',
        label: 'Transfer webhook events',
        status: 'unknown',
        detail: 'No completed payouts yet to confirm webhook delivery.',
        fix: `Make sure transfer.success, transfer.failed and transfer.reversed are sent to ${webhookUrl}.`,
      });
    }

    // 6. Pending payout demand vs balance
    const { data: pendingRows } = await supabase
      .from('withdrawals')
      .select('amount')
      .in('status', ['pending', 'processing']);
    const pendingPayoutTotal = (pendingRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

    checks.push({
      id: 'coverage',
      label: 'Balance covers pending requests',
      status:
        pendingPayoutTotal === 0 ? 'ok' : availableBalance >= pendingPayoutTotal ? 'ok' : 'warn',
      detail: `Pending payouts: ${currency} ${pendingPayoutTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      fix:
        pendingPayoutTotal > availableBalance
          ? 'Your Paystack balance is below the total pending payouts — approvals will fail until it is topped up.'
          : undefined,
    });

    const ready = !checks.some((c) => c.status === 'fail');
    return json({ ready, checks, availableBalance, currency, pendingPayoutTotal, webhookUrl });
  } catch (error) {
    console.error('paystack-readiness error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
