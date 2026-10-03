DROP POLICY IF EXISTS "Active coupons readable" ON public.coupons;

CREATE POLICY "Authenticated users can read tenant coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);