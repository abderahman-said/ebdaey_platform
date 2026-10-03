---
name: AI Course Q&A Bot
description: Per-course RAG chatbot grounded only in course content. Whisper transcripts + Lovable AI embeddings/chat.
type: feature
---

Per-course AI assistant available in lesson viewer (floating chat). Grounded ONLY in:
- Lesson text content (TipTap HTML stripped + chunked)
- Video/audio transcripts via **Groq Whisper** (`whisper-large-v3-turbo`, Arabic)

**Stack:**
- Transcription: Groq Whisper API (`GROQ_API_KEY` secret). Fetches Bunny CDN `play_240p.mp4` (low res for size). 24MB hard cap.
- Embeddings: Lovable AI Gateway `google/gemini-embedding-001`, 768 dims.
- Chat: Lovable AI `google/gemini-3-flash-preview` with strict grounding system prompt.
- Vector store: `pgvector` HNSW on `course_qa_chunks.embedding`.
- RPC: `match_course_chunks(_course_id, _query_embedding, _match_count)` scoped by course.

**Tables:** `lesson_transcripts`, `course_qa_chunks`, `course_qa_conversations`, `course_qa_messages`, `course_qa_usage`. All RLS scoped by tenant (mentor) + student.

**Edge functions:**
- `qa-transcribe-lesson` — pulls Bunny MP4 → Groq → stores transcript + segments → triggers indexing.
- `qa-index-lesson` — chunks (800 char) text + transcript segments → embeds → upserts chunks.
- `qa-backfill-course` — auth: course owner only. Fan-out to transcribe/index all lessons.
- `qa-ask` — auth: enrolled student. Verifies `qa_bot_enabled`, daily limit 20/student/course, vector search, calls AI, saves messages.

**Gating:** `courses.qa_bot_enabled` (mentor toggle in CourseEditor "المساعد الذكي" tab). `subscription_plans.qa_bot_enabled` flag exists for future plan-based gating.

**UI:**
- Mentor: `QABotSettings` component — toggle + lesson indexing status table + retry buttons.
- Student: `StudentQAChat` floating button + chat panel (RTL), lesson reference chips clickable to navigate.

**Limits:** Daily 20 questions/student/course server-enforced via `course_qa_usage`. Video files >24MB rejected.
