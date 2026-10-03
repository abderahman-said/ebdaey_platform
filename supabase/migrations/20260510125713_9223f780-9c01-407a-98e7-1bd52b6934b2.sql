ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;