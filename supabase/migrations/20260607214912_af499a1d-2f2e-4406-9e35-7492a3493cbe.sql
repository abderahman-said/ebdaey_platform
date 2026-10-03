ALTER TABLE public.withdrawal_settings 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('personal','company')),
  ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;