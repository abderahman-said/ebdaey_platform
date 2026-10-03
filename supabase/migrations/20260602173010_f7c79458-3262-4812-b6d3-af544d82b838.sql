-- Lock down coupon counter RPC to service_role only
REVOKE EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) TO service_role;

-- Restrict download counter from anonymous users (still allow authenticated)
REVOKE EXECUTE ON FUNCTION public.increment_dp_file_download(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_dp_file_download(uuid) FROM anon;

-- Fix storage policies for course-assets so mentors can only write to their own tenant folder
DROP POLICY IF EXISTS "Mentors can upload course assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update course assets" ON storage.objects;

CREATE POLICY "Mentors can upload course assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-assets'
  AND public.has_role(auth.uid(), 'mentor'::app_role)
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Mentors can update course assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-assets'
  AND public.has_role(auth.uid(), 'mentor'::app_role)
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'course-assets'
  AND public.has_role(auth.uid(), 'mentor'::app_role)
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);

-- Also restrict DELETE to own tenant folder (was missing entirely)
DROP POLICY IF EXISTS "Mentors can delete course assets" ON storage.objects;
CREATE POLICY "Mentors can delete course assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-assets'
  AND public.has_role(auth.uid(), 'mentor'::app_role)
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);