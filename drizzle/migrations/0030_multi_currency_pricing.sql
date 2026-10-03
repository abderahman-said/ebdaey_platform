CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('course','live_course','digital_product','subscription_plan')),
  product_id uuid NOT NULL,
  country_code text,
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP','USD','SAR','AED','QAR','GBP','EUR')),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  compare_at_price numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_prices_unique ON public.product_prices (product_type, product_id, COALESCE(country_code, '*'));
CREATE INDEX product_prices_product ON public.product_prices (product_type, product_id);
GRANT SELECT ON public.product_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product prices" ON public.product_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Mentors manage own product prices" ON public.product_prices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['orders','live_course_purchases','digital_product_purchases','subscription_purchases'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT ''EGP''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS amount_paid numeric', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS gateway text NOT NULL DEFAULT ''paymob''', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS stripe_session_id text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS settled_usd numeric', t);
  END LOOP;
END $$;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';