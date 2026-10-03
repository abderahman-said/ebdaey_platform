ALTER TABLE public.tenants
  ADD COLUMN social_facebook text DEFAULT NULL,
  ADD COLUMN social_linkedin text DEFAULT NULL,
  ADD COLUMN social_youtube text DEFAULT NULL,
  ADD COLUMN social_x text DEFAULT NULL,
  ADD COLUMN social_tiktok text DEFAULT NULL,
  ADD COLUMN social_instagram text DEFAULT NULL;