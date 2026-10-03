INSERT INTO public.enrollments (student_id, course_id, tenant_id)
SELECT lcp.student_id, gc.gift_course_id, lcp.tenant_id
FROM public.live_course_purchases lcp
JOIN public.gift_courses gc ON gc.live_course_id = lcp.live_course_id
WHERE lcp.payment_status = 'completed'
  AND gc.gift_kind = 'course'
  AND gc.gift_course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = lcp.student_id AND e.course_id = gc.gift_course_id
  );