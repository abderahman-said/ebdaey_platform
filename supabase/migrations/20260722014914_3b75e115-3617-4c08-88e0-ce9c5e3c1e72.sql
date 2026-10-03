
-- Add product title snapshot to orders so name persists after course deletion
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_title TEXT;

-- Backfill existing orders with current course titles
UPDATE public.orders o
SET product_title = c.title
FROM public.courses c
WHERE o.course_id = c.id AND o.product_title IS NULL;

-- Trigger to snapshot title on order insert
CREATE OR REPLACE FUNCTION public.snapshot_order_product_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_title IS NULL AND NEW.course_id IS NOT NULL THEN
    SELECT title INTO NEW.product_title FROM public.courses WHERE id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_order_product_title ON public.orders;
CREATE TRIGGER trg_snapshot_order_product_title
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_product_title();

-- Trigger to snapshot title on course delete into related orders
CREATE OR REPLACE FUNCTION public.snapshot_course_title_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET product_title = OLD.title
  WHERE course_id = OLD.id AND (product_title IS NULL OR product_title = '');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_course_title_on_delete ON public.courses;
CREATE TRIGGER trg_snapshot_course_title_on_delete
BEFORE DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.snapshot_course_title_on_delete();
