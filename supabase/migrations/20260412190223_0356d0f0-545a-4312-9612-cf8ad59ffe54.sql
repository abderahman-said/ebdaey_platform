
-- Notification campaigns table
CREATE TABLE public.notification_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Bell',
  link_url TEXT,
  
  -- Channels
  channel_bell BOOLEAN NOT NULL DEFAULT true,
  channel_email BOOLEAN NOT NULL DEFAULT false,
  
  -- Email content
  email_subject TEXT,
  email_body TEXT,
  email_cta_text TEXT,
  email_cta_url TEXT,
  
  -- Targeting: 'all', 'specific_courses'
  target_type TEXT NOT NULL DEFAULT 'all',
  target_course_ids UUID[] DEFAULT '{}',
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  
  -- Status: 'draft', 'sent', 'scheduled', 'partial_failure', 'failed'
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Stats
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  email_open_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Mentors can manage own campaigns"
  ON public.notification_campaigns FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage all campaigns"
  ON public.notification_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_notification_campaigns_updated_at
  BEFORE UPDATE ON public.notification_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
