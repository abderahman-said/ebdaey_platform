-- Fix the security definer view issue
DROP VIEW IF EXISTS public.public_tenants;

CREATE VIEW public.public_tenants
WITH (security_invoker = true)
AS
SELECT 
  id, name, slug, bio, specialty,
  profile_image_url, cover_image_url,
  primary_color, whatsapp_number, whatsapp_default_color,
  show_reviews_on_profile, subscriptions_enabled,
  social_facebook, social_instagram, social_linkedin,
  social_tiktok, social_x, social_youtube,
  is_active, created_at
FROM public.tenants
WHERE is_active = true;