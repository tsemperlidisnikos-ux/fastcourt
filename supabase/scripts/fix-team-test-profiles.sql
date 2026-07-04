-- One-time fix for Team Test org (run in Supabase SQL Editor).
-- Alternative (after migrations 010–013):
--   npm run link-team-library -- --org "Team Test" --admin teamtest@gmail.com --coaches ntsemperlidis@promitheasbc.gr,tsemperlidis.nikos@gmail.com
-- Adjust team admin email if your Team Admin is not teamtest@gmail.com.

-- 1) Team admin
UPDATE public.profiles
SET
  role = 'team_admin',
  organization = 'Team Test',
  team_library_owner_id = id,
  updated_at = now()
WHERE lower(trim(email)) = 'teamtest@gmail.com';

-- 2) Coaches → shared library owner = team admin id
UPDATE public.profiles
SET
  organization = 'Team Test',
  team_library_owner_id = (
    SELECT id FROM public.profiles
    WHERE lower(trim(email)) = 'teamtest@gmail.com'
    LIMIT 1
  ),
  updated_at = now()
WHERE lower(trim(email)) IN (
  'ntsemperlidis@promitheasbc.gr',
  'tsemperlidis.nikos@gmail.com'
);

-- 3) Verify
SELECT email, role, organization, team_library_owner_id
FROM public.profiles
WHERE lower(trim(email)) IN (
  'teamtest@gmail.com',
  'ntsemperlidis@promitheasbc.gr',
  'tsemperlidis.nikos@gmail.com'
)
ORDER BY email;
