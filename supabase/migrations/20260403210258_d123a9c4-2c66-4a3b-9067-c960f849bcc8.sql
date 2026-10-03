
-- Table to store video watch progress (last position)
CREATE TABLE public.watch_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  position_seconds NUMERIC NOT NULL DEFAULT 0,
  duration_seconds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

-- Students can manage their own watch progress
CREATE POLICY "Students can manage own watch progress"
ON public.watch_progress FOR ALL
TO authenticated
USING (student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()))
WITH CHECK (student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()));

-- Mentors can view watch progress for their tenant
CREATE POLICY "Mentors can view tenant watch progress"
ON public.watch_progress FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all watch progress"
ON public.watch_progress FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
