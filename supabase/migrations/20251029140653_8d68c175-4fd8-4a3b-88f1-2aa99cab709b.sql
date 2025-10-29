-- Add wager_code column to mobile_wagers table
ALTER TABLE public.mobile_wagers 
ADD COLUMN wager_code TEXT UNIQUE;

-- Create index for faster code lookups
CREATE INDEX idx_mobile_wagers_code ON public.mobile_wagers(wager_code);