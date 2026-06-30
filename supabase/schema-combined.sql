-- FastCourt combined schema - run once in Supabase SQL Editor
-- Generated: 2026-07-01 00:49

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
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_row
      WHERE admin_row.id = auth.uid()
        AND admin_row.role = 'admin'
    )
  );

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_row
      WHERE admin_row.id = auth.uid()
        AND admin_row.role = 'admin'
    )
  );

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



