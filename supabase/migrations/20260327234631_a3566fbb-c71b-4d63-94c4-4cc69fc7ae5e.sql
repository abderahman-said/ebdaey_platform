CREATE POLICY "Authenticated users can insert reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (true);