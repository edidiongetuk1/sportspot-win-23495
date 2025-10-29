-- Fix the RLS policy to allow users to join open wagers
DROP POLICY IF EXISTS "Users can join wagers" ON public.mobile_wagers;

CREATE POLICY "Users can join wagers" 
ON public.mobile_wagers 
FOR UPDATE 
USING (
  -- Allow if user is the creator (player_a_id)
  auth.uid() = player_a_id 
  OR 
  -- Allow if user is already player_b
  auth.uid() = player_b_id
  OR
  -- Allow joining if wager is open and player_b_id is null (they're trying to join)
  (status = 'open' AND player_b_id IS NULL AND auth.uid() != player_a_id)
);