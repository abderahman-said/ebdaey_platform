-- 1. TENANTS: Remove the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- Add student read policy (students need tenant info for their enrolled mentor)
CREATE POLICY "Students can view their tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid() AND s.tenant_id = tenants.id
  )
);

-- 2. MENTOR_PIXELS: Remove the public policy that exposes meta_access_token
DROP POLICY IF EXISTS "Public can read connected pixels" ON public.mentor_pixels;

-- Create a safe public view that excludes sensitive tokens
CREATE OR REPLACE VIEW public.public_mentor_pixels
WITH (security_invoker = true) AS
SELECT
  id, tenant_id,
  meta_pixel_id, meta_connected,
  tiktok_pixel_id, tiktok_connected
FROM public.mentor_pixels
WHERE meta_connected = true OR tiktok_connected = true;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;