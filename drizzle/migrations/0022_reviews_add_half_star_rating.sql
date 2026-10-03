ALTER TABLE public.reviews ADD COLUMN rating_v2 numeric(2,1);
UPDATE public.reviews SET rating_v2 = rating::numeric(2,1);