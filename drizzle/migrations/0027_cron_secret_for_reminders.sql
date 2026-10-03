-- lovable-cron-fallback-reviewed: existing 5-minute reminder job re-registered unchanged, only adds a secret header; reminders must go out ~1h before appointments
CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_cron_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_cron_secrets TO service_role;
ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_cron_secrets(name, secret)
VALUES ('reminders', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-consultation-reminders') THEN
    PERFORM cron.unschedule('send-consultation-reminders');
  END IF;
  PERFORM cron.schedule(
    'send-consultation-reminders',
    '*/5 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hnrcibzgoziqvtsiepws.supabase.co/functions/v1/send-consultation-reminders',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmNpYnpnb3ppcXZ0c2llcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjQ4MDgsImV4cCI6MjA4Nzk0MDgwOH0.zmf60KFFU5ik_cavmcpTGR9eAWUsA915vdzjRFKDVog',
        'x-cron-secret', (SELECT secret FROM public.internal_cron_secrets WHERE name = 'reminders')
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;