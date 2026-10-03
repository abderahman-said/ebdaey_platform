
-- Live Courses table (similar to digital_products structure)
CREATE TABLE public.live_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  thumbnail_url TEXT,
  banner_video_url TEXT,
  banner_type TEXT DEFAULT 'image',
  price NUMERIC NOT NULL DEFAULT 0,
  price_before_discount NUMERIC,
  is_free BOOLEAN NOT NULL DEFAULT false,
  capacity INTEGER,
  -- Attendance / location
  attendance_type TEXT NOT NULL DEFAULT 'online', -- 'zoom' | 'online' | 'in_person'
  meeting_link TEXT,
  location_name TEXT,
  location_map_url TEXT,
  location_directions TEXT,
  -- Display
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_unlisted BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  buy_button_text TEXT,
  card_button_text TEXT,
  -- Post purchase
  send_order_confirmation_email BOOLEAN NOT NULL DEFAULT false,
  send_post_purchase_email BOOLEAN NOT NULL DEFAULT false,
  post_purchase_email_subject TEXT,
  post_purchase_email_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_live_courses_tenant ON public.live_courses(tenant_id);

ALTER TABLE public.live_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published live courses" ON public.live_courses
  FOR SELECT USING (is_published = true);
CREATE POLICY "Mentors manage own live courses" ON public.live_courses
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage all live courses" ON public.live_courses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_live_courses_updated
  BEFORE UPDATE ON public.live_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sessions / Lectures schedule
CREATE TABLE public.live_course_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_course_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcs_course ON public.live_course_sessions(live_course_id);

ALTER TABLE public.live_course_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sessions of published live courses" ON public.live_course_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.live_courses lc WHERE lc.id = live_course_sessions.live_course_id AND lc.is_published = true)
  );
CREATE POLICY "Mentors manage own live sessions" ON public.live_course_sessions
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage all live sessions" ON public.live_course_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
