create or replace function public.get_certificate_mentor_name(_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.last_name,'')), '')
  from public.tenants t
  where t.id = _tenant_id
    and t.certificate_mentor_short_name = true
$$;

grant execute on function public.get_certificate_mentor_name(uuid) to anon, authenticated, service_role;