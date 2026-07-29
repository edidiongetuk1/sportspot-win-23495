CREATE OR REPLACE FUNCTION public.settle_mobile_wager(
  _wager_id uuid,
  _winner_id uuid,
  _admin_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wager public.mobile_wagers%ROWTYPE;
  v_winner_profile public.profiles%ROWTYPE;
  v_loser_id uuid;
  v_payout numeric;
  v_winner_proof_count integer;
  v_zero_zero_proof_count integer;
BEGIN
  SELECT *
  INTO v_wager
  FROM public.mobile_wagers
  WHERE id = _wager_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wager not found';
  END IF;

  IF v_wager.status IN ('completed', 'draw') THEN
    RAISE EXCEPTION 'Wager already settled';
  END IF;

  IF v_wager.player_b_id IS NULL THEN
    RAISE EXCEPTION 'Cannot settle wager before a second player joins';
  END IF;

  IF v_wager.player_a_id = v_wager.player_b_id THEN
    RAISE EXCEPTION 'Invalid wager players';
  END IF;

  IF v_wager.stake_amount IS NULL OR v_wager.stake_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid wager stake amount';
  END IF;

  IF _winner_id IS NULL OR (_winner_id <> v_wager.player_a_id AND _winner_id <> v_wager.player_b_id) THEN
    RAISE EXCEPTION 'Winner must be one of the joined players';
  END IF;

  v_loser_id := CASE
    WHEN _winner_id = v_wager.player_a_id THEN v_wager.player_b_id
    ELSE v_wager.player_a_id
  END;

  SELECT COUNT(*)
  INTO v_winner_proof_count
  FROM public.wager_proofs
  WHERE wager_id = _wager_id
    AND user_id = _winner_id
    AND status <> 'rejected';

  IF v_winner_proof_count = 0 THEN
    RAISE EXCEPTION 'Winner must have a submitted proof attachment';
  END IF;

  SELECT COUNT(*)
  INTO v_zero_zero_proof_count
  FROM public.wager_proofs
  WHERE wager_id = _wager_id
    AND user_id = _winner_id
    AND COALESCE(ai_verification_result->>'score', '') ~* '^\s*0\s*[-:]\s*0\s*$';

  IF v_zero_zero_proof_count > 0 THEN
    RAISE EXCEPTION 'Winner proof appears to show 0-0; upload a decisive result before crediting';
  END IF;

  SELECT *
  INTO v_winner_profile
  FROM public.profiles
  WHERE id = _winner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner profile not found';
  END IF;

  v_payout := v_wager.stake_amount * 2;

  UPDATE public.profiles
  SET balance = balance + v_payout,
      updated_at = now()
  WHERE id = _winner_id;

  UPDATE public.mobile_wagers
  SET winner_id = _winner_id,
      status = 'completed'
  WHERE id = _wager_id;

  UPDATE public.wager_proofs
  SET status = 'approved',
      admin_notes = NULLIF(_admin_notes, ''),
      verified_at = now()
  WHERE wager_id = _wager_id
    AND user_id = _winner_id
    AND status <> 'rejected';

  UPDATE public.wager_proofs
  SET admin_notes = COALESCE(NULLIF(_admin_notes, ''), admin_notes),
      verified_at = COALESCE(verified_at, now())
  WHERE wager_id = _wager_id
    AND user_id <> _winner_id
    AND status IN ('pending', 'ai_verified', 'ai_failed');

  INSERT INTO public.wager_transactions (wager_id, user_id, type, amount)
  VALUES
    (_wager_id, _winner_id, 'win', v_payout),
    (_wager_id, v_loser_id, 'loss', -v_wager.stake_amount);

  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    reference_type,
    metadata
  )
  VALUES (
    _winner_id,
    'wager_won',
    v_payout,
    v_winner_profile.balance,
    v_winner_profile.balance + v_payout,
    _wager_id,
    'wager',
    jsonb_build_object(
      'settled_by', _admin_id,
      'loser_id', v_loser_id,
      'game_type', v_wager.game_type,
      'stake_amount', v_wager.stake_amount
    )
  );

  RETURN jsonb_build_object(
    'wagerId', _wager_id,
    'winnerId', _winner_id,
    'loserId', v_loser_id,
    'payout', v_payout,
    'winnerBalanceAfter', v_winner_profile.balance + v_payout
  );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_mobile_wager(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_mobile_wager(uuid, uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.settle_mobile_wager(uuid, uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_mobile_wager(uuid, uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_mobile_wager_settlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.player_b_id IS NULL THEN
      RAISE EXCEPTION 'Cannot complete wager before a second player joins';
    END IF;

    IF NEW.player_a_id = NEW.player_b_id THEN
      RAISE EXCEPTION 'Invalid wager players';
    END IF;

    IF NEW.winner_id IS NULL THEN
      RAISE EXCEPTION 'Completed wager requires a winner';
    END IF;

    IF NEW.winner_id <> NEW.player_a_id AND NEW.winner_id <> NEW.player_b_id THEN
      RAISE EXCEPTION 'Winner must be one of the joined players';
    END IF;
  END IF;

  IF NEW.status = 'draw' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'draw') THEN
    RAISE EXCEPTION 'No-winner settlement is disabled; select one joined player as winner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_mobile_wager_settlement_trigger ON public.mobile_wagers;
CREATE TRIGGER validate_mobile_wager_settlement_trigger
BEFORE INSERT OR UPDATE OF status, winner_id, player_a_id, player_b_id
ON public.mobile_wagers
FOR EACH ROW
EXECUTE FUNCTION public.validate_mobile_wager_settlement();