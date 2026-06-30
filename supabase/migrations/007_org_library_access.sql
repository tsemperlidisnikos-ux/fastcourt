-- FastCourt: org coaches may read/write their team admin's shared library row

CREATE OR REPLACE FUNCTION public.can_access_org_library(library_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    library_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles member
      INNER JOIN public.profiles owner ON owner.id = library_owner_id
      WHERE member.id = auth.uid()
        AND member.id <> library_owner_id
        AND owner.role = 'team_admin'
        AND member.organization IS NOT NULL
        AND owner.organization IS NOT NULL
        AND lower(trim(member.organization)) = lower(trim(owner.organization))
    );
$$;

DROP POLICY IF EXISTS user_library_select_own ON public.user_library;
CREATE POLICY user_library_select_own ON public.user_library
  FOR SELECT
  USING (public.can_access_org_library(user_id));

DROP POLICY IF EXISTS user_library_insert_own ON public.user_library;
CREATE POLICY user_library_insert_own ON public.user_library
  FOR INSERT
  WITH CHECK (public.can_access_org_library(user_id));

DROP POLICY IF EXISTS user_library_update_own ON public.user_library;
CREATE POLICY user_library_update_own ON public.user_library
  FOR UPDATE
  USING (public.can_access_org_library(user_id))
  WITH CHECK (public.can_access_org_library(user_id));

DROP POLICY IF EXISTS user_library_delete_own ON public.user_library;
CREATE POLICY user_library_delete_own ON public.user_library
  FOR DELETE
  USING (auth.uid() = user_id);
