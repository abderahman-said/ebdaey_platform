CREATE OR REPLACE FUNCTION public.guard_payment_status_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status <> 'cancelled' THEN
    RAISE EXCEPTION 'payment_status can only be changed by the payment system';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_orders_payment_status BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_status_update();
CREATE TRIGGER guard_dp_payment_status BEFORE UPDATE ON public.digital_product_purchases
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_status_update();
CREATE TRIGGER guard_lc_payment_status BEFORE UPDATE ON public.live_course_purchases
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_status_update();