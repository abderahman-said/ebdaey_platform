ALTER TABLE public.digital_product_order_bumps
  ADD COLUMN IF NOT EXISTS bump_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bump_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL;

ALTER TABLE public.digital_product_purchases
  ADD COLUMN IF NOT EXISTS bump_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL;

ALTER TABLE public.live_course_purchases
  ADD COLUMN IF NOT EXISTS has_order_bump boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bump_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bump_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bump_live_course_id uuid REFERENCES public.live_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bump_digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL;