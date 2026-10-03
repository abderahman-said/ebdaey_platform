
-- Google Calendar integration for mentors
CREATE TABLE public.mentor_google_calendar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  connection_api_key TEXT NOT NULL,
  scopes TEXT,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  busy_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service-role only: connection_api_key must never reach client. Frontend reads via RPCs.
GRANT ALL ON public.mentor_google_calendar_accounts TO service_role;

ALTER TABLE public.mentor_google_calendar_accounts ENABLE ROW LEVEL SECURITY;

-- No public policies — access is only via SECURITY DEFINER functions below and edge functions using service role.
CREATE POLICY "Deny all direct access" ON public.mentor_google_calendar_accounts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER update_mentor_google_calendar_accounts_updated_at
  BEFORE UPDATE ON public.mentor_google_calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track google event ids so we can update/delete when bookings change
ALTER TABLE public.consultation_bookings ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.live_course_sessions ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Safe RPC for the mentor to read connection status (no api key exposed)
CREATE OR REPLACE FUNCTION public.get_my_gcal_account()
RETURNS TABLE(google_email TEXT, calendar_id TEXT, busy_sync_enabled BOOLEAN, connected_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT google_email, calendar_id, busy_sync_enabled, connected_at
  FROM public.mentor_google_calendar_accounts
  WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  LIMIT 1;
$$;

-- Toggle busy sync
CREATE OR REPLACE FUNCTION public.set_my_gcal_busy_sync(_enabled BOOLEAN)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  _tenant_id := public.get_user_tenant_id(auth.uid());
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant';
  END IF;
  UPDATE public.mentor_google_calendar_accounts
     SET busy_sync_enabled = _enabled, updated_at = NOW()
   WHERE tenant_id = _tenant_id;
END;
$$;
