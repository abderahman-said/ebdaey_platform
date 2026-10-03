create or replace function public.verify_certificate(cert_code text)
returns table(
  student_name text,
  course_title text,
  mentor_name text,
  mentor_slug text,
  completion_date timestamptz,
  certificate_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    s.full_name as student_name,
    c.title as course_title,
    t.name as mentor_name,
    t.slug as mentor_slug,
    e.created_at as completion_date,
    upper(substring(e.id::text, 1, 8)) as certificate_code
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  join public.students s on s.id = e.student_id
  join public.tenants t on t.id = e.tenant_id
  where upper(substring(e.id::text, 1, 8)) = upper(cert_code)
  limit 1;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;