-- 1. mentor_schedules
CREATE TABLE public.mentor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Default Schedule',
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view schedules" ON public.mentor_schedules FOR SELECT USING (true);
CREATE POLICY "Mentors manage own schedules" ON public.mentor_schedules FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage all schedules" ON public.mentor_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mentor_schedules_updated_at
  BEFORE UPDATE ON public.mentor_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. mentor_schedule_slots (weekly recurring availability)
CREATE TABLE public.mentor_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.mentor_schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun..6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view slots" ON public.mentor_schedule_slots FOR SELECT USING (true);
CREATE POLICY "Mentors manage own slots" ON public.mentor_schedule_slots FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage all slots" ON public.mentor_schedule_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_schedule_slots_schedule ON public.mentor_schedule_slots(schedule_id);

-- 3. mentor_schedule_overrides (date-specific override)
CREATE TABLE public.mentor_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.mentor_schedules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_schedule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view overrides" ON public.mentor_schedule_overrides FOR SELECT USING (true);
CREATE POLICY "Mentors manage own overrides" ON public.mentor_schedule_overrides FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage all overrides" ON public.mentor_schedule_overrides FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_schedule_overrides_schedule_date ON public.mentor_schedule_overrides(schedule_id, date);

-- 4. live_courses extensions
ALTER TABLE public.live_courses
  ADD COLUMN product_type TEXT NOT NULL DEFAULT 'live_course' CHECK (product_type IN ('live_course','consultation')),
  ADD COLUMN session_duration_minutes INTEGER,
  ADD COLUMN schedule_id UUID REFERENCES public.mentor_schedules(id) ON DELETE SET NULL;

-- 5. consultation_bookings
CREATE TABLE public.consultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  live_course_id UUID NOT NULL REFERENCES public.live_courses(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.live_course_purchases(id) ON DELETE SET NULL,
  student_id UUID,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  meeting_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors view tenant bookings" ON public.consultation_bookings FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Mentors manage own bookings" ON public.consultation_bookings FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Students view own bookings" ON public.consultation_bookings FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage all bookings" ON public.consultation_bookings FOR ALL
  USING (has_role(auth.uid(), 'admin'));
-- Public can read taken slots (without PII) so the booking widget can hide them.
CREATE POLICY "Public can view taken slots" ON public.consultation_bookings FOR SELECT USING (true);

CREATE INDEX idx_bookings_course_date ON public.consultation_bookings(live_course_id, booking_date);

CREATE TRIGGER update_consultation_bookings_updated_at
  BEFORE UPDATE ON public.consultation_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();