-- FastCourt: organizer meta (playbooks, practice, fields) for cloud library sync

ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS organizer_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
