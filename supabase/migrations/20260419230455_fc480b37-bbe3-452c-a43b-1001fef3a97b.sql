-- Digital Products main table
CREATE TABLE public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  thumbnail_url text,
  price numeric NOT NULL DEFAULT 0,
  price_before_discount numeric,
  is_published boolean NOT NULL DEFAULT false,
  is_unlisted boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,

  -- Banner
  banner_type text DEFAULT 'image',
  banner_video_url text,

  -- Landing customization
  landing_header text,
  landing_subheader text,
  landing_header_color text DEFAULT '#000000',
  landing_subheader_color text DEFAULT '#666666',
  landing_header_size text DEFAULT '3xl',
  landing_subheader_size text DEFAULT 'lg',
  landing_features jsonb DEFAULT '[]'::jsonb,
  landing_dark_mode boolean DEFAULT false,
  adjectives text,
  target_audience text,

  -- Buttons
  buy_button_text text,
  card_button_text text,

  -- Announcement
  announcement_text text,
  announcement_type text DEFAULT 'fixed',

  -- FAQs
  faqs jsonb DEFAULT '[]'::jsonb,

  -- Guarantee
  guarantee_enabled boolean NOT NULL DEFAULT false,
  guarantee_days integer NOT NULL DEFAULT 7,
  guarantee_title text,
  guarantee_description text,

  -- Extra features
  has_certificate boolean NOT NULL DEFAULT false,
  has_individual_support boolean NOT NULL DEFAULT false,
  has_lifetime_updates boolean NOT NULL DEFAULT false,
  has_community boolean NOT NULL DEFAULT false,
  community_link text,

  -- Gift courses toggle
  gift_courses_enabled boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_digital_products_tenant ON public.digital_products(tenant_id);
CREATE INDEX idx_digital_products_published ON public.digital_products(is_published) WHERE is_published = true;

-- Files attached to a digital product
CREATE TABLE public.digital_product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  file_type text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dp_files_product ON public.digital_product_files(digital_product_id);

-- Gift courses linked to a digital product
CREATE TABLE public.digital_product_gift_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(digital_product_id, course_id)
);

CREATE INDEX idx_dp_gifts_product ON public.digital_product_gift_courses(digital_product_id);

-- Purchases of digital products
CREATE TABLE public.digital_product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  digital_product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  order_id uuid,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  gateway_fee numeric NOT NULL DEFAULT 0,
  mentor_net numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  kashier_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dp_purchases_student ON public.digital_product_purchases(student_id);
CREATE INDEX idx_dp_purchases_tenant ON public.digital_product_purchases(tenant_id);
CREATE INDEX idx_dp_purchases_product ON public.digital_product_purchases(digital_product_id);

-- Enable RLS
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_gift_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;

-- ============= digital_products policies =============
CREATE POLICY "Admins manage all digital products"
ON public.digital_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors manage own digital products"
ON public.digital_products FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view published digital products"
ON public.digital_products FOR SELECT
USING (is_published = true);

-- ============= digital_product_files policies =============
CREATE POLICY "Admins manage all dp files"
ON public.digital_product_files FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors manage own dp files"
ON public.digital_product_files FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Buyers can view dp files"
ON public.digital_product_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.digital_product_purchases p
    JOIN public.students s ON s.id = p.student_id
    WHERE p.digital_product_id = digital_product_files.digital_product_id
      AND s.user_id = auth.uid()
      AND p.payment_status = 'completed'
  )
);

-- ============= digital_product_gift_courses policies =============
CREATE POLICY "Admins manage all dp gift courses"
ON public.digital_product_gift_courses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors manage own dp gift courses"
ON public.digital_product_gift_courses FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public can view dp gift courses"
ON public.digital_product_gift_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.digital_products dp
    WHERE dp.id = digital_product_gift_courses.digital_product_id
      AND dp.is_published = true
  )
);

-- ============= digital_product_purchases policies =============
CREATE POLICY "Admins manage all dp purchases"
ON public.digital_product_purchases FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors view own tenant dp purchases"
ON public.digital_product_purchases FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Students view own dp purchases"
ON public.digital_product_purchases FOR SELECT
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

-- updated_at trigger
CREATE TRIGGER update_digital_products_updated_at
BEFORE UPDATE ON public.digital_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();