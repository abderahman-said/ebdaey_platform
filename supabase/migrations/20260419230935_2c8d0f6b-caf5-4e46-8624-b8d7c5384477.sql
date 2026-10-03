-- Create private bucket for digital product files
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

-- Mentors can upload to their own tenant folder
CREATE POLICY "Mentors upload own digital product files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'digital-products'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Mentors can update their own tenant files
CREATE POLICY "Mentors update own digital product files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'digital-products'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Mentors can delete their own tenant files
CREATE POLICY "Mentors delete own digital product files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'digital-products'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Mentors can read their own tenant files (preview)
CREATE POLICY "Mentors read own digital product files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-products'
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Buyers (students who purchased) can read files
CREATE POLICY "Buyers read purchased digital product files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'digital-products'
  AND EXISTS (
    SELECT 1
    FROM public.digital_product_files dpf
    JOIN public.digital_product_purchases dpp ON dpp.digital_product_id = dpf.digital_product_id
    JOIN public.students s ON s.id = dpp.student_id
    WHERE dpf.file_url LIKE '%' || storage.objects.name
      AND s.user_id = auth.uid()
      AND dpp.payment_status = 'completed'
  )
);

-- Admins full access
CREATE POLICY "Admins full access digital product files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'digital-products' AND has_role(auth.uid(), 'admin'::app_role));