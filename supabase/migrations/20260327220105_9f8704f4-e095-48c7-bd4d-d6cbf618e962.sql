
-- Add subscriptions_enabled toggle to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscriptions_enabled boolean NOT NULL DEFAULT false;

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'monthly',
  price numeric NOT NULL DEFAULT 0,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plan_type)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Mentors can manage own plans" ON public.subscription_plans
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage all plans" ON public.subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
