
ALTER TABLE public.mentor_pixels
  ADD COLUMN IF NOT EXISTS clarity_project_id TEXT,
  ADD COLUMN IF NOT EXISTS clarity_connected BOOLEAN NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.public_mentor_pixels;
CREATE VIEW public.public_mentor_pixels
WITH (security_invoker = on) AS
SELECT tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected,
       clarity_project_id, clarity_connected
FROM public.mentor_pixels;
GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;
