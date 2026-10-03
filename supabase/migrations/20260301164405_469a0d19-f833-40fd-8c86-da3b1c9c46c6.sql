
-- ============================================
-- إبداعي Multi-Tenant Database Schema
-- ============================================

-- 1. App roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'student');

-- 2. Tenants table (each mentor = one tenant)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  cover_image_url TEXT,
  profile_image_url TEXT,
  whatsapp_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Students table (tenant-scoped)
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

-- 6. Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- 7. Course sections
CREATE TABLE public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  pdf_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  gateway_fee NUMERIC(10,2) NOT NULL,
  mentor_net NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  kashier_order_id TEXT,
  coupon_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, course_id)
);

-- 11. Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- 12. Withdrawal settings
CREATE TABLE public.withdrawal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  legal_name TEXT NOT NULL,
  national_id_image_url TEXT,
  iban TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Security definer functions
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE owner_id = _user_id LIMIT 1
$$;

-- ============================================
-- Updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawal_settings_updated_at BEFORE UPDATE ON public.withdrawal_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- USER_ROLES
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- TENANTS
CREATE POLICY "Public can view active tenants" ON public.tenants FOR SELECT USING (is_active = true);
CREATE POLICY "Owner can manage own tenant" ON public.tenants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage all tenants" ON public.tenants FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- STUDENTS
CREATE POLICY "Students can view own record" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mentors can view own tenant students" ON public.students FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Students can insert own record" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all students" ON public.students FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- COURSES
CREATE POLICY "Published courses are public" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "Mentor can manage own courses" ON public.courses FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can view all courses" ON public.courses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- COURSE_SECTIONS
CREATE POLICY "Public read sections of published courses" ON public.course_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND is_published = true)
);
CREATE POLICY "Mentor can manage own sections" ON public.course_sections FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- LESSONS
CREATE POLICY "Enrolled students can view lessons" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.course_sections cs ON cs.course_id = e.course_id
    WHERE cs.id = section_id AND e.student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  )
);
CREATE POLICY "Mentor can manage own lessons" ON public.lessons FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ORDERS
CREATE POLICY "Students can view own orders" ON public.orders FOR SELECT USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);
CREATE POLICY "Mentors can view own tenant orders" ON public.orders FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ENROLLMENTS
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);
CREATE POLICY "Mentors can view own tenant enrollments" ON public.enrollments FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- COUPONS
CREATE POLICY "Active coupons readable" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Mentors can manage own coupons" ON public.coupons FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- WITHDRAWAL_SETTINGS
CREATE POLICY "Mentor can manage own withdrawal settings" ON public.withdrawal_settings FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can view all withdrawal settings" ON public.withdrawal_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update withdrawal settings" ON public.withdrawal_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- WITHDRAWAL_REQUESTS
CREATE POLICY "Mentor can manage own withdrawal requests" ON public.withdrawal_requests FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_students_tenant ON public.students(tenant_id);
CREATE INDEX idx_students_user ON public.students(user_id);
CREATE INDEX idx_courses_tenant ON public.courses(tenant_id);
CREATE INDEX idx_courses_slug ON public.courses(tenant_id, slug);
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_orders_student ON public.orders(student_id);
CREATE INDEX idx_enrollments_tenant ON public.enrollments(tenant_id);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_lessons_section ON public.lessons(section_id);
CREATE INDEX idx_course_sections_course ON public.course_sections(course_id);

-- ============================================
-- Storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('course-assets', 'course-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('mentor-documents', 'mentor-documents', false);

CREATE POLICY "Course assets publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'course-assets');
CREATE POLICY "Mentors can upload course assets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'course-assets' AND public.has_role(auth.uid(), 'mentor')
);
CREATE POLICY "Mentors can update course assets" ON storage.objects FOR UPDATE USING (
  bucket_id = 'course-assets' AND public.has_role(auth.uid(), 'mentor')
);
CREATE POLICY "Mentors can upload documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'mentor-documents' AND public.has_role(auth.uid(), 'mentor')
);
CREATE POLICY "Admins can view documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'mentor-documents' AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owner can view own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'mentor-documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
