
GRANT SELECT ON public.tenants TO authenticated;

ALTER TABLE public.digital_product_purchases
  ADD CONSTRAINT digital_product_purchases_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.live_course_purchases
  ADD CONSTRAINT live_course_purchases_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
