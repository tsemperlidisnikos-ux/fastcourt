-- FastCourt combined schema - run once in Supabase SQL Editor
-- Generated: 2026-07-03 02:16

-- ---------------------------------------------------------------------------
-- 001_billing_and_profiles.sql
-- ---------------------------------------------------------------------------
-- FastCourt: profiles, license keys, Stripe billing columns, RLS
-- Run in Supabase SQL editor or via supabase db push

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'coach' CHECK (role IN ('admin', 'coach', 'team_admin')),
  access_type text NOT NULL DEFAULT 'trial' CHECK (access_type IN ('trial', 'subscription', 'unlimited')),
  trial_days integer NOT NULL DEFAULT 7,
  expires_at timestamptz,
  organization text,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- License keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code text NOT NULL UNIQUE,
  duration_days integer NOT NULL DEFAULT 365 CHECK (duration_days > 0),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS license_keys_code_idx ON public.license_keys (lower(key_code));

-- ---------------------------------------------------------------------------
-- redeem_license_key RPC (used by src/lib/auth/license.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_license_key(key_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.license_keys%ROWTYPE;
  v_user_id uuid;
  v_base timestamptz;
  v_new_expires timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in required to redeem a license.');
  END IF;

  IF trim(key_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a license key.');
  END IF;

  SELECT * INTO v_key
  FROM public.license_keys
  WHERE lower(license_keys.key_code) = lower(trim(redeem_license_key.key_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid license key.');
  END IF;

  IF v_key.redeemed_by IS NOT NULL AND v_key.redeemed_by <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This key was already used.');
  END IF;

  SELECT COALESCE(expires_at, now()) INTO v_base
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_base IS NULL THEN
    v_base := now();
  END IF;

  IF v_base < now() THEN
    v_base := now();
  END IF;

  v_new_expires := v_base + (v_key.duration_days || ' days')::interval;

  UPDATE public.license_keys
  SET redeemed_by = v_user_id,
      redeemed_at = now()
  WHERE id = v_key.id
    AND (redeemed_by IS NULL OR redeemed_by = v_user_id);

  UPDATE public.profiles
  SET access_type = 'subscription',
      expires_at = v_new_expires,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_license_key(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

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

-- Profiles: users read/update own row
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Profiles: admins read/update all rows
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT
  USING (public.is_profile_admin());

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  USING (public.is_profile_admin());

-- License keys: no direct client access (RPC only)
DROP POLICY IF EXISTS license_keys_deny_all ON public.license_keys;
CREATE POLICY license_keys_deny_all ON public.license_keys
  FOR ALL
  USING (false);


-- ---------------------------------------------------------------------------
-- 002_trial_days_default_7.sql
-- ---------------------------------------------------------------------------
-- Default coach trial: 7 days (was 14)
ALTER TABLE public.profiles
  ALTER COLUMN trial_days SET DEFAULT 7;


-- ---------------------------------------------------------------------------
-- 002_user_settings.sql
-- ---------------------------------------------------------------------------
-- FastCourt: per-user settings (appearance, branding, prefs, devices)

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance jsonb,
  pdf_brand jsonb,
  practice_live jsonb,
  designer jsonb,
  notifications jsonb,
  use_org_branding boolean NOT NULL DEFAULT true,
  devices jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_settings_set_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_settings_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select_own ON public.user_settings;
CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_insert_own ON public.user_settings;
CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_settings_update_own ON public.user_settings;
CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 003_admin_purge_policies.sql
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 004_user_library.sql
-- ---------------------------------------------------------------------------
-- FastCourt: per-user library (plays snapshot for cross-device sync)

CREATE TABLE IF NOT EXISTS public.user_library (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plays jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_user_library_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_library_set_updated_at ON public.user_library;
CREATE TRIGGER user_library_set_updated_at
  BEFORE UPDATE ON public.user_library
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_library_updated_at();

ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_library_select_own ON public.user_library;
CREATE POLICY user_library_select_own ON public.user_library
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_insert_own ON public.user_library;
CREATE POLICY user_library_insert_own ON public.user_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_update_own ON public.user_library;
CREATE POLICY user_library_update_own ON public.user_library
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_library_delete_own ON public.user_library;
CREATE POLICY user_library_delete_own ON public.user_library
  FOR DELETE
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 005_user_library_organizer_meta.sql
-- ---------------------------------------------------------------------------
-- FastCourt: organizer meta (playbooks, practice, fields) for cloud library sync

ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS organizer_meta jsonb NOT NULL DEFAULT '{}'::jsonb;


-- ---------------------------------------------------------------------------
-- 006_user_library_tombstones.sql
-- ---------------------------------------------------------------------------
-- FastCourt: deletion tombstones for cross-device library sync

ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS library_tombstones jsonb NOT NULL DEFAULT '[]'::jsonb;


-- ---------------------------------------------------------------------------
-- 007_org_library_access.sql
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 008_fix_profiles_rls_recursion.sql
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 009_game_day_live.sql
-- ---------------------------------------------------------------------------
-- FastCourt: cross-device Game Day live category sync (staff share links)

CREATE TABLE IF NOT EXISTS public.game_day_live (
  plan_id text PRIMARY KEY,
  sync_token text NOT NULL,
  active_category_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_day_live_token_idx ON public.game_day_live (sync_token);

ALTER TABLE public.game_day_live ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_day_live_deny_direct ON public.game_day_live;
CREATE POLICY game_day_live_deny_direct ON public.game_day_live
  FOR ALL
  USING (false);

CREATE OR REPLACE FUNCTION public.set_game_day_live(
  p_plan_id text,
  p_sync_token text,
  p_active_category_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_token text;
  v_now timestamptz := now();
BEGIN
  IF length(trim(p_plan_id)) < 3
    OR length(trim(p_sync_token)) < 8
    OR length(trim(p_active_category_id)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  SELECT sync_token
  INTO v_existing_token
  FROM public.game_day_live
  WHERE plan_id = trim(p_plan_id);

  IF v_existing_token IS NULL THEN
    INSERT INTO public.game_day_live (plan_id, sync_token, active_category_id, updated_at)
    VALUES (trim(p_plan_id), trim(p_sync_token), trim(p_active_category_id), v_now);
  ELSIF v_existing_token = trim(p_sync_token) THEN
    UPDATE public.game_day_live
    SET active_category_id = trim(p_active_category_id),
        updated_at = v_now
    WHERE plan_id = trim(p_plan_id);
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'token_mismatch');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'activeCategoryId', trim(p_active_category_id),
    'updatedAt', v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_game_day_live(
  p_plan_id text,
  p_sync_token text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'activeCategoryId', active_category_id,
    'updatedAt', updated_at
  )
  FROM public.game_day_live
  WHERE plan_id = trim(p_plan_id)
    AND sync_token = trim(p_sync_token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.set_game_day_live(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_game_day_live(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_game_day_live(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_day_live(text, text) TO anon, authenticated;


-- ---------------------------------------------------------------------------
-- 010_team_library_owner.sql
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 011_team_library_profile_link.sql
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 012_team_library_rls.sql
-- ---------------------------------------------------------------------------
-- Team library RLS: coaches linked via team_library_owner_id may access the shared row.

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
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_org_library(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_org_library(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_org_library(uuid) TO service_role;


-- ---------------------------------------------------------------------------
-- 013_admin_link_team_library.sql
-- ---------------------------------------------------------------------------
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



