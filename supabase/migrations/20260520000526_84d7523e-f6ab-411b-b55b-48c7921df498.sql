
CREATE TABLE public.mentor_zoom_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  zoom_user_id TEXT NOT NULL,
  zoom_email TEXT NOT NULL,
  zoom_account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_zoom_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage own zoom account"
ON public.mentor_zoom_accounts FOR ALL
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins manage all zoom accounts"
ON public.mentor_zoom_accounts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mentor_zoom_accounts_updated_at
BEFORE UPDATE ON public.mentor_zoom_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.live_course_sessions ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE public.live_course_sessions ADD COLUMN IF NOT EXISTS zoom_join_url TEXT;
ALTER TABLE public.live_course_sessions ADD COLUMN IF NOT EXISTS zoom_start_url TEXT;

ALTER TABLE public.consultation_bookings ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE public.consultation_bookings ADD COLUMN IF NOT EXISTS zoom_start_url TEXT;
