ALTER TABLE public.live_courses
  ADD COLUMN IF NOT EXISTS landing_header text,
  ADD COLUMN IF NOT EXISTS landing_subheader text,
  ADD COLUMN IF NOT EXISTS landing_header_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS landing_subheader_color text DEFAULT '#666666',
  ADD COLUMN IF NOT EXISTS landing_header_size text DEFAULT '3xl',
  ADD COLUMN IF NOT EXISTS landing_subheader_size text DEFAULT 'lg',
  ADD COLUMN IF NOT EXISTS landing_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;