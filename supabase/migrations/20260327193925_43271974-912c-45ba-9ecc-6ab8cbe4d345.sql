
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 5,
  comment text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own reviews" ON public.reviews
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view published reviews" ON public.reviews
  FOR SELECT USING (is_published = true);
