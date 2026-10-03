
CREATE POLICY "Mentors update own tenant orders" ON public.orders
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Mentors update own tenant dp purchases" ON public.digital_product_purchases
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Mentors update own tenant live purchases" ON public.live_course_purchases
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
