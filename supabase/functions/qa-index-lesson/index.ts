// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_DIMS = 768;

const stripHtml = (s: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const chunkText = (text: string, size = 800, overlap = 120): string[] => {
  if (!text) return [];
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
};

const chunkSegments = (segments: any[], maxChars = 800): { text: string; start: number; end: number }[] => {
  const out: { text: string; start: number; end: number }[] = [];
  let buf = "";
  let start = 0;
  let end = 0;
  for (const s of segments) {
    if (!buf) start = s.start ?? 0;
    buf += (buf ? " " : "") + (s.text || "").trim();
    end = s.end ?? end;
    if (buf.length >= maxChars) {
      out.push({ text: buf, start, end });
      buf = "";
    }
  }
  if (buf) out.push({ text: buf, start, end });
  return out;
};

async function embedBatch(texts: string[], key: string): Promise<number[][]> {
  // Lovable AI embeddings - call one at a time for safety
  const out: number[][] = [];
  for (const t of texts) {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: t,
        dimensions: EMBED_DIMS,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Embedding failed ${res.status}: ${txt}`);
    }
    const data = await res.json();
    out.push(data.data[0].embedding);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { requireRole, callerOwnsTenant } = await import("../_shared/require-role.ts");
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

    const { lesson_id } = await req.json();
    if (!lesson_id) throw new Error("lesson_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lesson, error: lErr } = await supabase
      .from("lessons")
      .select("id, title, description, text_content, tenant_id, section_id, course_sections!inner(course_id)")
      .eq("id", lesson_id)
      .single();
    if (lErr || !lesson) throw new Error("Lesson not found");

    // Tenant isolation: only the owning mentor, an admin, or internal
    // service-role callers may (re)index this lesson.
    if (!(await callerOwnsTenant(auth.user?.id, lesson.tenant_id))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseId = (lesson as any).course_sections.course_id;


    // Clean old chunks for this lesson
    await supabase.from("course_qa_chunks").delete().eq("lesson_id", lesson_id);

    const rows: any[] = [];

    // Text content
    const textBlob = [lesson.title, lesson.description, stripHtml(lesson.text_content || "")]
      .filter(Boolean).join("\n\n");
    if (textBlob.trim().length > 20) {
      const chunks = chunkText(textBlob);
      const embeddings = await embedBatch(chunks, lovableKey);
      chunks.forEach((c, i) => rows.push({
        course_id: courseId,
        tenant_id: lesson.tenant_id,
        lesson_id,
        source_type: "text",
        chunk_text: c,
        chunk_index: i,
        embedding: JSON.stringify(embeddings[i]),
      }));
    }

    // Transcript
    const { data: tr } = await supabase
      .from("lesson_transcripts")
      .select("transcript_text, segments")
      .eq("lesson_id", lesson_id)
      .maybeSingle();

    if (tr?.transcript_text) {
      const segs = Array.isArray(tr.segments) ? tr.segments : [];
      const transcriptChunks = segs.length > 0
        ? chunkSegments(segs)
        : chunkText(tr.transcript_text).map((t) => ({ text: t, start: 0, end: 0 }));
      const embeddings = await embedBatch(transcriptChunks.map((c) => c.text), lovableKey);
      transcriptChunks.forEach((c, i) => rows.push({
        course_id: courseId,
        tenant_id: lesson.tenant_id,
        lesson_id,
        source_type: "transcript",
        chunk_text: c.text,
        chunk_index: i,
        start_time: c.start,
        end_time: c.end,
        embedding: JSON.stringify(embeddings[i]),
      }));
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("course_qa_chunks").insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, chunks: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("qa-index-lesson:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
