-- 1. Restrict public read on lessons to preview lessons only
DROP POLICY IF EXISTS "Public read lessons of published courses" ON public.lessons;

CREATE POLICY "Public read preview lessons of published courses"
ON public.lessons
FOR SELECT
USING (
  is_preview = true
  AND EXISTS (
    SELECT 1
    FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = lessons.section_id
      AND c.is_published = true
  )
);

-- 2. Safe public curriculum listing (metadata only, no media URLs)
CREATE OR REPLACE FUNCTION public.get_public_course_curriculum(_course_id uuid)
RETURNS TABLE(
  id uuid,
  section_id uuid,
  title text,
  content_type text,
  duration_seconds integer,
  is_preview boolean,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.section_id, l.title, l.content_type, l.duration_seconds,
         l.is_preview, l.sort_order
  FROM public.lessons l
  JOIN public.course_sections cs ON cs.id = l.section_id
  JOIN public.courses c ON c.id = cs.course_id
  WHERE c.id = _course_id
    AND c.is_published = true
  ORDER BY l.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_course_curriculum(uuid) TO anon, authenticated;

-- 3. Replace SECURITY DEFINER views with SECURITY INVOKER views backed by
--    explicit security-definer source functions (safe column projections).
CREATE OR REPLACE FUNCTION public.public_tenants_src()
RETURNS TABLE(
  id uuid, name text, slug text, bio text, specialty text,
  profile_image_url text, cover_image_url text, primary_color text,
  whatsapp_number text, whatsapp_default_color text,
  show_reviews_on_profile boolean, subscriptions_enabled boolean,
  social_facebook text, social_instagram text, social_linkedin text,
  social_tiktok text, social_x text, social_youtube text,
  is_active boolean, created_at timestamptz, public_language text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, name, slug, bio, specialty, profile_image_url, cover_image_url,
         primary_color, whatsapp_number, whatsapp_default_color,
         show_reviews_on_profile, subscriptions_enabled,
         social_facebook, social_instagram, social_linkedin,
         social_tiktok, social_x, social_youtube,
         is_active, created_at, public_language
  FROM public.tenants
  WHERE is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.public_tenants_src() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_tenants;
CREATE VIEW public.public_tenants
WITH (security_invoker = on, security_barrier = on) AS
  SELECT * FROM public.public_tenants_src();

CREATE OR REPLACE FUNCTION public.public_mentor_schedule_slots_src()
RETURNS TABLE(
  id uuid, schedule_id uuid, day_of_week integer,
  start_time time without time zone, end_time time without time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.schedule_id, s.day_of_week, s.start_time, s.end_time
  FROM public.mentor_schedule_slots s
  JOIN public.tenants t ON t.id = s.tenant_id
  WHERE t.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.public_mentor_schedule_slots_src() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_mentor_schedule_slots;
CREATE VIEW public.public_mentor_schedule_slots
WITH (security_invoker = on, security_barrier = on) AS
  SELECT * FROM public.public_mentor_schedule_slots_src();

CREATE OR REPLACE FUNCTION public.public_mentor_schedule_overrides_src()
RETURNS TABLE(
  id uuid, schedule_id uuid, date date, is_available boolean,
  start_time time without time zone, end_time time without time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.schedule_id, o.date, o.is_available, o.start_time, o.end_time
  FROM public.mentor_schedule_overrides o
  JOIN public.tenants t ON t.id = o.tenant_id
  WHERE t.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.public_mentor_schedule_overrides_src() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_mentor_schedule_overrides;
CREATE VIEW public.public_mentor_schedule_overrides
WITH (security_invoker = on, security_barrier = on) AS
  SELECT * FROM public.public_mentor_schedule_overrides_src();

CREATE OR REPLACE FUNCTION public.public_consultation_taken_slots_src()
RETURNS TABLE(
  live_course_id uuid, booking_date date, booking_time time without time zone,
  duration_minutes integer, status text, tenant_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cb.live_course_id, cb.booking_date, cb.booking_time,
         cb.duration_minutes, cb.status, cb.tenant_id
  FROM public.consultation_bookings cb
  JOIN public.live_courses lc ON lc.id = cb.live_course_id
  WHERE lc.is_published = true
    AND cb.status = ANY (ARRAY['scheduled'::text, 'confirmed'::text]);
$$;

GRANT EXECUTE ON FUNCTION public.public_consultation_taken_slots_src() TO anon, authenticated;

DROP VIEW IF EXISTS public.public_consultation_taken_slots;
CREATE VIEW public.public_consultation_taken_slots
WITH (security_invoker = on, security_barrier = on) AS
  SELECT * FROM public.public_consultation_taken_slots_src();

GRANT SELECT ON public.public_tenants TO anon, authenticated;
GRANT SELECT ON public.public_mentor_schedule_slots TO anon, authenticated;
GRANT SELECT ON public.public_mentor_schedule_overrides TO anon, authenticated;
GRANT SELECT ON public.public_consultation_taken_slots TO anon, authenticated;

-- 4. Internal Q&A pipeline calls must use the service-role key
CREATE OR REPLACE FUNCTION public.qa_call_edge(_fn text, _body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _url text := 'https://hnrcibzgoziqvtsiepws.supabase.co/functions/v1/' || _fn;
  _svc text;
BEGIN
  SELECT decrypted_secret INTO _svc FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key';
  IF _svc IS NULL THEN
    RAISE WARNING 'qa_call_edge: service key unavailable, skipping %', _fn;
    RETURN;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || _svc,
        'x-internal-service-key', _svc
      ),
      body := _body
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'qa_call_edge failed for %: %', _fn, SQLERRM;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.qa_auto_index_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _course_id uuid;
  _enabled boolean;
  _fn text;
  _is_media boolean;
  _has_media boolean;
  _has_text boolean;
  _content_changed boolean;
BEGIN
  SELECT cs.course_id INTO _course_id
  FROM public.course_sections cs
  WHERE cs.id = NEW.section_id;
  IF _course_id IS NULL THEN RETURN NEW; END IF;

  SELECT qa_bot_enabled INTO _enabled FROM public.courses WHERE id = _course_id;
  IF NOT COALESCE(_enabled, false) THEN RETURN NEW; END IF;

  _is_media := NEW.content_type IN ('video','audio');
  _has_media := COALESCE(NULLIF(NEW.video_url,''), NULLIF(NEW.audio_url,'')) IS NOT NULL;
  _has_text := COALESCE(NULLIF(NEW.text_content,''), '') <> '';

  IF TG_OP = 'INSERT' THEN
    _content_changed := true;
  ELSE
    _content_changed :=
      COALESCE(NEW.video_url,'')   IS DISTINCT FROM COALESCE(OLD.video_url,'')
      OR COALESCE(NEW.audio_url,'')   IS DISTINCT FROM COALESCE(OLD.audio_url,'')
      OR COALESCE(NEW.text_content,'') IS DISTINCT FROM COALESCE(OLD.text_content,'')
      OR COALESCE(NEW.content_type,'') IS DISTINCT FROM COALESCE(OLD.content_type,'');
  END IF;

  IF NOT _content_changed THEN RETURN NEW; END IF;

  IF _is_media AND _has_media THEN
    _fn := 'qa-transcribe-lesson';
  ELSIF _has_text THEN
    _fn := 'qa-index-lesson';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.qa_call_edge(_fn, jsonb_build_object('lesson_id', NEW.id));

  RETURN NEW;
END;
$function$;