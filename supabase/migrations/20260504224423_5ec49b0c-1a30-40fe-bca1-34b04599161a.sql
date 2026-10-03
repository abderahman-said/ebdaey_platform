
CREATE TABLE public.live_course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_course_id UUID NOT NULL REFERENCES public.live_courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  gateway_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  mentor_net NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  kashier_order_id TEXT,
  coupon_id UUID REFERENCES public.coupons(id),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lcp_student ON public.live_course_purchases(student_id);
CREATE INDEX idx_lcp_live_course ON public.live_course_purchases(live_course_id);
CREATE INDEX idx_lcp_tenant ON public.live_course_purchases(tenant_id);

ALTER TABLE public.live_course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own live purchases"
ON public.live_course_purchases FOR SELECT TO authenticated
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Mentors view tenant live purchases"
ON public.live_course_purchases FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins manage all live purchases"
ON public.live_course_purchases FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_lcp_updated
BEFORE UPDATE ON public.live_course_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
