-- Allow the signed-in team admin to link invited coach profiles to their
-- shared library owner row (so coach personal libraries become readable/mergeable).

CREATE OR REPLACE FUNCTION public.team_admin_link_member_emails(
  p_member_emails text[] DEFAULT '{}'::text[],
  p_org_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_org text;
  v_email text;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT nullif(trim(organization), '') INTO v_org
  FROM public.profiles
  WHERE id = v_admin_id;

  v_org := COALESCE(nullif(trim(p_org_name), ''), v_org);

  UPDATE public.profiles
  SET
    role = 'team_admin',
    team_library_owner_id = v_admin_id,
    organization = COALESCE(v_org, organization),
    updated_at = now()
  WHERE id = v_admin_id;

  SELECT nullif(trim(organization), '') INTO v_org
  FROM public.profiles
  WHERE id = v_admin_id;

  FOREACH v_email IN ARRAY coalesce(p_member_emails, '{}'::text[]) LOOP
    IF nullif(trim(v_email), '') IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.profiles
    SET
      organization = COALESCE(v_org, organization),
      team_library_owner_id = v_admin_id,
      updated_at = now()
    WHERE lower(trim(email)) = lower(trim(v_email))
      AND id <> v_admin_id;
  END LOOP;

  RETURN v_admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.team_admin_link_member_emails(text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_admin_link_member_emails(text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_admin_link_member_emails(text[], text) TO service_role;

-- List coach profile ids linked to the current team admin (bypasses profiles RLS).
CREATE OR REPLACE FUNCTION public.list_team_linked_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.team_library_owner_id = auth.uid()
    AND p.id <> auth.uid();
$$;

REVOKE ALL ON FUNCTION public.list_team_linked_member_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_team_linked_member_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_team_linked_member_ids() TO service_role;
