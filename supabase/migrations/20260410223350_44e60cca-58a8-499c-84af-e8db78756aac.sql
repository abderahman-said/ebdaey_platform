ALTER TABLE public.lessons 
ADD COLUMN description text DEFAULT NULL,
ADD COLUMN is_preview boolean NOT NULL DEFAULT false;