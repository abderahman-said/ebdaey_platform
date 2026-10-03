
ALTER TABLE public.courses 
  ADD COLUMN community_link text,
  ADD COLUMN faqs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN announcement_text text,
  ADD COLUMN announcement_type text DEFAULT 'fixed';
