GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_product_purchases TO authenticated;
GRANT ALL ON public.digital_product_purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_course_purchases TO authenticated;
GRANT ALL ON public.live_course_purchases TO service_role;

DROP POLICY IF EXISTS "Mentors delete own tenant orders" ON public.orders;
CREATE POLICY "Mentors delete own tenant orders"
ON public.orders
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Mentors delete own tenant dp purchases" ON public.digital_product_purchases;
CREATE POLICY "Mentors delete own tenant dp purchases"
ON public.digital_product_purchases
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Mentors delete own tenant live purchases" ON public.live_course_purchases;
CREATE POLICY "Mentors delete own tenant live purchases"
ON public.live_course_purchases
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()));