DROP POLICY IF EXISTS "Public can view active tenant profiles" ON public.tenants;
CREATE POLICY "Public can view active tenant profiles"
ON public.tenants
FOR SELECT
TO public
USING (is_active = true);