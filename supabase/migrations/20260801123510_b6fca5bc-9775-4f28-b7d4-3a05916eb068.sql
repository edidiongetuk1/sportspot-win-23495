ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS recipient_code text,
  ADD COLUMN IF NOT EXISTS transfer_code text,
  ADD COLUMN IF NOT EXISTS transfer_reference text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_transfer_reference_key
  ON public.withdrawals (transfer_reference) WHERE transfer_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payout_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  account_number text NOT NULL,
  bank_code text NOT NULL,
  bank_name text,
  recipient_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, user_id, account_number, bank_code)
);

GRANT SELECT ON public.payout_recipients TO authenticated;
GRANT ALL ON public.payout_recipients TO service_role;

ALTER TABLE public.payout_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payout recipients"
  ON public.payout_recipients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payout recipients"
  ON public.payout_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payout_recipients_updated_at
  BEFORE UPDATE ON public.payout_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();