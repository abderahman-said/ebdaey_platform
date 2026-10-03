ALTER TABLE public.live_course_purchases 
  ADD COLUMN IF NOT EXISTS booking_date date,
  ADD COLUMN IF NOT EXISTS booking_time time;