
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  icon_name text NOT NULL DEFAULT 'Bell',
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can manage own notifications"
  ON public.notifications FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view tenant notifications"
  ON public.notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM students s
    WHERE s.user_id = auth.uid()
      AND s.tenant_id = notifications.tenant_id
  ));
