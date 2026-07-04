-- Persist team library owner on each profile + server-side linking RPC.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_library_owner_id uuid REFERENCES public.profiles (id);

CREATE INDEX IF NOT EXISTS profiles_team_library_owner_idx
  ON public.profiles (team_library_owner_id)
  WHERE team_library_owner_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lookup_profile_id_by_email(target_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE lower(trim(email)) = lower(trim(target_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_profile_id_by_email(text) TO service_role;

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
    WHERE id = auth.uid();
    RETURN auth.uid();
  END IF;

  IF v_admin_email IS NOT NULL THEN
    SELECT id INTO v_owner_id
    FROM public.profiles
    WHERE lower(trim(email)) = v_admin_email
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
    WHERE id = v_owner_id;
  END IF;

  RETURN v_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_team_library_link(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_team_library_link(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_team_library_link(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_team_library_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.team_library_owner_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.team_library_owner_id IS NOT NULL
    ),
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
