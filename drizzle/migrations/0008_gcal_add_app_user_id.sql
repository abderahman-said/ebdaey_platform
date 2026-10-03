ALTER TABLE public.mentor_google_calendar_accounts
ADD COLUMN IF NOT EXISTS app_user_id text;