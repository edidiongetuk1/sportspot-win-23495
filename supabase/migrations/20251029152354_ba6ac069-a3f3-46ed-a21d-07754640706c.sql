-- Enable realtime for mobile_wagers table
ALTER TABLE public.mobile_wagers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_wagers;

-- Enable realtime for wager_proofs table
ALTER TABLE public.wager_proofs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wager_proofs;