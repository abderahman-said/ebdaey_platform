
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  path text,
  page_type text,
  referrer text,
  source text,
  country text,
  device text,
  os text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_tenant_created ON public.page_views (tenant_id, created_at DESC);
CREATE INDEX idx_page_views_tenant_country ON public.page_views (tenant_id, country);
CREATE INDEX idx_page_views_tenant_device ON public.page_views (tenant_id, device);

GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors view own tenant page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins view all page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages page views"
  ON public.page_views FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
