
CREATE TABLE public.mentor_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meta_pixel_id TEXT,
  meta_access_token TEXT,
  tiktok_pixel_id TEXT,
  meta_connected BOOLEAN NOT NULL DEFAULT false,
  tiktok_connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.mentor_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own pixels" ON public.mentor_pixels
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage all pixels" ON public.mentor_pixels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read connected pixels" ON public.mentor_pixels
  FOR SELECT USING (meta_connected = true OR tiktok_connected = true);
