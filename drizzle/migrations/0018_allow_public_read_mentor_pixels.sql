-- Public visitors must be able to read pixel/analytics IDs so tracking scripts load.
-- The table holds no secrets (only public pixel/project IDs and boolean flags).

DROP POLICY IF EXISTS "Public can read mentor pixels" ON public.mentor_pixels;
CREATE POLICY "Public can read mentor pixels"
ON public.mentor_pixels
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT (tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected, clarity_project_id, clarity_connected)
ON public.mentor_pixels TO anon;
GRANT SELECT ON public.mentor_pixels TO authenticated;
GRANT ALL ON public.mentor_pixels TO service_role;

DROP VIEW IF EXISTS public.public_mentor_pixels;
CREATE VIEW public.public_mentor_pixels
WITH (security_invoker = on, security_barrier = on) AS
SELECT tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected,
       clarity_project_id, clarity_connected
FROM public.mentor_pixels;
GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;