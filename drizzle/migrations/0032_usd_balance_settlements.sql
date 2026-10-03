ALTER TABLE public.balance_adjustments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';

CREATE OR REPLACE FUNCTION public.admin_usd_balances()
 RETURNS TABLE(tenant_id uuid, usd_balance numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  WITH earned AS (
    SELECT o.tenant_id, o.mentor_net AS amt FROM public.orders o WHERE o.gateway = 'stripe' AND o.payment_status = 'paid'
    UNION ALL SELECT d.tenant_id, d.mentor_net FROM public.digital_product_purchases d WHERE d.gateway = 'stripe' AND d.payment_status = 'completed'
    UNION ALL SELECT l.tenant_id, l.mentor_net FROM public.live_course_purchases l WHERE l.gateway = 'stripe' AND l.payment_status = 'completed'
    UNION ALL SELECT b.tenant_id, b.amount FROM public.balance_adjustments b WHERE b.currency = 'USD'
  )
  SELECT e.tenant_id, round(sum(COALESCE(e.amt, 0)), 2) FROM earned e GROUP BY e.tenant_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_usd_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_usd_balances() TO authenticated;