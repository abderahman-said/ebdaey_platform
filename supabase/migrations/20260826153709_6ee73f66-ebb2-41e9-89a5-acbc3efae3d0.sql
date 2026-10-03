-- 1) Stop exposing raw tenants rows (email, phone, bank/PII) to the public.
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Public can read active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Anyone can view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Public read active tenants" ON public.tenants;

-- Public-safe projection becomes a definer view (it no longer relies on a
-- permissive RLS policy on the base table).
CREATE OR REPLACE VIEW public.public_tenants
WITH (security_invoker = off, security_barrier = on) AS
SELECT
  id, name, slug, bio, specialty, profile_image_url, cover_image_url,
  primary_color, whatsapp_number, whatsapp_default_color,
  show_reviews_on_profile, subscriptions_enabled,
  social_facebook, social_instagram, social_linkedin, social_tiktok,
  social_x, social_youtube,
  is_active, created_at,
  public_language
FROM public.tenants
WHERE is_active = true;

GRANT SELECT ON public.public_tenants TO anon, authenticated;

-- Slug availability check without exposing tenant rows.
CREATE OR REPLACE FUNCTION public.is_tenant_slug_available(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE slug = _slug
      AND (owner_id IS NULL OR owner_id IS DISTINCT FROM auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_tenant_slug_available(text) TO anon, authenticated;

-- 2) Mentor scheduling tables are internal: no public/anon read access.
DROP POLICY IF EXISTS "Public can view mentor schedules" ON public.mentor_schedules;
DROP POLICY IF EXISTS "Anyone can view mentor schedules" ON public.mentor_schedules;
DROP POLICY IF EXISTS "Public can view schedules" ON public.mentor_schedules;
DROP POLICY IF EXISTS "Public can view mentor schedule slots" ON public.mentor_schedule_slots;
DROP POLICY IF EXISTS "Anyone can view mentor schedule slots" ON public.mentor_schedule_slots;
DROP POLICY IF EXISTS "Public can view slots" ON public.mentor_schedule_slots;
DROP POLICY IF EXISTS "Public can view mentor schedule overrides" ON public.mentor_schedule_overrides;
DROP POLICY IF EXISTS "Anyone can view mentor schedule overrides" ON public.mentor_schedule_overrides;
DROP POLICY IF EXISTS "Public can view overrides" ON public.mentor_schedule_overrides;

REVOKE SELECT ON public.mentor_schedules FROM anon;
REVOKE SELECT ON public.mentor_schedule_slots FROM anon;
REVOKE SELECT ON public.mentor_schedule_overrides FROM anon;