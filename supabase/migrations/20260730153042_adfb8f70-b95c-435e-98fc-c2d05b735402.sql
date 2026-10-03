ALTER TABLE public.live_course_sessions ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.find_upcoming_live_session_reminders(_win_start timestamptz, _win_end timestamptz)
RETURNS TABLE(id uuid, tenant_id uuid, live_course_id uuid, title text, session_date date, session_time time without time zone, duration_minutes integer, zoom_join_url text, zoom_start_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.tenant_id, s.live_course_id, s.title, s.session_date, s.session_time,
         s.duration_minutes, s.zoom_join_url, s.zoom_start_url
  FROM public.live_course_sessions s
  WHERE s.reminder_sent_at IS NULL
    AND ((s.session_date::text || ' ' || s.session_time::text)::timestamp AT TIME ZONE 'Africa/Cairo')
        BETWEEN _win_start AND _win_end;
$$;

UPDATE public.notification_templates
SET body = body || E'\n\n{{extra_note}}',
    body_en = body_en || E'\n\n{{extra_note}}'
WHERE template_key IN ('mentor.new_order','student.purchase_confirmation')
  AND body NOT LIKE '%{{extra_note}}%';