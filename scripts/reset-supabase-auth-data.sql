-- FastCourt: reset auth-related DATA (not schema)
-- Run in Supabase SQL Editor when rebuilding signup/login from scratch.
--
-- KEEPS: tables, RLS, functions, triggers
-- DELETES: users, profiles, library rows tied to those users

BEGIN;

-- Team orgs (only if migration 007 was applied)
DELETE FROM public.org_members;
DELETE FROM public.team_organizations;

-- Per-user app data
DELETE FROM public.user_library;
DELETE FROM public.user_settings;

-- Profiles (must be before auth.users because of FK)
DELETE FROM public.profiles;

-- Optional: test license keys only (skip if you use real keys)
-- DELETE FROM public.license_keys;

COMMIT;

-- auth.users cannot be deleted from the SQL editor with anon key.
-- After the block above, go to:
--   Supabase Dashboard → Authentication → Users → delete each user
-- Or use the service-role API / CLI if you have it.
