-- Content bank folders per course
CREATE TABLE public.content_bank_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_bank_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all cb folders" ON public.content_bank_folders FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can manage own cb folders" ON public.content_bank_folders FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Enrolled students can view cb folders" ON public.content_bank_folders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.course_id = content_bank_folders.course_id
    AND e.student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid())
  )
);

-- Content bank items
CREATE TABLE public.content_bank_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.content_bank_folders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  text_content text,
  file_url text,
  link_url text,
  button_label text,
  button_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_bank_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all cb items" ON public.content_bank_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can manage own cb items" ON public.content_bank_items FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Enrolled students can view cb items" ON public.content_bank_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.course_id = content_bank_items.course_id
    AND e.student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid())
  )
);