-- Fix infinite recursion in profiles RLS (admin policies queried profiles again).

CREATE OR REPLACE FUNCTION public.is_profile_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_admin() TO service_role;

DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT
  USING (public.is_profile_admin());

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  USING (public.is_profile_admin());

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
