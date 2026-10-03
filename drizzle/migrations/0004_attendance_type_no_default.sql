ALTER TABLE public.live_courses
  ALTER COLUMN attendance_type DROP NOT NULL,
  ALTER COLUMN attendance_type DROP DEFAULT;