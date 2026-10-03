ALTER TABLE public.courses
ADD COLUMN guarantee_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN guarantee_days integer NOT NULL DEFAULT 7,
ADD COLUMN guarantee_title text NULL,
ADD COLUMN guarantee_description text NULL;