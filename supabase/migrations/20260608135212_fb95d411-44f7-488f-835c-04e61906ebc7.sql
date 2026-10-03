
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add qa_bot_enabled to courses and subscription_plans
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS qa_bot_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS qa_bot_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 1) lesson_transcripts
CREATE TABLE public.lesson_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  transcript_text TEXT,
  segments JSONB,
  language TEXT DEFAULT 'ar',
  provider TEXT NOT NULL DEFAULT 'groq-whisper',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_transcripts TO authenticated;
GRANT ALL ON public.lesson_transcripts TO service_role;
ALTER TABLE public.lesson_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor owns transcripts" ON public.lesson_transcripts
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_lesson_transcripts_course ON public.lesson_transcripts(course_id);
CREATE TRIGGER trg_lesson_transcripts_updated
  BEFORE UPDATE ON public.lesson_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) course_qa_chunks (vector store)
CREATE TABLE public.course_qa_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'text' | 'transcript'
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  start_time NUMERIC, -- seconds, for transcript chunks
  end_time NUMERIC,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_qa_chunks TO authenticated;
GRANT ALL ON public.course_qa_chunks TO service_role;
ALTER TABLE public.course_qa_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor manages own chunks" ON public.course_qa_chunks
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_qa_chunks_course ON public.course_qa_chunks(course_id);
CREATE INDEX idx_qa_chunks_lesson ON public.course_qa_chunks(lesson_id);
CREATE INDEX idx_qa_chunks_embedding ON public.course_qa_chunks USING hnsw (embedding vector_cosine_ops);

-- 3) course_qa_conversations
CREATE TABLE public.course_qa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_qa_conversations TO authenticated;
GRANT ALL ON public.course_qa_conversations TO service_role;
ALTER TABLE public.course_qa_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student sees own conversations" ON public.course_qa_conversations
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE TRIGGER trg_qa_conversations_updated
  BEFORE UPDATE ON public.course_qa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) course_qa_messages
CREATE TABLE public.course_qa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.course_qa_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_qa_messages TO authenticated;
GRANT ALL ON public.course_qa_messages TO service_role;
ALTER TABLE public.course_qa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access msgs via conversation" ON public.course_qa_messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.course_qa_conversations
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
         OR tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.course_qa_conversations
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE INDEX idx_qa_messages_conv ON public.course_qa_messages(conversation_id, created_at);

-- 5) course_qa_usage (daily limit)
CREATE TABLE public.course_qa_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (student_id, course_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_qa_usage TO authenticated;
GRANT ALL ON public.course_qa_usage TO service_role;
ALTER TABLE public.course_qa_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student sees own usage" ON public.course_qa_usage
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- Similarity search function (scoped by course)
CREATE OR REPLACE FUNCTION public.match_course_chunks(
  _course_id UUID,
  _query_embedding vector(768),
  _match_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  chunk_text TEXT,
  source_type TEXT,
  start_time NUMERIC,
  end_time NUMERIC,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.lesson_id, c.chunk_text, c.source_type, c.start_time, c.end_time,
         1 - (c.embedding <=> _query_embedding) AS similarity
  FROM public.course_qa_chunks c
  WHERE c.course_id = _course_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> _query_embedding
  LIMIT _match_count;
$$;
