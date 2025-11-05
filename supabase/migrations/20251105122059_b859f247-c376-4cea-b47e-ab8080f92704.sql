-- Fix RLS policies for mobile_wagers table
-- Replace public policy with restricted access
DROP POLICY IF EXISTS "Users can view all wagers" ON mobile_wagers;

CREATE POLICY "Users can view their wagers" ON mobile_wagers
FOR SELECT
USING (auth.uid() = player_a_id OR auth.uid() = player_b_id);

CREATE POLICY "Users can view open wagers" ON mobile_wagers  
FOR SELECT
USING (status = 'open' AND player_b_id IS NULL);

-- Fix RLS policies for casino_game_rounds table
-- Restrict to only users who have bets on the round
DROP POLICY IF EXISTS "Anyone can view game rounds" ON casino_game_rounds;

CREATE POLICY "Users can view their game rounds" ON casino_game_rounds
FOR SELECT  
USING (
  auth.uid() IN (
    SELECT user_id FROM casino_bets WHERE game_round_id = casino_game_rounds.id
  )
);

-- Add explicit denial policies for bets table
CREATE POLICY "Bets cannot be updated" ON bets
FOR UPDATE
USING (false);

CREATE POLICY "Bets cannot be deleted" ON bets  
FOR DELETE
USING (false);

-- Add CHECK constraint to prevent negative balances
ALTER TABLE profiles ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);