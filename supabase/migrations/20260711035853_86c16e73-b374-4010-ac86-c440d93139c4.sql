DROP POLICY IF EXISTS "Owner can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can view own documents" ON storage.objects;

CREATE POLICY "Mentors can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mentor-documents'
  AND public.has_role(auth.uid(), 'mentor'::public.app_role)
  AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
);