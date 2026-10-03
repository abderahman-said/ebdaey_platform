
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unlisted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buy_button_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS card_button_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_before_discount numeric DEFAULT NULL;
