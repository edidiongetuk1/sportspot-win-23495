ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.bets REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;