-- FastCourt: cross-device Game Day live category sync (staff share links)

CREATE TABLE IF NOT EXISTS public.game_day_live (
  plan_id text PRIMARY KEY,
  sync_token text NOT NULL,
  active_category_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_day_live_token_idx ON public.game_day_live (sync_token);

ALTER TABLE public.game_day_live ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_day_live_deny_direct ON public.game_day_live;
CREATE POLICY game_day_live_deny_direct ON public.game_day_live
  FOR ALL
  USING (false);

CREATE OR REPLACE FUNCTION public.set_game_day_live(
  p_plan_id text,
  p_sync_token text,
  p_active_category_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_token text;
  v_now timestamptz := now();
BEGIN
  IF length(trim(p_plan_id)) < 3
    OR length(trim(p_sync_token)) < 8
    OR length(trim(p_active_category_id)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  SELECT sync_token
  INTO v_existing_token
  FROM public.game_day_live
  WHERE plan_id = trim(p_plan_id);

  IF v_existing_token IS NULL THEN
    INSERT INTO public.game_day_live (plan_id, sync_token, active_category_id, updated_at)
    VALUES (trim(p_plan_id), trim(p_sync_token), trim(p_active_category_id), v_now);
  ELSIF v_existing_token = trim(p_sync_token) THEN
    UPDATE public.game_day_live
    SET active_category_id = trim(p_active_category_id),
        updated_at = v_now
    WHERE plan_id = trim(p_plan_id);
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'token_mismatch');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'activeCategoryId', trim(p_active_category_id),
    'updatedAt', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_game_day_live(
  p_plan_id text,
  p_sync_token text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'activeCategoryId', active_category_id,
    'updatedAt', updated_at
  )
  FROM public.game_day_live
  WHERE plan_id = trim(p_plan_id)
    AND sync_token = trim(p_sync_token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.set_game_day_live(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_game_day_live(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_game_day_live(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_day_live(text, text) TO anon, authenticated;
