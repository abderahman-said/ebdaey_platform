CREATE TABLE public.international_withdrawal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  address text NOT NULL,
  account_type text NOT NULL DEFAULT 'personal',
  beneficiary_name text NOT NULL,
  country_code text NOT NULL,
  bank_name text NOT NULL,
  iban text NOT NULL,
  swift_code text NOT NULL,
  id_document_type text NOT NULL DEFAULT 'national_id' CHECK (id_document_type IN ('national_id','passport')),
  id_front_url text,
  id_back_url text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_withdrawal_settings TO authenticated;
GRANT ALL ON public.international_withdrawal_settings TO service_role;
ALTER TABLE public.international_withdrawal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor manages own intl withdrawal settings" ON public.international_withdrawal_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND status <> 'approved')
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND status = 'pending');
CREATE POLICY "Mentor views own intl withdrawal settings" ON public.international_withdrawal_settings
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins view intl withdrawal settings" ON public.international_withdrawal_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update intl withdrawal settings" ON public.international_withdrawal_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));