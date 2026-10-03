
-- Order Bumps table
CREATE TABLE public.order_bumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  bump_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  discount_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all order bumps" ON public.order_bumps FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can manage own order bumps" ON public.order_bumps FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public can view enabled bumps" ON public.order_bumps FOR SELECT USING (is_enabled = true);

-- Upsells table
CREATE TABLE public.upsells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  upsell_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  headline TEXT NOT NULL DEFAULT '',
  description TEXT,
  special_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all upsells" ON public.upsells FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can manage own upsells" ON public.upsells FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Public can view enabled upsells" ON public.upsells FOR SELECT USING (is_enabled = true);

-- Add order bump tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS has_order_bump BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bump_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bump_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_upsell_purchase BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upsell_shown BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
