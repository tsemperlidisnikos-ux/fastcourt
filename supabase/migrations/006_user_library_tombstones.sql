-- FastCourt: deletion tombstones for cross-device library sync

ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS library_tombstones jsonb NOT NULL DEFAULT '[]'::jsonb;
