CREATE OR REPLACE FUNCTION public.record_purchase_transactions(_tenant_id uuid, _order_id uuid, _gross numeric, _platform_fee numeric, _gateway_fee numeric, _description text, _currency text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(_gross, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id, currency)
    VALUES (_tenant_id, _gross, 'purchase', _description, _order_id, _currency);
  END IF;
  IF COALESCE(_platform_fee, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id, currency)
    VALUES (_tenant_id, -_platform_fee, 'commission', _description, _order_id, _currency);
  END IF;
  IF COALESCE(_gateway_fee, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id, currency)
    VALUES (_tenant_id, -_gateway_fee, 'gateway_fee', _description, _order_id, _currency);
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.record_purchase_transactions(uuid, uuid, numeric, numeric, numeric, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_orders_record_transactions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    SELECT COALESCE(NEW.product_title, c.title, 'Course') INTO _title FROM public.courses c WHERE c.id = NEW.course_id;
    PERFORM public.record_purchase_transactions(NEW.tenant_id, NEW.id, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, NEW.product_title, 'Course'), CASE WHEN NEW.gateway = 'stripe' THEN 'USD' ELSE 'EGP' END);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_dp_purchases_record_transactions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    SELECT title INTO _title FROM public.digital_products WHERE id = NEW.digital_product_id;
    PERFORM public.record_purchase_transactions(NEW.tenant_id, NULL, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, 'Digital Product'), CASE WHEN NEW.gateway = 'stripe' THEN 'USD' ELSE 'EGP' END);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_lc_purchases_record_transactions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    SELECT title INTO _title FROM public.live_courses WHERE id = NEW.live_course_id;
    PERFORM public.record_purchase_transactions(NEW.tenant_id, NULL, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, 'Live Course'), CASE WHEN NEW.gateway = 'stripe' THEN 'USD' ELSE 'EGP' END);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_subscriptions_record_transactions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    PERFORM public.record_purchase_transactions(NEW.tenant_id, NULL, NEW.amount, NEW.platform_fee, NEW.gateway_fee,
      'Yearly Subscription', CASE WHEN NEW.gateway = 'stripe' THEN 'USD' ELSE 'EGP' END);
  END IF;
  RETURN NEW;
END; $function$;