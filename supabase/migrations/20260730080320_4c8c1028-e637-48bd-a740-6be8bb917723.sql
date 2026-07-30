CREATE TABLE IF NOT EXISTS public.payment_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  reference text NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, reference)
);

GRANT SELECT ON public.payment_credits TO authenticated;
GRANT ALL ON public.payment_credits TO service_role;

ALTER TABLE public.payment_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment credits"
ON public.payment_credits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment credits"
ON public.payment_credits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));