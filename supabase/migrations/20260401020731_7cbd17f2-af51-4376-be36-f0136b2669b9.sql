
-- Create gift_courses junction table for multiple gift courses per course
CREATE TABLE public.gift_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  gift_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, gift_course_id)
);

ALTER TABLE public.gift_courses ENABLE ROW LEVEL SECURITY;

-- Mentors can manage their own gift courses
CREATE POLICY "Mentors can manage own gift courses"
ON public.gift_courses FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all gift courses"
ON public.gift_courses FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Public can view gift courses of published courses
CREATE POLICY "Public can view gift courses"
ON public.gift_courses FOR SELECT TO public
USING (EXISTS (
  SELECT 1 FROM courses c WHERE c.id = gift_courses.course_id AND c.is_published = true
));

-- Migrate existing gift_course_id data to new table
INSERT INTO public.gift_courses (course_id, gift_course_id, tenant_id)
SELECT id, gift_course_id, tenant_id 
FROM public.courses 
WHERE gift_course_enabled = true AND gift_course_id IS NOT NULL;
