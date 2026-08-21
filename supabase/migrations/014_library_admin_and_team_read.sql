-- Allow platform admins to read all libraries, and team admins to read
-- linked coaches' personal library rows (so they can merge into the shared row).

CREATE OR REPLACE FUNCTION public.can_access_org_library(library_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    library_owner_id = auth.uid()
    OR public.is_profile_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles member
      WHERE member.id = auth.uid()
        AND member.team_library_owner_id IS NOT NULL
        AND member.team_library_owner_id = library_owner_id
    )
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
    )
    OR EXISTS (
      -- Team admin reading a coach's personal library row
      SELECT 1
      FROM public.profiles admin
      INNER JOIN public.profiles coach ON coach.id = library_owner_id
      WHERE admin.id = auth.uid()
        AND admin.role = 'team_admin'
        AND (
          coach.team_library_owner_id = admin.id
          OR (
            coach.organization IS NOT NULL
            AND admin.organization IS NOT NULL
            AND lower(trim(coach.organization)) = lower(trim(admin.organization))
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_org_library(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_org_library(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_org_library(uuid) TO service_role;
