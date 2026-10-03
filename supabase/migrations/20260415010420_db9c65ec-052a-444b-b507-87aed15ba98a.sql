
ALTER TABLE public.courses
  ADD COLUMN has_certificate boolean NOT NULL DEFAULT false,
  ADD COLUMN has_lifetime_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN has_community boolean NOT NULL DEFAULT false,
  ADD COLUMN has_individual_support boolean NOT NULL DEFAULT false;
