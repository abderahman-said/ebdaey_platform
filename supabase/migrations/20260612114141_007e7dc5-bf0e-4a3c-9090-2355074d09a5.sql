
DROP POLICY IF EXISTS "Public can view active tenant profiles" ON public.tenants;

DROP POLICY IF EXISTS "Public can view taken slots" ON public.consultation_bookings;
CREATE OR REPLACE VIEW public.public_consultation_taken_slots
WITH (security_invoker = on) AS
SELECT cb.live_course_id, cb.booking_date, cb.booking_time, cb.duration_minutes, cb.status
FROM public.consultation_bookings cb
JOIN public.live_courses lc ON lc.id = cb.live_course_id
WHERE lc.is_published = true AND cb.status IN ('scheduled','confirmed');
GRANT SELECT ON public.public_consultation_taken_slots TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view sessions of published live courses" ON public.live_course_sessions;
CREATE OR REPLACE VIEW public.public_live_course_sessions
WITH (security_invoker = on) AS
SELECT s.id, s.live_course_id, s.tenant_id, s.title, s.session_date, s.session_time,
       s.duration_minutes, s.sort_order, s.created_at, s.zoom_join_url
FROM public.live_course_sessions s
JOIN public.live_courses lc ON lc.id = s.live_course_id
WHERE lc.is_published = true;
GRANT SELECT ON public.public_live_course_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view certificate templates" ON public.certificate_templates;
CREATE POLICY "Owner mentor or enrolled student can view certificate template"
ON public.certificate_templates FOR SELECT TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE s.user_id = auth.uid() AND e.tenant_id = certificate_templates.tenant_id
  )
);

DROP POLICY IF EXISTS "Authenticated users can read tenant coupons" ON public.coupons;

DROP POLICY IF EXISTS "Mentors can upload documents" ON storage.objects;
CREATE POLICY "Mentors can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mentor-documents'
  AND public.has_role(auth.uid(), 'mentor')
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);
CREATE POLICY "Mentors can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'mentor-documents'
  AND public.has_role(auth.uid(), 'mentor')
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
)
WITH CHECK (
  bucket_id = 'mentor-documents'
  AND public.has_role(auth.uid(), 'mentor')
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);
CREATE POLICY "Mentors can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mentor-documents'
  AND public.has_role(auth.uid(), 'mentor')
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
);

ALTER TABLE public.mentor_pixels DROP COLUMN IF EXISTS meta_access_token;
DROP VIEW IF EXISTS public.public_mentor_pixels;
CREATE VIEW public.public_mentor_pixels
WITH (security_invoker = on) AS
SELECT tenant_id, meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected
FROM public.mentor_pixels;
GRANT SELECT ON public.public_mentor_pixels TO anon, authenticated;

REVOKE SELECT (access_token, refresh_token) ON public.mentor_zoom_accounts FROM anon, authenticated;

CREATE OR REPLACE VIEW public.mentor_zoom_account_status
WITH (security_invoker = on) AS
SELECT tenant_id, zoom_user_id, zoom_email, zoom_account_name, token_expires_at, scopes, connected_at, updated_at
FROM public.mentor_zoom_accounts;
GRANT SELECT ON public.mentor_zoom_account_status TO authenticated;
