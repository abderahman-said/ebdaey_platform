
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add toggles
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS qa_bot_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS qa_bot_enabled boolean NOT NULL DEFAULT false;

-- ========== course_qa_chunks ==========
CREATE TABLE public.course_qa_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'text',
  chunk_index integer NOT NULL DEFAULT 0,
  chunk_text text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_qa_chunks_course ON public.course_qa_chunks(course_id);
CREATE INDEX idx_course_qa_chunks_lesson ON public.course_qa_chunks(lesson_id);
CREATE INDEX idx_course_qa_chunks_embedding ON public.course_qa_chunks USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.course_qa_chunks TO authenticated;
GRANT ALL ON public.course_qa_chunks TO service_role;
ALTER TABLE public.course_qa_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors view own course chunks" ON public.course_qa_chunks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- ========== course_qa_conversations ==========
CREATE TABLE public.course_qa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
CREATE INDEX idx_qa_conv_course ON public.course_qa_conversations(course_id);
CREATE INDEX idx_qa_conv_student ON public.course_qa_conversations(student_id);

GRANT SELECT, INSERT, UPDATE ON public.course_qa_conversations TO authenticated;
GRANT ALL ON public.course_qa_conversations TO service_role;
ALTER TABLE public.course_qa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own conversations" ON public.course_qa_conversations
  FOR ALL TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Mentors view own course conversations" ON public.course_qa_conversations
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- ========== course_qa_messages ==========
CREATE TABLE public.course_qa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.course_qa_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  references_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_msg_conv ON public.course_qa_messages(conversation_id, created_at);

GRANT SELECT, INSERT ON public.course_qa_messages TO authenticated;
GRANT ALL ON public.course_qa_messages TO service_role;
ALTER TABLE public.course_qa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access messages through conversation" ON public.course_qa_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.course_qa_conversations
    WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
       OR tenant_id = public.get_user_tenant_id(auth.uid())
       OR public.has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Students insert own messages" ON public.course_qa_messages
  FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.course_qa_conversations
    WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  ));

-- ========== course_qa_usage ==========
CREATE TABLE public.course_qa_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  question_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, day)
);
CREATE INDEX idx_qa_usage_lookup ON public.course_qa_usage(student_id, course_id, day);

GRANT SELECT ON public.course_qa_usage TO authenticated;
GRANT ALL ON public.course_qa_usage TO service_role;
ALTER TABLE public.course_qa_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own usage" ON public.course_qa_usage
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ========== course_qa_lesson_index_status ==========
CREATE TABLE public.course_qa_lesson_index_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, source_type)
);
CREATE INDEX idx_qa_status_course ON public.course_qa_lesson_index_status(course_id);

GRANT SELECT ON public.course_qa_lesson_index_status TO authenticated;
GRANT ALL ON public.course_qa_lesson_index_status TO service_role;
ALTER TABLE public.course_qa_lesson_index_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors view own course index status" ON public.course_qa_lesson_index_status
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_qa_conv_updated BEFORE UPDATE ON public.course_qa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qa_usage_updated BEFORE UPDATE ON public.course_qa_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qa_status_updated BEFORE UPDATE ON public.course_qa_lesson_index_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to match chunks scoped to a course
CREATE OR REPLACE FUNCTION public.match_course_qa_chunks(
  _course_id uuid,
  _query_embedding vector(1536),
  _match_count int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  lesson_id uuid,
  chunk_text text,
  source_type text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.lesson_id, c.chunk_text, c.source_type,
         1 - (c.embedding <=> _query_embedding) AS similarity
  FROM public.course_qa_chunks c
  WHERE c.course_id = _course_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> _query_embedding
  LIMIT _match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_course_qa_chunks TO authenticated, service_role;
