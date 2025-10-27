
-- Migration: 20251024201630
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Create bets table
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_id TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(5, 2) NOT NULL,
  stake DECIMAL(10, 2) NOT NULL,
  potential_win DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Create policies for bets
CREATE POLICY "Users can view their own bets" 
ON public.bets 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bets" 
ON public.bets 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, balance)
  VALUES (new.id, new.email, 1000.00);
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251025103458
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  competition TEXT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  odds_team1_win NUMERIC NOT NULL,
  odds_draw NUMERIC NOT NULL,
  odds_team2_win NUMERIC NOT NULL,
  team1_score INTEGER,
  team2_score INTEGER,
  status TEXT NOT NULL DEFAULT 'upcoming',
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view matches
CREATE POLICY "Anyone can view matches"
ON public.matches
FOR SELECT
USING (true);

-- Policy: Only admins can manage matches
CREATE POLICY "Admins can manage matches"
ON public.matches
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update bets table to add result field
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS result TEXT;

-- Update trigger for matches
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to assign default user role on signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to assign default role
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();

-- Migration: 20251026115415
-- Delete the existing user data
DELETE FROM public.user_roles WHERE user_id = 'e05d0d44-59ce-4bb9-8d63-d95acf400b71';
DELETE FROM public.profiles WHERE id = 'e05d0d44-59ce-4bb9-8d63-d95acf400b71';

-- Migration: 20251027083551
-- Create casino games tables
CREATE TABLE IF NOT EXISTS public.casino_game_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type text NOT NULL,
  outcome_data jsonb NOT NULL,
  multiplier numeric,
  result text,
  seed text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.casino_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_round_id uuid REFERENCES public.casino_game_rounds(id),
  game_type text NOT NULL,
  amount numeric NOT NULL,
  multiplier numeric,
  payout numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  bet_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  settled_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.casino_game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casino_bets ENABLE ROW LEVEL SECURITY;

-- RLS policies for casino_game_rounds
CREATE POLICY "Anyone can view game rounds"
  ON public.casino_game_rounds
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert game rounds"
  ON public.casino_game_rounds
  FOR INSERT
  WITH CHECK (true);

-- RLS policies for casino_bets
CREATE POLICY "Users can view their own casino bets"
  ON public.casino_bets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own casino bets"
  ON public.casino_bets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_casino_game_rounds_created ON public.casino_game_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_casino_game_rounds_type ON public.casino_game_rounds(game_type);
CREATE INDEX IF NOT EXISTS idx_casino_bets_user ON public.casino_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_casino_bets_status ON public.casino_bets(status);
