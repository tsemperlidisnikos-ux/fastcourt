-- Resolve the shared team library owner for the signed-in coach (SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.resolve_team_library_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT owner.id
      FROM public.profiles member
      INNER JOIN public.profiles owner
        ON owner.role = 'team_admin'
       AND owner.organization IS NOT NULL
       AND member.organization IS NOT NULL
       AND lower(trim(member.organization)) = lower(trim(owner.organization))
      WHERE member.id = auth.uid()
        AND member.id <> owner.id
      ORDER BY owner.created_at ASC
      LIMIT 1
    ),
    auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.resolve_team_library_owner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_team_library_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_team_library_owner_id() TO service_role;
