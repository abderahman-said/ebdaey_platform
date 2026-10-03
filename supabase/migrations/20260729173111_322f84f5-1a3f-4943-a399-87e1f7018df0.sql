ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS dashboard_dark_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.dashboard_dark_mode IS 'Saved mentor dashboard appearance preference: true for dark mode, false for light mode.';