ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS public_language text NOT NULL DEFAULT 'ar'
CHECK (public_language IN ('ar', 'en'));