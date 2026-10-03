ALTER TABLE public.live_courses
  DROP CONSTRAINT live_courses_product_type_check;

ALTER TABLE public.live_courses
  ADD CONSTRAINT live_courses_product_type_check
  CHECK (product_type = ANY (ARRAY['live_course'::text, 'consultation'::text, 'session_bundle'::text]));