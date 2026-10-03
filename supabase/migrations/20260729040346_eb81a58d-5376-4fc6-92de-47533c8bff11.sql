
CREATE OR REPLACE FUNCTION public.record_purchase_transactions(
  _tenant_id uuid,
  _order_id uuid,
  _gross numeric,
  _platform_fee numeric,
  _gateway_fee numeric,
  _description text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(_gross, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id)
    VALUES (_tenant_id, _gross, 'purchase', _description, _order_id);
  END IF;
  IF COALESCE(_platform_fee, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id)
    VALUES (_tenant_id, -_platform_fee, 'commission', _description, _order_id);
  END IF;
  IF COALESCE(_gateway_fee, 0) > 0 THEN
    INSERT INTO public.transactions (tenant_id, amount, category, description, order_id)
    VALUES (_tenant_id, -_gateway_fee, 'gateway_fee', _description, _order_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_orders_record_transactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    SELECT COALESCE(NEW.product_title, c.title, 'Course') INTO _title
      FROM public.courses c WHERE c.id = NEW.course_id;
    PERFORM public.record_purchase_transactions(
      NEW.tenant_id, NEW.id, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, NEW.product_title, 'Course'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_record_transactions ON public.orders;
CREATE TRIGGER orders_record_transactions
AFTER INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_record_transactions();

CREATE OR REPLACE FUNCTION public.tg_dp_purchases_record_transactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    SELECT title INTO _title FROM public.digital_products WHERE id = NEW.digital_product_id;
    -- order_id left NULL: transactions.order_id FKs to public.orders only
    PERFORM public.record_purchase_transactions(
      NEW.tenant_id, NULL, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, 'Digital Product'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS dp_purchases_record_transactions ON public.digital_product_purchases;
CREATE TRIGGER dp_purchases_record_transactions
AFTER INSERT OR UPDATE OF payment_status ON public.digital_product_purchases
FOR EACH ROW EXECUTE FUNCTION public.tg_dp_purchases_record_transactions();

CREATE OR REPLACE FUNCTION public.tg_lc_purchases_record_transactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    SELECT title INTO _title FROM public.live_courses WHERE id = NEW.live_course_id;
    PERFORM public.record_purchase_transactions(
      NEW.tenant_id, NULL, NEW.gross_amount, NEW.platform_fee, NEW.gateway_fee,
      COALESCE(_title, 'Live Course'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lc_purchases_record_transactions ON public.live_course_purchases;
CREATE TRIGGER lc_purchases_record_transactions
AFTER INSERT OR UPDATE OF payment_status ON public.live_course_purchases
FOR EACH ROW EXECUTE FUNCTION public.tg_lc_purchases_record_transactions();

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT o.*, c.title AS _ctitle FROM public.orders o
             LEFT JOIN public.courses c ON c.id = o.course_id
             WHERE o.payment_status = 'paid'
               AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.order_id = o.id)
  LOOP
    PERFORM public.record_purchase_transactions(
      r.tenant_id, r.id, r.gross_amount, r.platform_fee, r.gateway_fee,
      COALESCE(r.product_title, r._ctitle, 'Course'));
  END LOOP;

  FOR r IN SELECT p.*, d.title AS _ctitle FROM public.digital_product_purchases p
             LEFT JOIN public.digital_products d ON d.id = p.digital_product_id
             WHERE p.payment_status = 'completed'
  LOOP
    PERFORM public.record_purchase_transactions(
      r.tenant_id, NULL, r.gross_amount, r.platform_fee, r.gateway_fee,
      COALESCE(r._ctitle, 'Digital Product'));
  END LOOP;

  FOR r IN SELECT p.*, l.title AS _ctitle FROM public.live_course_purchases p
             LEFT JOIN public.live_courses l ON l.id = p.live_course_id
             WHERE p.payment_status = 'completed'
  LOOP
    PERFORM public.record_purchase_transactions(
      r.tenant_id, NULL, r.gross_amount, r.platform_fee, r.gateway_fee,
      COALESCE(r._ctitle, 'Live Course'));
  END LOOP;
END $$;
