CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Make qa_call_edge resilient: don't fail the parent transaction if pg_net is missing or http_post errors
CREATE OR REPLACE FUNCTION public.qa_call_edge(_fn text, _body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _url text := 'https://hnrcibzgoziqvtsiepws.supabase.co/functions/v1/' || _fn;
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmNpYnpnb3ppcXZ0c2llcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjQ4MDgsImV4cCI6MjA4Nzk0MDgwOH0.zmf60KFFU5ik_cavmcpTGR9eAWUsA915vdzjRFKDVog';
BEGIN
  BEGIN
    PERFORM extensions.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || _anon),
      body := _body
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'qa_call_edge failed for %: %', _fn, SQLERRM;
  END;
END;
$$;