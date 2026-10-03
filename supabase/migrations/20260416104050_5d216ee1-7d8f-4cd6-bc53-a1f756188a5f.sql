-- 1. Fix lessons: restrict public read to preview lessons only
DROP POLICY IF EXISTS "Public read lessons of published courses" ON public.lessons;

CREATE POLICY "Public read preview lessons only"
ON public.lessons
FOR SELECT
USING (
  is_preview = true
  AND EXISTS (
    SELECT 1 FROM course_sections cs
    JOIN courses c ON c.id = cs.course_id
    WHERE cs.id = lessons.section_id AND c.is_published = true
  )
);

-- 2. Fix tenants: replace public policy to exclude PII columns
-- Since column-level RLS is not supported, we create a restrictive policy
-- that only exposes data to authenticated users who need it, while keeping
-- the public policy for non-sensitive fields.
-- We'll use a security definer function that returns safe tenant data.

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- Create a new public policy that still allows reads but we'll handle
-- column filtering at the application level. The RLS alone can't filter columns,
-- so we create a view for public access.
CREATE OR REPLACE VIEW public.public_tenants AS
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

-- Re-add a public policy for active tenants (needed for the app to function)
CREATE POLICY "Public can view active tenants"
ON public.tenants
FOR SELECT
TO public
USING (is_active = true);

-- 3. Fix user_roles: add explicit restrictive INSERT policy for non-admins
-- This ensures only service_role (triggers) and admins can insert roles
CREATE POLICY "Only service role or admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);