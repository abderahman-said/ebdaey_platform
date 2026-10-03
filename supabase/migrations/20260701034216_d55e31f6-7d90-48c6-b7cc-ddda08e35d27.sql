
-- =========================================================
-- Security hardening migration
-- =========================================================

-- 1) Recreate public_tenants as SECURITY INVOKER (fix SUPA_security_definer_view)
DROP VIEW IF EXISTS public.public_tenants;
CREATE VIEW public.public_tenants
WITH (security_invoker = on, security_barrier = on)
AS
SELECT id, name, slug, bio, specialty, profile_image_url, cover_image_url,
       primary_color, whatsapp_number, whatsapp_default_color, show_reviews_on_profile,
       subscriptions_enabled, social_facebook, social_instagram, social_linkedin,
       social_tiktok, social_x, social_youtube, is_active, created_at
FROM public.tenants
WHERE is_active = true;
GRANT SELECT ON public.public_tenants TO anon, authenticated;

-- 2) Tenants: remove overexposing student policy and add public/safe-column access
DROP POLICY IF EXISTS "Students can view their tenant" ON public.tenants;

DROP POLICY IF EXISTS "Public can read active tenants" ON public.tenants;
CREATE POLICY "Public can read active tenants"
ON public.tenants
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Column-level access: hide PII from client roles
REVOKE SELECT ON public.tenants FROM anon, authenticated;
GRANT SELECT (
  id, owner_id, name, slug, bio, specialty, profile_image_url, cover_image_url,
  primary_color, whatsapp_number, whatsapp_default_color, show_reviews_on_profile,
  subscriptions_enabled, social_facebook, social_instagram, social_linkedin,
  social_tiktok, social_x, social_youtube, is_active, bio_long, created_at, updated_at
) ON public.tenants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

-- Helper: owner reads own PII
CREATE OR REPLACE FUNCTION public.get_my_tenant_pii()
RETURNS TABLE(
  first_name text, last_name text, email text, phone text, country text, city text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT first_name, last_name, email, phone, country, city
  FROM public.tenants
  WHERE owner_id = auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_pii() TO authenticated;

-- Helper: admin lists all tenants (with full row)
CREATE OR REPLACE FUNCTION public.admin_list_tenants()
RETURNS SETOF public.tenants
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.tenants ORDER BY created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants() TO authenticated;

-- 3) Reviews: restrict insert to owning mentor, always start pending & unpublished
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Mentors insert own tenant reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (verification_status IS NULL OR verification_status = 'pending')
  AND (is_published IS NOT TRUE)
);

-- 4) live_course_sessions: explicit SELECT policy incl. purchasing students; hide zoom_start_url/meeting_id from client
DROP POLICY IF EXISTS "Purchasing students read live sessions" ON public.live_course_sessions;
CREATE POLICY "Purchasing students read live sessions"
ON public.live_course_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.live_course_purchases lcp
    JOIN public.students s ON s.id = lcp.student_id
    WHERE lcp.live_course_id = live_course_sessions.live_course_id
      AND s.user_id = auth.uid()
      AND lcp.payment_status = 'completed'
  )
);

REVOKE SELECT (zoom_start_url, zoom_meeting_id) ON public.live_course_sessions FROM anon, authenticated;
GRANT SELECT ON public.live_course_sessions TO service_role;

-- 5) consultation_bookings: hide zoom_start_url from client roles
REVOKE SELECT (zoom_start_url) ON public.consultation_bookings FROM anon, authenticated;
GRANT SELECT ON public.consultation_bookings TO service_role;

-- 6) lessons: restrict anon column access; preview media delivered via RPC
REVOKE SELECT ON public.lessons FROM anon;
GRANT SELECT (
  id, section_id, tenant_id, title, sort_order, created_at, content_type,
  duration_seconds, is_preview, is_published, thumbnail_url, description,
  file_name, download_filename
) ON public.lessons TO anon;

CREATE OR REPLACE FUNCTION public.get_preview_lesson(_lesson_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  content_type text,
  video_url text,
  audio_url text,
  pdf_url text,
  image_url text,
  text_content text,
  embed_code text,
  thumbnail_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.title, l.content_type, l.video_url, l.audio_url, l.pdf_url,
         l.image_url, l.text_content, l.embed_code, l.thumbnail_url
  FROM public.lessons l
  JOIN public.course_sections cs ON cs.id = l.section_id
  JOIN public.courses c ON c.id = cs.course_id
  WHERE l.id = _lesson_id
    AND l.is_preview = true
    AND c.is_published = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_preview_lesson(uuid) TO anon, authenticated;
