create or replace function public.admin_tenant_owner_emails()
returns table(tenant_id uuid, owner_id uuid, email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select t.id, t.owner_id, u.email::text
  from public.tenants t
  left join auth.users u on u.id = t.owner_id
  where public.has_role(auth.uid(), 'admin')
$$;

revoke all on function public.admin_tenant_owner_emails() from public;
grant execute on function public.admin_tenant_owner_emails() to authenticated;