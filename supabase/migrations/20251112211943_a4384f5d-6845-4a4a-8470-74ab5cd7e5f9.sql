-- Create deposit_receipts table for manual bank transfer deposits
CREATE TABLE public.deposit_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  receipt_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_verified', 'ai_failed', 'approved', 'rejected')),
  ai_verification_result JSONB,
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.deposit_receipts ENABLE ROW LEVEL SECURITY;

-- Users can submit their own deposit receipts
CREATE POLICY "Users can submit deposit receipts"
  ON public.deposit_receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own deposit receipts
CREATE POLICY "Users can view their own receipts"
  ON public.deposit_receipts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all deposit receipts
CREATE POLICY "Admins can view all receipts"
  ON public.deposit_receipts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update deposit receipts
CREATE POLICY "Admins can update receipts"
  ON public.deposit_receipts
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for deposit receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-receipts', 'deposit-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deposit receipts
CREATE POLICY "Users can upload their deposit receipts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'deposit-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their deposit receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'deposit-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all deposit receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'deposit-receipts' AND
    has_role(auth.uid(), 'admin'::app_role)
  );