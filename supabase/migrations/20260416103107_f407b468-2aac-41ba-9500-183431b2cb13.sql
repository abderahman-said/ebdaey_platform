CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = _coupon_id;
END;
$$;