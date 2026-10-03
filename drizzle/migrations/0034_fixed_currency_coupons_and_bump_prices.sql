CREATE TABLE public.coupon_amounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  currency text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, currency)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_amounts TO authenticated;
GRANT ALL ON public.coupon_amounts TO service_role;
ALTER TABLE public.coupon_amounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentors manage own coupon amounts" ON public.coupon_amounts FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.coupon_amounts (coupon_id, tenant_id, currency, amount)
SELECT id, tenant_id, 'EGP', discount_value FROM public.coupons WHERE discount_type <> 'percentage';

CREATE TABLE public.order_bump_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  bump_kind text NOT NULL CHECK (bump_kind IN ('course','dp')),
  bump_id uuid NOT NULL,
  country_code text,
  currency text NOT NULL DEFAULT 'EGP',
  price numeric NOT NULL DEFAULT 0,
  discount_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX order_bump_prices_uniq ON public.order_bump_prices (bump_kind, bump_id, coalesce(country_code, ''));
GRANT SELECT ON public.order_bump_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_bump_prices TO authenticated;
GRANT ALL ON public.order_bump_prices TO service_role;
ALTER TABLE public.order_bump_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bump prices" ON public.order_bump_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Mentors manage own bump prices" ON public.order_bump_prices FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.order_bump_prices (tenant_id, bump_kind, bump_id, country_code, currency, price, discount_price)
SELECT tenant_id, 'course', id, NULL, 'EGP', coalesce(price,0), discount_price FROM public.order_bumps;
INSERT INTO public.order_bump_prices (tenant_id, bump_kind, bump_id, country_code, currency, price, discount_price)
SELECT tenant_id, 'dp', id, NULL, 'EGP', coalesce(price,0), discount_price FROM public.digital_product_order_bumps;