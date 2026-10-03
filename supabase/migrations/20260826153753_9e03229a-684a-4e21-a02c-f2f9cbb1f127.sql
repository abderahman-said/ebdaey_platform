-- Public availability projections for consultation booking (no tenant PII).
CREATE OR REPLACE VIEW public.public_mentor_schedule_slots
WITH (security_invoker = off, security_barrier = on) AS
SELECT s.id, s.schedule_id, s.day_of_week, s.start_time, s.end_time
FROM public.mentor_schedule_slots s
JOIN public.tenants t ON t.id = s.tenant_id
WHERE t.is_active = true;

CREATE OR REPLACE VIEW public.public_mentor_schedule_overrides
WITH (security_invoker = off, security_barrier = on) AS
SELECT o.id, o.schedule_id, o.date, o.is_available, o.start_time, o.end_time
FROM public.mentor_schedule_overrides o
JOIN public.tenants t ON t.id = o.tenant_id
WHERE t.is_active = true;

GRANT SELECT ON public.public_mentor_schedule_slots TO anon, authenticated;
GRANT SELECT ON public.public_mentor_schedule_overrides TO anon, authenticated;