-- Platform-wide layout settings (library frames grid, table columns, designer layout).
-- Readable by all signed-in users; writable by admins only.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, layout)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_select_authenticated ON public.platform_settings;
CREATE POLICY platform_settings_select_authenticated ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS platform_settings_upsert_admin ON public.platform_settings;
CREATE POLICY platform_settings_insert_admin ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_profile_admin());

DROP POLICY IF EXISTS platform_settings_update_admin ON public.platform_settings;
CREATE POLICY platform_settings_update_admin ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
