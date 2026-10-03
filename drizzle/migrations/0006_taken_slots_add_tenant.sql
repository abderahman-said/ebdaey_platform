CREATE OR REPLACE VIEW public.public_consultation_taken_slots AS
SELECT cb.live_course_id,
       cb.booking_date,
       cb.booking_time,
       cb.duration_minutes,
       cb.status,
       cb.tenant_id
FROM public.consultation_bookings cb
JOIN public.live_courses lc ON lc.id = cb.live_course_id
WHERE lc.is_published = true
  AND cb.status = ANY (ARRAY['scheduled'::text, 'confirmed'::text]);

GRANT SELECT ON public.public_consultation_taken_slots TO anon, authenticated;
GRANT ALL ON public.public_consultation_taken_slots TO service_role;