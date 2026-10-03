ALTER TABLE public.balance_adjustments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'adjustment';

UPDATE public.balance_adjustments
SET kind = 'settlement'
WHERE amount < 0 AND reason LIKE 'تسوية رصيد وتحويل بنكي%';