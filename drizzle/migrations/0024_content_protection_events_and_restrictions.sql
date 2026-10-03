-- Screen-recording / capture attempt log
CREATE TABLE public.content_protection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid,
  lesson_id uuid,
  event_type text NOT NULL,
  session_fingerprint text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cpe_student ON public.content_protection_events (student_id, created_at DESC);
CREATE INDEX idx_cpe_tenant ON public.content_protection_events (tenant_id, created_at DESC);

GRANT SELECT, INSERT ON public.content_protection_events TO authenticated;
GRANT ALL ON public.content_protection_events TO service_role;

ALTER TABLE public.content_protection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students log their own capture attempts"
ON public.content_protection_events FOR INSERT TO authenticated
WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all capture attempts"
ON public.content_protection_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete capture attempts"
ON public.content_protection_events FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin sanctions on flagged students
CREATE TABLE public.student_content_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  course_id uuid,
  scope text NOT NULL DEFAULT 'course',
  reason text,
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  CONSTRAINT student_content_restrictions_scope_check CHECK (scope IN ('course', 'account'))
);

CREATE INDEX idx_scr_student ON public.student_content_restrictions (student_id) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_content_restrictions TO authenticated;
GRANT ALL ON public.student_content_restrictions TO service_role;

ALTER TABLE public.student_content_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage restrictions"
ON public.student_content_restrictions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read their own restrictions"
ON public.student_content_restrictions FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Mentors read their tenant restrictions"
ON public.student_content_restrictions FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Global watermark switch
INSERT INTO public.platform_feature_flags (key, enabled)
VALUES ('content_watermark_enabled', true)
ON CONFLICT (key) DO NOTHING;