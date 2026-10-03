CREATE OR REPLACE FUNCTION public.admin_list_coupons()
RETURNS TABLE(
  id uuid, tenant_id uuid, mentor_name text, mentor_slug text,
  code text, discount_type text, discount_value numeric,
  is_active boolean, expires_at timestamptz, created_at timestamptz,
  max_uses integer, used_count integer, max_per_customer integer,
  course_title text, digital_product_title text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.tenant_id, t.name, t.slug,
         c.code, c.discount_type, c.discount_value,
         c.is_active, c.expires_at, c.created_at,
         c.max_uses, c.used_count, c.max_per_customer,
         co.title, dp.title
  FROM public.coupons c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  LEFT JOIN public.courses co ON co.id = c.course_id
  LEFT JOIN public.digital_products dp ON dp.id = c.digital_product_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_coupons() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_coupon_active(_coupon_id uuid, _is_active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.coupons SET is_active = _is_active WHERE id = _coupon_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_coupon_active(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_coupon(_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.coupons WHERE id = _coupon_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_coupon(uuid) TO authenticated;