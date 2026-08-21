-- Allow admins to insert/update any profile (needed for upsert & Apply trial).

DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_profile_admin());

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_profile_admin())
  WITH CHECK (public.is_profile_admin());
