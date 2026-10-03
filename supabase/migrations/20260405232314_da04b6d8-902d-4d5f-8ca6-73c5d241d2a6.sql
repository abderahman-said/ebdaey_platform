
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'قالب افتراضي',
  -- Branding
  logo_url TEXT,
  signature_url TEXT,
  watermark_url TEXT,
  watermark_opacity NUMERIC NOT NULL DEFAULT 5,
  seal_url TEXT,
  background_url TEXT,
  -- Colors
  primary_color TEXT NOT NULL DEFAULT '#3b82f6',
  secondary_color TEXT NOT NULL DEFAULT '#6b7280',
  accent_color TEXT NOT NULL DEFAULT '#fbbf24',
  border_color TEXT NOT NULL DEFAULT '#e5e7eb',
  title_font TEXT NOT NULL DEFAULT 'serif',
  body_font TEXT NOT NULL DEFAULT 'sans-serif',
  -- Layout
  border_style TEXT NOT NULL DEFAULT 'double',
  border_width INTEGER NOT NULL DEFAULT 8,
  show_qr BOOLEAN NOT NULL DEFAULT true,
  show_certificate_id BOOLEAN NOT NULL DEFAULT true,
  show_date BOOLEAN NOT NULL DEFAULT true,
  show_expiry BOOLEAN NOT NULL DEFAULT false,
  -- Content
  certificate_title TEXT NOT NULL DEFAULT 'شهادة إتمام',
  certificate_text TEXT NOT NULL DEFAULT 'تشهد هذه الشهادة بأن',
  achievement_text TEXT NOT NULL DEFAULT 'قد أتم بنجاح دورة',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage their certificate template"
  ON public.certificate_templates
  FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));

CREATE POLICY "Anyone can view certificate templates"
  ON public.certificate_templates
  FOR SELECT
  TO authenticated
  USING (true);
