
CREATE TABLE public.subscription_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  gateway_reference TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_purchases_student ON public.subscription_purchases(student_id);
CREATE INDEX idx_subscription_purchases_tenant ON public.subscription_purchases(tenant_id);
CREATE INDEX idx_subscription_purchases_status ON public.subscription_purchases(payment_status);

GRANT SELECT ON public.subscription_purchases TO authenticated;
GRANT ALL ON public.subscription_purchases TO service_role;

ALTER TABLE public.subscription_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own subscriptions"
ON public.subscription_purchases
FOR SELECT
TO authenticated
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Mentors can view their tenant subscriptions"
ON public.subscription_purchases
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
);

CREATE POLICY "Admins can manage all subscriptions"
ON public.subscription_purchases
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subscription_purchases_updated_at
BEFORE UPDATE ON public.subscription_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
