
-- Create transaction category enum
CREATE TYPE public.transaction_category AS ENUM ('purchase', 'subscription', 'commission', 'gateway_fee', 'withdrawal', 'refund');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category transaction_category NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own transactions
CREATE POLICY "Mentors can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast tenant lookups
CREATE INDEX idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
