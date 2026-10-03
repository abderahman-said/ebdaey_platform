
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('mentor', 'student', 'auth')),
  display_name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT true,
  default_subject TEXT NOT NULL,
  default_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read templates" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update templates" ON public.notification_templates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_notification_templates_updated
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.notification_templates
  (template_key, category, display_name, description, subject, body, variables, default_subject, default_body)
VALUES
-- Mentor
('mentor.new_order', 'mentor', 'طلب جديد',
 'يُرسل للمنتور عند شراء أحد طلابه لأي منتج أو كورس',
 'طلب جديد من {{student_name}} 🎉',
 'مرحباً {{mentor_name}}،

لديك طلب جديد على منصتك:

المنتج: {{product_title}}
الطالب: {{student_name}}
البريد: {{student_email}}
المبلغ: {{amount}} جنيه

يمكنك متابعة الطلبات من لوحة التحكم:
{{dashboard_url}}',
 '["mentor_name", "student_name", "student_email", "product_title", "amount", "dashboard_url"]'::jsonb,
 'طلب جديد من {{student_name}} 🎉',
 'مرحباً {{mentor_name}}،

لديك طلب جديد على منصتك:

المنتج: {{product_title}}
الطالب: {{student_name}}
البريد: {{student_email}}
المبلغ: {{amount}} جنيه

يمكنك متابعة الطلبات من لوحة التحكم:
{{dashboard_url}}'),

('mentor.new_subscription', 'mentor', 'اشتراك جديد في الباقة',
 'يُرسل عند اشتراك طالب في باقة اشتراك',
 'اشتراك جديد في باقة {{plan_title}}',
 'مرحباً {{mentor_name}}،

اشترك {{student_name}} في باقتك ({{plan_title}}) بمبلغ {{amount}} جنيه.

تفاصيل الاشتراك متاحة في لوحة التحكم.',
 '["mentor_name", "student_name", "plan_title", "amount", "dashboard_url"]'::jsonb,
 'اشتراك جديد في باقة {{plan_title}}',
 'مرحباً {{mentor_name}}،

اشترك {{student_name}} في باقتك ({{plan_title}}) بمبلغ {{amount}} جنيه.

تفاصيل الاشتراك متاحة في لوحة التحكم.'),

('mentor.welcome', 'mentor', 'ترحيب بالمنتور الجديد',
 'يُرسل بعد إتمام تسجيل المنتور',
 'أهلاً بك في إبداعي، {{mentor_name}} 👋',
 'مرحباً {{mentor_name}}،

يسعدنا انضمامك إلى منصة إبداعي.

رابط لوحة التحكم الخاصة بك:
{{dashboard_url}}

رابط صفحتك العامة:
{{public_url}}

في انتظار رؤية إبداعك 💚',
 '["mentor_name", "dashboard_url", "public_url"]'::jsonb,
 'أهلاً بك في إبداعي، {{mentor_name}} 👋',
 'مرحباً {{mentor_name}}،

يسعدنا انضمامك إلى منصة إبداعي.

رابط لوحة التحكم الخاصة بك:
{{dashboard_url}}

رابط صفحتك العامة:
{{public_url}}

في انتظار رؤية إبداعك 💚'),

('mentor.withdrawal_approved', 'mentor', 'قبول طلب السحب',
 'يُرسل عند موافقة الأدمن على طلب سحب الأرباح',
 'تم قبول طلب السحب ✅',
 'مرحباً {{mentor_name}}،

تم قبول طلب السحب بمبلغ {{amount}} جنيه. سيتم تحويل المبلغ خلال 24-48 ساعة.',
 '["mentor_name", "amount"]'::jsonb,
 'تم قبول طلب السحب ✅',
 'مرحباً {{mentor_name}}،

تم قبول طلب السحب بمبلغ {{amount}} جنيه. سيتم تحويل المبلغ خلال 24-48 ساعة.'),

('mentor.withdrawal_rejected', 'mentor', 'رفض طلب السحب',
 'يُرسل عند رفض طلب سحب',
 'تم رفض طلب السحب',
 'مرحباً {{mentor_name}}،

للأسف تم رفض طلب السحب بمبلغ {{amount}} جنيه.

السبب: {{reason}}

للاستفسار يرجى التواصل مع الدعم.',
 '["mentor_name", "amount", "reason"]'::jsonb,
 'تم رفض طلب السحب',
 'مرحباً {{mentor_name}}،

للأسف تم رفض طلب السحب بمبلغ {{amount}} جنيه.

السبب: {{reason}}

للاستفسار يرجى التواصل مع الدعم.'),

('mentor.withdrawal_edited', 'mentor', 'تعديل بيانات السحب',
 'يُرسل عند طلب الأدمن تعديل بيانات طلب السحب',
 'يرجى تعديل بيانات طلب السحب',
 'مرحباً {{mentor_name}}،

نحتاج منك تعديل بعض البيانات في طلب السحب بمبلغ {{amount}} جنيه.

الملاحظة: {{note}}

يرجى الدخول إلى لوحة التحكم لتعديل البيانات.',
 '["mentor_name", "amount", "note"]'::jsonb,
 'يرجى تعديل بيانات طلب السحب',
 'مرحباً {{mentor_name}}،

نحتاج منك تعديل بعض البيانات في طلب السحب بمبلغ {{amount}} جنيه.

الملاحظة: {{note}}

يرجى الدخول إلى لوحة التحكم لتعديل البيانات.'),

('mentor.withdrawal_sent', 'mentor', 'تم إرسال الرصيد',
 'يُرسل عند تحويل الأرباح فعلياً للحساب البنكي',
 'تم إرسال رصيدك 💰',
 'مرحباً {{mentor_name}}،

تم تحويل مبلغ {{amount}} جنيه إلى حسابك البنكي بنجاح.

رقم المرجع: {{reference}}',
 '["mentor_name", "amount", "reference"]'::jsonb,
 'تم إرسال رصيدك 💰',
 'مرحباً {{mentor_name}}،

تم تحويل مبلغ {{amount}} جنيه إلى حسابك البنكي بنجاح.

رقم المرجع: {{reference}}'),

('mentor.order_cancelled', 'mentor', 'إلغاء طلب',
 'يُرسل عند إلغاء أحد الطلبات',
 'تم إلغاء طلب {{order_id}}',
 'مرحباً {{mentor_name}}،

تم إلغاء الطلب رقم {{order_id}} من {{student_name}} على منتج {{product_title}} بقيمة {{amount}} جنيه.',
 '["mentor_name", "student_name", "order_id", "product_title", "amount"]'::jsonb,
 'تم إلغاء طلب {{order_id}}',
 'مرحباً {{mentor_name}}،

تم إلغاء الطلب رقم {{order_id}} من {{student_name}} على منتج {{product_title}} بقيمة {{amount}} جنيه.'),

-- Student
('student.purchase_confirmation', 'student', 'تأكيد الشراء',
 'يُرسل للطالب فور إتمام أي عملية شراء',
 'تأكيد شراء: {{product_title}} ✅',
 'مرحباً {{student_name}}،

شكراً لشرائك من {{mentor_name}}.

المنتج: {{product_title}}
المبلغ: {{amount}} جنيه
رقم الطلب: {{order_id}}

يمكنك الوصول لمشترياتك من هنا:
{{access_url}}',
 '["student_name", "mentor_name", "product_title", "amount", "order_id", "access_url"]'::jsonb,
 'تأكيد شراء: {{product_title}} ✅',
 'مرحباً {{student_name}}،

شكراً لشرائك من {{mentor_name}}.

المنتج: {{product_title}}
المبلغ: {{amount}} جنيه
رقم الطلب: {{order_id}}

يمكنك الوصول لمشترياتك من هنا:
{{access_url}}'),

('student.live_session_reminder', 'student', 'تذكير محاضرة كورس مباشر',
 'يُرسل قبل موعد محاضرة الكورس المباشر بساعة',
 'تذكير: محاضرة {{course_title}} بعد ساعة',
 'مرحباً {{student_name}}،

هذا تذكير بأن محاضرة "{{session_title}}" ضمن كورس "{{course_title}}" تبدأ في {{start_time}}.

رابط الحضور:
{{meeting_url}}',
 '["student_name", "course_title", "session_title", "start_time", "meeting_url"]'::jsonb,
 'تذكير: محاضرة {{course_title}} بعد ساعة',
 'مرحباً {{student_name}}،

هذا تذكير بأن محاضرة "{{session_title}}" ضمن كورس "{{course_title}}" تبدأ في {{start_time}}.

رابط الحضور:
{{meeting_url}}'),

('student.consultation_reminder', 'student', 'تذكير جلسة فردية',
 'يُرسل قبل موعد الجلسة الاستشارية الفردية بساعة',
 'تذكير: جلستك مع {{mentor_name}} بعد ساعة',
 'مرحباً {{student_name}}،

هذا تذكير بموعد جلستك الاستشارية مع {{mentor_name}} في {{start_time}}.

رابط الجلسة:
{{meeting_url}}',
 '["student_name", "mentor_name", "start_time", "meeting_url"]'::jsonb,
 'تذكير: جلستك مع {{mentor_name}} بعد ساعة',
 'مرحباً {{student_name}}،

هذا تذكير بموعد جلستك الاستشارية مع {{mentor_name}} في {{start_time}}.

رابط الجلسة:
{{meeting_url}}'),

('student.welcome', 'student', 'ترحيب بالطالب',
 'يُرسل بعد إنشاء الحساب من صفحة الشراء',
 'أهلاً بك في {{mentor_name}} 👋',
 'مرحباً {{student_name}}،

يسعدنا انضمامك.

يمكنك تسجيل الدخول والوصول إلى مشترياتك من هنا:
{{login_url}}',
 '["student_name", "mentor_name", "login_url"]'::jsonb,
 'أهلاً بك في {{mentor_name}} 👋',
 'مرحباً {{student_name}}،

يسعدنا انضمامك.

يمكنك تسجيل الدخول والوصول إلى مشترياتك من هنا:
{{login_url}}'),

('student.password_setup', 'student', 'تعيين كلمة السر',
 'يُرسل بعد أول عملية شراء لتعيين كلمة سر جديدة',
 'قم بتعيين كلمة السر لحسابك',
 'مرحباً {{student_name}}،

تم إنشاء حسابك تلقائياً. لإكمال الوصول لمشترياتك، يرجى تعيين كلمة سر عبر الرابط:

{{setup_url}}

الرابط صالح لمدة محدودة.',
 '["student_name", "setup_url"]'::jsonb,
 'قم بتعيين كلمة السر لحسابك',
 'مرحباً {{student_name}}،

تم إنشاء حسابك تلقائياً. لإكمال الوصول لمشترياتك، يرجى تعيين كلمة سر عبر الرابط:

{{setup_url}}

الرابط صالح لمدة محدودة.'),

('student.new_lesson_published', 'student', 'درس جديد في كورس',
 'يُرسل للطلاب المسجلين عند نشر درس جديد',
 'درس جديد في {{course_title}}',
 'مرحباً {{student_name}}،

تم إضافة درس جديد "{{lesson_title}}" في كورس "{{course_title}}".

شاهد الدرس الآن:
{{lesson_url}}',
 '["student_name", "course_title", "lesson_title", "lesson_url"]'::jsonb,
 'درس جديد في {{course_title}}',
 'مرحباً {{student_name}}،

تم إضافة درس جديد "{{lesson_title}}" في كورس "{{course_title}}".

شاهد الدرس الآن:
{{lesson_url}}'),

-- Auth
('auth.signup_confirmation', 'auth', 'تأكيد البريد الإلكتروني',
 'يُرسل عند التسجيل لتأكيد البريد',
 'تأكيد بريدك الإلكتروني',
 'استخدم الرمز التالي لتأكيد بريدك:

{{token}}

هذا الرمز صالح لمدة محدودة.',
 '["token", "confirmation_url"]'::jsonb,
 'تأكيد بريدك الإلكتروني',
 'استخدم الرمز التالي لتأكيد بريدك:

{{token}}

هذا الرمز صالح لمدة محدودة.'),

('auth.password_recovery', 'auth', 'إعادة تعيين كلمة السر',
 'يُرسل عند طلب استعادة كلمة السر',
 'إعادة تعيين كلمة المرور',
 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.

انقر على الرابط التالي لاختيار كلمة سر جديدة:

{{confirmation_url}}

إذا لم تطلب ذلك، تجاهل هذا البريد.',
 '["confirmation_url"]'::jsonb,
 'إعادة تعيين كلمة المرور',
 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.

انقر على الرابط التالي لاختيار كلمة سر جديدة:

{{confirmation_url}}

إذا لم تطلب ذلك، تجاهل هذا البريد.'),

('auth.email_change', 'auth', 'تغيير البريد الإلكتروني',
 'يُرسل لتأكيد تغيير البريد',
 'تأكيد تغيير البريد',
 'طلبت تغيير بريدك من {{email}} إلى {{new_email}}.

أكّد التغيير عبر:
{{confirmation_url}}',
 '["email", "new_email", "confirmation_url"]'::jsonb,
 'تأكيد تغيير البريد',
 'طلبت تغيير بريدك من {{email}} إلى {{new_email}}.

أكّد التغيير عبر:
{{confirmation_url}}');
