-- Default coach trial: 7 days (was 14)
ALTER TABLE public.profiles
  ALTER COLUMN trial_days SET DEFAULT 7;
