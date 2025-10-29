-- Add columns for AI verification
ALTER TABLE public.wager_proofs
ADD COLUMN game_name TEXT,
ADD COLUMN ai_verification_result JSONB,
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries
CREATE INDEX idx_wager_proofs_status ON public.wager_proofs(status);

-- Update the check constraint to include new statuses
ALTER TABLE public.wager_proofs 
DROP CONSTRAINT IF EXISTS wager_proofs_status_check;

ALTER TABLE public.wager_proofs
ADD CONSTRAINT wager_proofs_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'ai_verified', 'ai_failed'));