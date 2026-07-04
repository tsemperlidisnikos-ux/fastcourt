-- Service-role helper: link team admin + coach profiles to a shared library owner row.

CREATE OR REPLACE FUNCTION public.admin_link_team_library(
  p_org_name text,
  p_admin_email text,
  p_member_emails text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_email text;
  v_org text := nullif(trim(p_org_name), '');
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'admin_link_team_library requires service_role';
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'organization name is required';
  END IF;

  SELECT id
  INTO v_admin_id
  FROM public.profiles
  WHERE lower(trim(email)) = lower(trim(p_admin_email))
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'team admin profile not found for %', p_admin_email;
  END IF;

  UPDATE public.profiles
  SET
    role = 'team_admin',
    organization = v_org,
    team_library_owner_id = v_admin_id,
    updated_at = now()
  WHERE id = v_admin_id;

  FOREACH v_email IN ARRAY coalesce(p_member_emails, '{}'::text[]) LOOP
    IF nullif(trim(v_email), '') IS NULL THEN
      CONTINUE;
    END IF;
    IF lower(trim(v_email)) = lower(trim(p_admin_email)) THEN
      CONTINUE;
    END IF;

    UPDATE public.profiles
    SET
      organization = v_org,
      team_library_owner_id = v_admin_id,
      updated_at = now()
    WHERE lower(trim(email)) = lower(trim(v_email));
  END LOOP;

  RETURN v_admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_team_library(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_team_library(text, text, text[]) TO service_role;
