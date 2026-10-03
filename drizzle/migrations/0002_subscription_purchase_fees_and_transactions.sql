ALTER TABLE public.subscription_purchases
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gateway_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mentor_net numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_purchases_payment_key_key
  ON public.subscription_purchases (payment_key)
  WHERE payment_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_subscriptions_record_transactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'completed') THEN
    PERFORM public.record_purchase_transactions(
      NEW.tenant_id, NULL, NEW.amount, NEW.platform_fee, NEW.gateway_fee,
      'Yearly Subscription');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_record_transactions ON public.subscription_purchases;
CREATE TRIGGER trg_subscriptions_record_transactions
AFTER INSERT OR UPDATE OF payment_status ON public.subscription_purchases
FOR EACH ROW EXECUTE FUNCTION public.tg_subscriptions_record_transactions();