
-- Add is_frozen to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid NOT NULL,
  actor_type text NOT NULL DEFAULT 'admin',
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activity logs" ON public.activity_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs" ON public.activity_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
