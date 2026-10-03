CREATE TABLE public.bunny_video_owners (
  video_id text PRIMARY KEY,
  library_id text,
  user_id uuid NOT NULL,
  tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bunny_video_owners TO service_role;
ALTER TABLE public.bunny_video_owners ENABLE ROW LEVEL SECURITY;