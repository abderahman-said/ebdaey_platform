
-- Add new columns to lessons for new content types
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS text_content text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS embed_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS download_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS download_filename text DEFAULT NULL;

-- Quiz tables
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  pass_percentage integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Mentors can manage own quizzes" ON public.quizzes FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can manage all quizzes" ON public.quizzes FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students can view quizzes" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = quizzes.course_id AND e.student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()))
);

-- Quiz questions policies
CREATE POLICY "Mentors can manage own quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND q.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Admins can manage all quiz questions" ON public.quiz_questions FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students can view quiz questions" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes q JOIN enrollments e ON e.course_id = q.course_id WHERE q.id = quiz_questions.quiz_id AND e.student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()))
);

-- Quiz options policies
CREATE POLICY "Mentors can manage own quiz options" ON public.quiz_options FOR ALL USING (
  EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE qq.id = quiz_options.question_id AND q.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Admins can manage all quiz options" ON public.quiz_options FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled students can view quiz options" ON public.quiz_options FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id JOIN enrollments e ON e.course_id = q.course_id WHERE qq.id = quiz_options.question_id AND e.student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid()))
);

-- Quiz attempts policies
CREATE POLICY "Students can manage own attempts" ON public.quiz_attempts FOR ALL USING (
  student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid())
);
CREATE POLICY "Mentors can view tenant attempts" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_attempts.quiz_id AND q.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Admins can manage all attempts" ON public.quiz_attempts FOR ALL USING (has_role(auth.uid(), 'admin'));
