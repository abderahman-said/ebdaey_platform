
-- Add content_type and audio_url to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own progress"
ON public.lesson_progress FOR ALL TO authenticated
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()))
WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Mentors can view tenant progress"
ON public.lesson_progress FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));
