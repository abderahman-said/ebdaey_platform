
-- Add is_withdrawal_frozen to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_withdrawal_frozen boolean NOT NULL DEFAULT false;

-- Create balance_adjustments table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage balance adjustments" ON public.balance_adjustments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors can view own adjustments" ON public.balance_adjustments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Admin RLS policies for full CRUD on mentor tables during impersonation
CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all sections" ON public.course_sections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all lessons" ON public.lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all coupons" ON public.coupons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all students" ON public.students
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all enrollments" ON public.enrollments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
