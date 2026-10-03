DROP POLICY IF EXISTS "Course assets publicly readable" ON storage.objects;
CREATE POLICY "Owners read own course assets" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-assets' AND (
    owner_id = (select auth.uid()::text)
    OR (storage.foldername(name))[1] = (public.get_user_tenant_id(auth.uid()))::text
    OR public.has_role(auth.uid(), 'admin')
  )
);