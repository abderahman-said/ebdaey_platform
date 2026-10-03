ALTER TABLE public.live_course_sessions
  ADD COLUMN IF NOT EXISTS zoom_generation_error text,
  ADD COLUMN IF NOT EXISTS zoom_generation_attempted_at timestamptz;