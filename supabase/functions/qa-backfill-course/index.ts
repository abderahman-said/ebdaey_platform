// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { course_id, auto } = await req.json();
    if (!course_id) throw new Error("course_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: course } = await supabase
      .from("courses")
      .select("id, tenant_id, qa_bot_enabled, tenants!inner(owner_id)")
      .eq("id", course_id)
      .single();

    if (!course) throw new Error("Course not found");

    if (auto) {
      // Internal-only path (DB triggers / cron): must present the service-role key.
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const internalKey = req.headers.get("x-internal-service-key");
      if (token !== serviceRoleKey && internalKey !== serviceRoleKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!course.qa_bot_enabled) throw new Error("Bot disabled");
    } else {
      if (!authHeader) throw new Error("Unauthorized");
      const userClient = createClient(supabaseUrl, serviceRoleKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user || (course as any).tenants.owner_id !== user.id) throw new Error("Forbidden");
    }


    if (!course.qa_bot_enabled) {
      throw new Error("Forbidden");
    }

    // Get all lessons for this course
    const { data: sections } = await supabase
      .from("course_sections")
      .select("id")
      .eq("course_id", course_id);
    const sectionIds = (sections || []).map((s) => s.id);

    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, content_type, video_url, audio_url, text_content")
      .in("section_id", sectionIds);

    const { data: existingTranscripts } = await supabase
      .from("lesson_transcripts")
      .select("lesson_id, status")
      .eq("course_id", course_id);
    const completedTranscripts = new Set(
      (existingTranscripts || [])
        .filter((t: any) => t.status === "done")
        .map((t: any) => t.lesson_id)
    );

    const base = `${supabaseUrl}/functions/v1`;
    const svcAuth = `Bearer ${serviceRoleKey}`;

    const tasks: Promise<any>[] = [];
    const pendingTranscriptRows: any[] = [];
    for (const l of lessons || []) {
      const hasMedia = l.video_url || l.audio_url;
      const isVideoLike = l.content_type === "video" || l.content_type === "audio";
      if (hasMedia && isVideoLike) {
        if (!completedTranscripts.has(l.id)) {
          pendingTranscriptRows.push({
            lesson_id: l.id,
            course_id,
            tenant_id: course.tenant_id,
            status: "pending",
            provider: "groq-whisper",
            error: null,
          });
        }
      } else {
        // Index text only
        tasks.push(fetch(`${base}/qa-index-lesson`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: svcAuth },
          body: JSON.stringify({ lesson_id: l.id }),
        }).catch((e) => console.warn("index trigger:", e)));
      }
    }
    if (pendingTranscriptRows.length > 0) {
      const { error: queueErr } = await supabase
        .from("lesson_transcripts")
        .upsert(pendingTranscriptRows, { onConflict: "lesson_id" });
      if (queueErr) throw queueErr;
      tasks.push(fetch(`${base}/qa-transcribe-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: svcAuth },
        body: JSON.stringify({ course_id, queued: true }),
      }).catch((e) => console.warn("transcribe queue trigger:", e)));
    }
    const processing = Promise.allSettled(tasks).then((results) => {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) console.warn(`qa-backfill-course: ${failed} lesson tasks failed to start`);
    });
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processing);
    } else {
      await processing;
    }

    return new Response(JSON.stringify({ ok: true, queued: tasks.length, videos_queued: pendingTranscriptRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("qa-backfill-course:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
