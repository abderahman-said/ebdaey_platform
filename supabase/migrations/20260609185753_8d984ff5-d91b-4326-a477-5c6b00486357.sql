
-- Extend gift_courses to support multiple gift types
ALTER TABLE public.gift_courses
  ALTER COLUMN gift_course_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS gift_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS gift_digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS gift_kind text NOT NULL DEFAULT 'course';

UPDATE public.gift_courses SET gift_kind = 'course' WHERE gift_kind IS NULL OR gift_kind = '';

ALTER TABLE public.gift_courses
  ADD CONSTRAINT gift_courses_kind_check
    CHECK (gift_kind IN ('course','live_course','digital_product','consultation')),
  ADD CONSTRAINT gift_courses_one_target_check CHECK (
    (CASE WHEN gift_course_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN gift_live_course_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN gift_digital_product_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- Extend digital_product_gift_courses similarly
ALTER TABLE public.digital_product_gift_courses
  ALTER COLUMN course_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS digital_product_gift_id uuid REFERENCES public.digital_products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS gift_kind text NOT NULL DEFAULT 'course';

UPDATE public.digital_product_gift_courses SET gift_kind = 'course' WHERE gift_kind IS NULL OR gift_kind = '';

ALTER TABLE public.digital_product_gift_courses
  ADD CONSTRAINT dp_gift_kind_check
    CHECK (gift_kind IN ('course','live_course','digital_product','consultation')),
  ADD CONSTRAINT dp_gift_one_target_check CHECK (
    (CASE WHEN course_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN live_course_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN digital_product_gift_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  );
