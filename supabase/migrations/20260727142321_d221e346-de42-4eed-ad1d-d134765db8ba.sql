DROP TABLE IF EXISTS public.upsells CASCADE;
DROP TABLE IF EXISTS public.digital_product_upsells CASCADE;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS is_upsell_purchase,
  DROP COLUMN IF EXISTS upsell_shown,
  DROP COLUMN IF EXISTS parent_order_id;

ALTER TABLE public.digital_product_purchases
  DROP COLUMN IF EXISTS is_upsell_purchase,
  DROP COLUMN IF EXISTS upsell_shown,
  DROP COLUMN IF EXISTS parent_purchase_id;