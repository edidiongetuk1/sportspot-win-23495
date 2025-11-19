-- Drop the existing restrictive delete policy for bets
DROP POLICY IF EXISTS "Bets cannot be deleted" ON public.bets;

-- Create new policy allowing users to delete their own bets
CREATE POLICY "Users can delete their own bets"
ON public.bets
FOR DELETE
USING (user_id = auth.uid());

-- Create policy allowing users to delete their own wagers
CREATE POLICY "Users can delete their own wagers"
ON public.mobile_wagers
FOR DELETE
USING (auth.uid() = player_a_id OR auth.uid() = player_b_id);