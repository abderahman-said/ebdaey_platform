
CREATE OR REPLACE FUNCTION public.find_upcoming_consultation_reminders(_win_start timestamptz, _win_end timestamptz)
RETURNS TABLE (
  id uuid, tenant_id uuid, live_course_id uuid, student_id uuid,
  booking_date date, booking_time time, duration_minutes int,
  meeting_link text, zoom_start_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cb.id, cb.tenant_id, cb.live_course_id, cb.student_id,
         cb.booking_date, cb.booking_time, cb.duration_minutes,
         cb.meeting_link, cb.zoom_start_url
  FROM public.consultation_bookings cb
  WHERE cb.reminder_sent_at IS NULL
    AND cb.status IN ('scheduled','confirmed')
    AND ((cb.booking_date::text || ' ' || cb.booking_time::text)::timestamp AT TIME ZONE 'Africa/Cairo')
        BETWEEN _win_start AND _win_end;
$$;

-- Schedule pg_cron job to run every 5 minutes
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
        'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmNpYnpnb3ppcXZ0c2llcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjQ4MDgsImV4cCI6MjA4Nzk0MDgwOH0.zmf60KFFU5ik_cavmcpTGR9eAWUsA915vdzjRFKDVog'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;
