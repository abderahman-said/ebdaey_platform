
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS product_id uuid;

-- Backfill existing course-linked reviews
UPDATE public.reviews
SET product_type = 'course', product_id = course_id
WHERE course_id IS NOT NULL AND product_type IS NULL;

CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_type, product_id);
