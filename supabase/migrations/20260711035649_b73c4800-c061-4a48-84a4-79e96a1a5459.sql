INSERT INTO public.user_roles (user_id, role)
SELECT t.owner_id, 'mentor'::app_role
FROM public.tenants t
WHERE t.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = t.owner_id AND ur.role = 'mentor'
  );