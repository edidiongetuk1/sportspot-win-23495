-- Create mobile_wagers table
CREATE TABLE public.mobile_wagers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_b_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  stake_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  match_details JSONB
);

-- Create wager_proofs table
CREATE TABLE public.wager_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wager_id UUID NOT NULL REFERENCES public.mobile_wagers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screenshot_url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT
);

-- Create wager_transactions table
CREATE TABLE public.wager_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wager_id UUID NOT NULL REFERENCES public.mobile_wagers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wager_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wager_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mobile_wagers
CREATE POLICY "Users can view all wagers"
  ON public.mobile_wagers FOR SELECT
  USING (true);

CREATE POLICY "Users can create wagers"
  ON public.mobile_wagers FOR INSERT
  WITH CHECK (auth.uid() = player_a_id);

CREATE POLICY "Users can join wagers"
  ON public.mobile_wagers FOR UPDATE
  USING (auth.uid() = player_b_id OR auth.uid() = player_a_id);

CREATE POLICY "Admins can manage all wagers"
  ON public.mobile_wagers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for wager_proofs
CREATE POLICY "Users can view their own proofs"
  ON public.wager_proofs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit their proofs"
  ON public.wager_proofs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all proofs"
  ON public.wager_proofs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update proofs"
  ON public.wager_proofs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for wager_transactions
CREATE POLICY "Users can view their transactions"
  ON public.wager_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.wager_transactions FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for wager screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wager-proofs', 'wager-proofs', false);

-- Storage policies
CREATE POLICY "Users can upload their wager proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wager-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wager-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all wager proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wager-proofs' AND has_role(auth.uid(), 'admin'::app_role));