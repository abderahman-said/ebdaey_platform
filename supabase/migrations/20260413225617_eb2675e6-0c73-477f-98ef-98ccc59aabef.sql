ALTER TABLE public.reviews
  ADD COLUMN proof_url text,
  ADD COLUMN proof_type text DEFAULT 'image',
  ADD COLUMN verification_status text DEFAULT 'pending',
  ADD COLUMN rejection_reason text;

-- Update the public view policy to only show approved reviews
DROP POLICY IF EXISTS "Public can view published reviews" ON public.reviews;
CREATE POLICY "Public can view published reviews"
ON public.reviews
FOR SELECT
USING (is_published = true AND verification_status = 'approved');