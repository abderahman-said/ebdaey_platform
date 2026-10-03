ALTER TABLE public.order_bumps ADD COLUMN IF NOT EXISTS bump_digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bump_digital_product_id uuid REFERENCES public.digital_products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_digital_product_id ON public.order_bumps(bump_digital_product_id);
CREATE INDEX IF NOT EXISTS idx_orders_bump_digital_product_id ON public.orders(bump_digital_product_id);