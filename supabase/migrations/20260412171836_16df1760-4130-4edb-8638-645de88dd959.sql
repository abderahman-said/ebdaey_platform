-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Students can create refund requests for their own orders
CREATE POLICY "Students can create own refund requests"
ON public.refund_requests
FOR INSERT
WITH CHECK (student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()));

-- Students can view their own refund requests
CREATE POLICY "Students can view own refund requests"
ON public.refund_requests
FOR SELECT
USING (student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()));

-- Mentors can view refund requests for their tenant
CREATE POLICY "Mentors can view tenant refund requests"
ON public.refund_requests
FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Admins can manage all refund requests
CREATE POLICY "Admins can manage all refund requests"
ON public.refund_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();