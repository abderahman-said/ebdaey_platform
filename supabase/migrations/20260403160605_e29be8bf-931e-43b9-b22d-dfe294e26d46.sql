
ALTER TABLE public.withdrawal_settings 
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS national_id_front_url text,
ADD COLUMN IF NOT EXISTS national_id_back_url text;
