CREATE OR REPLACE FUNCTION public.has_my_capture_history(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.content_protection_events e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.student_id = _student_id AND s.user_id = auth.uid()
      AND e.event_type = 'screen_recording'
  );
$$;
REVOKE ALL ON FUNCTION public.has_my_capture_history(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_my_capture_history(uuid) TO authenticated;