-- FastCourt: per-user library (plays snapshot for cross-device sync)

CREATE TABLE IF NOT EXISTS public.user_library (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plays jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_user_library_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_library_set_updated_at ON public.user_library;
CREATE TRIGGER user_library_set_updated_at
  BEFORE UPDATE ON public.user_library
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_library_updated_at();

ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_library_select_own ON public.user_library;
CREATE POLICY user_library_select_own ON public.user_library
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_insert_own ON public.user_library;
CREATE POLICY user_library_insert_own ON public.user_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_update_own ON public.user_library;
CREATE POLICY user_library_update_own ON public.user_library
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_delete_own ON public.user_library;
CREATE POLICY user_library_delete_own ON public.user_library
  FOR DELETE
  USING (auth.uid() = user_id);
