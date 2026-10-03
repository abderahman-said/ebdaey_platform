-- Session bundle product type support
ALTER TABLE public.live_courses
  ADD COLUMN IF NOT EXISTS sessions_count integer,
  ADD COLUMN IF NOT EXISTS min_lead_hours integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS buffer_slots integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_window_days integer,
  ADD COLUMN IF NOT EXISTS booking_start_date date,
  ADD COLUMN IF NOT EXISTS booking_end_date date;

ALTER TABLE public.consultation_bookings
  ADD COLUMN IF NOT EXISTS session_index integer;

CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_purchase_session_uidx
  ON public.consultation_bookings (purchase_id, session_index)
  WHERE purchase_id IS NOT NULL AND session_index IS NOT NULL;

-- Prevent double booking of the same slot for the same product
CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_slot_uidx
  ON public.consultation_bookings (live_course_id, booking_date, booking_time)
  WHERE status <> 'cancelled';
