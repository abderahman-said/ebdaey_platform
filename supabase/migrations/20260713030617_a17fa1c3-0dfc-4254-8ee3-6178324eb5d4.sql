CREATE OR REPLACE FUNCTION public.qa_call_edge(_fn text, _body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  _url text := 'https://hnrcibzgoziqvtsiepws.supabase.co/functions/v1/' || _fn;
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmNpYnpnb3ppcXZ0c2llcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjQ4MDgsImV4cCI6MjA4Nzk0MDgwOH0.zmf60KFFU5ik_cavmcpTGR9eAWUsA915vdzjRFKDVog';
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || _anon),
      body := _body
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'qa_call_edge failed for %: %', _fn, SQLERRM;
  END;
END;
$fn$;

DO $do$
DECLARE
  _c record;
BEGIN
  FOR _c IN
    SELECT c.id
    FROM public.courses c
    WHERE COALESCE(c.qa_bot_enabled, false) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.course_qa_chunks q WHERE q.course_id = c.id
      )
  LOOP
    PERFORM public.qa_call_edge(
      'qa-backfill-course',
      jsonb_build_object('course_id', _c.id, 'auto', true)
    );
  END LOOP;
END
$do$;