
-- Add live_course_id support to order_bumps, upsells, gift_courses, content_bank_folders, content_bank_items

ALTER TABLE public.order_bumps
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS bump_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL,
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.order_bumps DROP CONSTRAINT IF EXISTS order_bumps_course_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS order_bumps_course_unique ON public.order_bumps(course_id) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS order_bumps_live_course_unique ON public.order_bumps(live_course_id) WHERE live_course_id IS NOT NULL;
ALTER TABLE public.order_bumps DROP CONSTRAINT IF EXISTS order_bumps_parent_check;
ALTER TABLE public.order_bumps ADD CONSTRAINT order_bumps_parent_check CHECK (
  (course_id IS NOT NULL AND live_course_id IS NULL) OR (course_id IS NULL AND live_course_id IS NOT NULL)
);

ALTER TABLE public.upsells
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS upsell_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL,
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.upsells DROP CONSTRAINT IF EXISTS upsells_course_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS upsells_course_unique ON public.upsells(course_id) WHERE course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS upsells_live_course_unique ON public.upsells(live_course_id) WHERE live_course_id IS NOT NULL;
ALTER TABLE public.upsells DROP CONSTRAINT IF EXISTS upsells_parent_check;
ALTER TABLE public.upsells ADD CONSTRAINT upsells_parent_check CHECK (
  (course_id IS NOT NULL AND live_course_id IS NULL) OR (course_id IS NULL AND live_course_id IS NOT NULL)
);

ALTER TABLE public.gift_courses
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.gift_courses DROP CONSTRAINT IF EXISTS gift_courses_course_id_gift_course_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS gift_courses_unique_live ON public.gift_courses(live_course_id, gift_course_id) WHERE live_course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gift_courses_unique_course ON public.gift_courses(course_id, gift_course_id) WHERE course_id IS NOT NULL;
ALTER TABLE public.gift_courses DROP CONSTRAINT IF EXISTS gift_courses_parent_check;
ALTER TABLE public.gift_courses ADD CONSTRAINT gift_courses_parent_check CHECK (
  (course_id IS NOT NULL AND live_course_id IS NULL) OR (course_id IS NULL AND live_course_id IS NOT NULL)
);

ALTER TABLE public.content_bank_folders
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.content_bank_items
  ADD COLUMN IF NOT EXISTS live_course_id uuid REFERENCES public.live_courses(id) ON DELETE CASCADE,
  ALTER COLUMN course_id DROP NOT NULL;

-- Additional settings on live_courses
ALTER TABLE public.live_courses
  ADD COLUMN IF NOT EXISTS gift_course_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_lifetime_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_community boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_individual_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_link text;
