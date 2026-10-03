ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_country text;
ALTER TABLE public.live_course_purchases ADD COLUMN IF NOT EXISTS buyer_country text;
ALTER TABLE public.digital_product_purchases ADD COLUMN IF NOT EXISTS buyer_country text;
ALTER TABLE public.subscription_purchases ADD COLUMN IF NOT EXISTS buyer_country text;