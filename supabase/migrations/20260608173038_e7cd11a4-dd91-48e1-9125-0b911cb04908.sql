
CREATE TABLE public.platform_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Megaphone',
  link_url TEXT,
  audience TEXT NOT NULL DEFAULT 'mentors',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_announcements TO authenticated;
GRANT ALL ON public.platform_announcements TO service_role;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform announcements"
  ON public.platform_announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Mentors view platform announcements"
  ON public.platform_announcements FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    (audience IN ('mentors','all') AND public.has_role(auth.uid(), 'mentor'))
  );

CREATE TRIGGER update_platform_announcements_updated_at
  BEFORE UPDATE ON public.platform_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.platform_announcement_reads (
  announcement_id UUID NOT NULL REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.platform_announcement_reads TO authenticated;
GRANT ALL ON public.platform_announcement_reads TO service_role;
ALTER TABLE public.platform_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON public.platform_announcement_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
