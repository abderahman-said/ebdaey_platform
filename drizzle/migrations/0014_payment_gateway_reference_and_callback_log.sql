ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paymob_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paymob_special_reference TEXT;

ALTER TABLE public.live_course_purchases
  ADD COLUMN IF NOT EXISTS paymob_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paymob_special_reference TEXT;

ALTER TABLE public.digital_product_purchases
  ADD COLUMN IF NOT EXISTS paymob_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paymob_special_reference TEXT;

ALTER TABLE public.subscription_purchases
  ADD COLUMN IF NOT EXISTS paymob_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paymob_special_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_paymob_order_id ON public.orders (paymob_order_id);
CREATE INDEX IF NOT EXISTS idx_lc_purchases_paymob_order_id ON public.live_course_purchases (paymob_order_id);
CREATE INDEX IF NOT EXISTS idx_dp_purchases_paymob_order_id ON public.digital_product_purchases (paymob_order_id);
CREATE INDEX IF NOT EXISTS idx_sub_purchases_paymob_order_id ON public.subscription_purchases (paymob_order_id);

CREATE TABLE IF NOT EXISTS public.payment_callback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  kind TEXT,
  reference TEXT,
  paymob_order_id TEXT,
  paymob_txn_id TEXT,
  accepted BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  success BOOLEAN,
  amount_cents INTEGER,
  payload JSONB
);

GRANT SELECT ON public.payment_callback_log TO authenticated;
GRANT ALL ON public.payment_callback_log TO service_role;

ALTER TABLE public.payment_callback_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment callback log"
  ON public.payment_callback_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_payment_callback_log_created_at ON public.payment_callback_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_callback_log_reference ON public.payment_callback_log (reference);