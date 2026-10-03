
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS gift_course_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_course_id uuid REFERENCES public.courses(id) DEFAULT NULL;
