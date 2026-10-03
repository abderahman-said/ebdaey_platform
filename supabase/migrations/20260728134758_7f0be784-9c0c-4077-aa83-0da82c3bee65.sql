ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_key uuid;
ALTER TABLE public.live_course_purchases ADD COLUMN IF NOT EXISTS payment_key uuid;
ALTER TABLE public.digital_product_purchases ADD COLUMN IF NOT EXISTS payment_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_key_uidx ON public.orders (payment_key) WHERE payment_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS live_course_purchases_payment_key_uidx ON public.live_course_purchases (payment_key) WHERE payment_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS digital_product_purchases_payment_key_uidx ON public.digital_product_purchases (payment_key) WHERE payment_key IS NOT NULL;