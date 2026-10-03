ALTER TABLE public.mentor_pixels
  ADD COLUMN IF NOT EXISTS ga_measurement_id TEXT,
  ADD COLUMN IF NOT EXISTS ga_connected BOOLEAN NOT NULL DEFAULT false;

GRANT SELECT (tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected, clarity_project_id, clarity_connected, snap_pixel_id, snap_connected, ga_measurement_id, ga_connected)
ON public.mentor_pixels TO anon;
GRANT SELECT ON public.mentor_pixels TO authenticated;
GRANT ALL ON public.mentor_pixels TO service_role;

DROP VIEW IF EXISTS public.public_mentor_pixels;
CREATE VIEW public.public_mentor_pixels
WITH (security_invoker = on, security_barrier = on) AS
SELECT tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected,
       clarity_project_id, clarity_connected, snap_pixel_id, snap_connected,
       ga_measurement_id, ga_connected
FROM public.mentor_pixels;
GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;