-- Admin purge: allow master admin to delete other users' profiles and settings

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_row
      WHERE admin_row.id = auth.uid()
        AND admin_row.role = 'admin'
    )
  );

DROP POLICY IF EXISTS user_settings_delete_admin ON public.user_settings;
CREATE POLICY user_settings_delete_admin ON public.user_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_row
      WHERE admin_row.id = auth.uid()
        AND admin_row.role = 'admin'
    )
  );

DROP POLICY IF EXISTS user_settings_select_admin ON public.user_settings;
CREATE POLICY user_settings_select_admin ON public.user_settings
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_row
      WHERE admin_row.id = auth.uid()
        AND admin_row.role = 'admin'
    )
  );
