-- Harden team library owner resolution so platform admins are never
-- selected as the shared library owner for a team org.

CREATE OR REPLACE FUNCTION public.sync_team_library_link(
  p_org_name text,
  p_admin_email text DEFAULT NULL,
  p_member_role text DEFAULT 'coach'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_org text := nullif(trim(p_org_name), '');
  v_admin_email text := nullif(lower(trim(coalesce(p_admin_email, ''))), '');
BEGIN
  IF v_org IS NULL THEN
    RETURN auth.uid();
  END IF;

  IF p_member_role = 'team_admin' THEN
    UPDATE public.profiles
    SET
      organization = v_org,
      role = 'team_admin',
      team_library_owner_id = auth.uid(),
      updated_at = now()
    WHERE id = auth.uid()
      AND coalesce(role, '') IS DISTINCT FROM 'admin';
    RETURN auth.uid();
  END IF;

  IF v_admin_email IS NOT NULL THEN
    SELECT id INTO v_owner_id
    FROM public.profiles
    WHERE lower(trim(email)) = v_admin_email
      AND coalesce(role, '') IS DISTINCT FROM 'admin'
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id
    FROM public.profiles
    WHERE role = 'team_admin'
      AND organization IS NOT NULL
      AND lower(trim(organization)) = lower(v_org)
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id
    FROM public.profiles
    WHERE organization IS NOT NULL
      AND lower(trim(organization)) = lower(v_org)
      AND coalesce(role, '') IS DISTINCT FROM 'admin'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    v_owner_id := auth.uid();
  END IF;

  UPDATE public.profiles
  SET
    organization = v_org,
    team_library_owner_id = v_owner_id,
    updated_at = now()
  WHERE id = auth.uid();

  IF v_owner_id <> auth.uid() THEN
    UPDATE public.profiles
    SET
      organization = v_org,
      role = 'team_admin',
      team_library_owner_id = v_owner_id,
      updated_at = now()
    WHERE id = v_owner_id
      AND coalesce(role, '') IS DISTINCT FROM 'admin';
  END IF;

  RETURN v_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_team_library_link(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_team_library_link(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_team_library_link(text, text, text) TO service_role;
