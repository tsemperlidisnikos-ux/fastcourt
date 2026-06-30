-- Admin purge: allow master admin to delete other users' profiles and settings

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  USING (public.is_profile_admin());

DROP POLICY IF EXISTS user_settings_delete_admin ON public.user_settings;
CREATE POLICY user_settings_delete_admin ON public.user_settings
  FOR DELETE
  USING (public.is_profile_admin());

DROP POLICY IF EXISTS user_settings_select_admin ON public.user_settings;
CREATE POLICY user_settings_select_admin ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_profile_admin());
