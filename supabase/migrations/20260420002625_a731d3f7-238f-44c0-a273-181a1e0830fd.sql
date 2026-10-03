-- Order Bumps for Digital Products
CREATE TABLE public.digital_product_order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  digital_product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  -- Offer can be either a course OR another digital product
  bump_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  bump_digital_product_id UUID REFERENCES public.digital_products(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  discount_price NUMERIC,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dp_bump_one_offer CHECK (
    (bump_course_id IS NOT NULL)::int + (bump_digital_product_id IS NOT NULL)::int <= 1
  ),
  CONSTRAINT dp_bump_unique UNIQUE (digital_product_id)
);

ALTER TABLE public.digital_product_order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all dp bumps" ON public.digital_product_order_bumps
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mentors manage own dp bumps" ON public.digital_product_order_bumps
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public can view enabled dp bumps" ON public.digital_product_order_bumps
  FOR SELECT USING (is_enabled = true);

CREATE TRIGGER trg_dp_bumps_updated BEFORE UPDATE ON public.digital_product_order_bumps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Upsells: support BOTH courses and digital products as trigger AND as offer
-- Extend existing upsells table OR create a unified one. Create new dedicated table for digital products.
CREATE TABLE public.digital_product_upsells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  -- Trigger product (the one just purchased)
  digital_product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  -- Offer can be either a course OR another digital product
  upsell_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  upsell_digital_product_id UUID REFERENCES public.digital_products(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  discount_price NUMERIC,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dp_upsell_one_offer CHECK (
    (upsell_course_id IS NOT NULL)::int + (upsell_digital_product_id IS NOT NULL)::int <= 1
  ),
  CONSTRAINT dp_upsell_unique UNIQUE (digital_product_id)
);

ALTER TABLE public.digital_product_upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all dp upsells" ON public.digital_product_upsells
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mentors manage own dp upsells" ON public.digital_product_upsells
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public can view enabled dp upsells" ON public.digital_product_upsells
  FOR SELECT USING (is_enabled = true);

CREATE TRIGGER trg_dp_upsells_updated BEFORE UPDATE ON public.digital_product_upsells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track bump/upsell purchases on dp_purchases
ALTER TABLE public.digital_product_purchases
  ADD COLUMN has_order_bump BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN bump_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN bump_digital_product_id UUID REFERENCES public.digital_products(id) ON DELETE SET NULL,
  ADD COLUMN bump_amount NUMERIC DEFAULT 0,
  ADD COLUMN parent_purchase_id UUID REFERENCES public.digital_product_purchases(id) ON DELETE SET NULL,
  ADD COLUMN is_upsell_purchase BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN upsell_shown BOOLEAN NOT NULL DEFAULT false;