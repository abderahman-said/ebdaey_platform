
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper to call edge functions in background
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
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || _anon),
    body := _body
  );
END;
$$;

-- Trigger fn for lesson insert/update
CREATE OR REPLACE FUNCTION public.qa_on_lesson_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course_id uuid;
  _bot_enabled boolean;
  _has_media boolean;
  _media_changed boolean;
  _text_changed boolean;
BEGIN
  SELECT cs.course_id INTO _course_id FROM course_sections cs WHERE cs.id = NEW.section_id;
  IF _course_id IS NULL THEN RETURN NEW; END IF;

  SELECT qa_bot_enabled INTO _bot_enabled FROM courses WHERE id = _course_id;
  IF NOT COALESCE(_bot_enabled, false) THEN RETURN NEW; END IF;

  _has_media := (NEW.video_url IS NOT NULL OR NEW.audio_url IS NOT NULL);

  IF TG_OP = 'INSERT' THEN
    _media_changed := _has_media;
    _text_changed := COALESCE(length(NEW.text_content), 0) > 20;
  ELSE
    _media_changed := _has_media AND (NEW.video_url IS DISTINCT FROM OLD.video_url OR NEW.audio_url IS DISTINCT FROM OLD.audio_url);
    _text_changed := (NEW.text_content IS DISTINCT FROM OLD.text_content) OR (NEW.title IS DISTINCT FROM OLD.title);
  END IF;

  IF _media_changed THEN
    PERFORM public.qa_call_edge('qa-transcribe-lesson', jsonb_build_object('lesson_id', NEW.id));
  ELSIF _text_changed THEN
    PERFORM public.qa_call_edge('qa-index-lesson', jsonb_build_object('lesson_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_lesson_change ON public.lessons;
CREATE TRIGGER trg_qa_lesson_change
AFTER INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.qa_on_lesson_change();

-- Trigger when course bot is toggled on -> backfill
CREATE OR REPLACE FUNCTION public.qa_on_course_toggle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.qa_bot_enabled, false) AND NOT COALESCE(OLD.qa_bot_enabled, false) THEN
    PERFORM public.qa_call_edge('qa-backfill-course', jsonb_build_object('course_id', NEW.id, 'auto', true));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_course_toggle ON public.courses;
CREATE TRIGGER trg_qa_course_toggle
AFTER UPDATE OF qa_bot_enabled ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.qa_on_course_toggle();
