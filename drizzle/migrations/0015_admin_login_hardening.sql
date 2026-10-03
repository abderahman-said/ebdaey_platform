-- Admin login hardening: attempt throttling, email 2FA codes, trusted devices.
-- All three tables are service-role only (edge functions); no client access.

CREATE TABLE public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_attempts_email_idx ON public.admin_login_attempts (lower(email), created_at DESC);
CREATE INDEX admin_login_attempts_ip_idx ON public.admin_login_attempts (ip, created_at DESC);
GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read login attempts"
  ON public.admin_login_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.admin_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_login_codes_user_idx ON public.admin_login_codes (user_id, created_at DESC);
GRANT ALL ON public.admin_login_codes TO service_role;
ALTER TABLE public.admin_login_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  persistent boolean NOT NULL DEFAULT false,
  user_agent text,
  ip text,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_trusted_devices_user_idx ON public.admin_trusted_devices (user_id, expires_at DESC);
GRANT ALL ON public.admin_trusted_devices TO service_role;
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read own trusted devices"
  ON public.admin_trusted_devices FOR SELECT
  USING (auth.uid() = user_id);