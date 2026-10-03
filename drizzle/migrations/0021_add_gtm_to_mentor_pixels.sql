ALTER TABLE public.mentor_pixels
  ADD COLUMN IF NOT EXISTS gtm_container_id TEXT,
  ADD COLUMN IF NOT EXISTS gtm_connected BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.public_mentor_pixels AS
SELECT
  tenant_id,
  meta_pixel_id,
  meta_connected,
  tiktok_pixel_id,
  tiktok_connected,
  clarity_project_id,
  clarity_connected,
  snap_pixel_id,
  snap_connected,
  ga_measurement_id,
  ga_connected,
  gtm_container_id,
  gtm_connected
FROM public.mentor_pixels;

GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;