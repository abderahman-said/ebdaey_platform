
-- Drop Q&A bot tables and related columns
DROP TABLE IF EXISTS public.course_qa_messages CASCADE;
DROP TABLE IF EXISTS public.course_qa_conversations CASCADE;
DROP TABLE IF EXISTS public.course_qa_usage CASCADE;
DROP TABLE IF EXISTS public.course_qa_lesson_index_status CASCADE;
DROP TABLE IF EXISTS public.course_qa_chunks CASCADE;
DROP FUNCTION IF EXISTS public.match_course_qa_chunks(uuid, vector, integer) CASCADE;

ALTER TABLE public.courses DROP COLUMN IF EXISTS qa_bot_enabled;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS qa_bot_enabled;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS membership_plan;
ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS qa_bot_enabled;
