// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/gemini-embedding-001";
const CHAT_MODEL = "google/gemini-3-flash-preview";
const DAILY_LIMIT = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "يجب تسجيل الدخول" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "qa-ask", max: 30, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    const { course_id, question } = await req.json();
    if (!course_id || !question?.trim()) throw new Error("course_id & question required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify course & bot enabled
    const { data: course } = await supabase
      .from("courses")
      .select("id, tenant_id, qa_bot_enabled, title")
      .eq("id", course_id)
      .single();
    if (!course) throw new Error("Course not found");
    if (!course.qa_bot_enabled) {
      return new Response(JSON.stringify({ error: "البوت غير مفعّل لهذا الكورس" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get student
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", course.tenant_id)
      .maybeSingle();
    if (!student) throw new Error("Not enrolled");

    // Verify enrollment
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", course_id)
      .maybeSingle();
    if (!enr) {
      return new Response(JSON.stringify({ error: "يجب أن تكون مشتركاً في الكورس" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Daily usage
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("course_qa_usage")
      .select("id, question_count")
      .eq("student_id", student.id)
      .eq("course_id", course_id)
      .eq("day", today)
      .maybeSingle();

    if (usage && usage.question_count >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: `وصلت للحد الأقصى (${DAILY_LIMIT} سؤال يومياً). حاول غداً.`,
        remaining: 0,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Embed question
    const embRes = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({ model: EMBED_MODEL, input: question, dimensions: 768 }),
    });
    if (!embRes.ok) throw new Error(`Embed failed: ${await embRes.text()}`);
    const embData = await embRes.json();
    const queryEmb = embData.data[0].embedding;

    // Vector search
    const { data: matches, error: matchErr } = await supabase.rpc("match_course_chunks", {
      _course_id: course_id,
      _query_embedding: JSON.stringify(queryEmb),
      _match_count: 6,
    });
    if (matchErr) throw matchErr;

    // Get lesson titles for refs
    const lessonIds = [...new Set((matches || []).map((m: any) => m.lesson_id).filter(Boolean))];
    const { data: lessonsInfo } = await supabase
      .from("lessons")
      .select("id, title")
      .in("id", lessonIds.length ? lessonIds : ["00000000-0000-0000-0000-000000000000"]);
    const lessonMap = new Map((lessonsInfo || []).map((l) => [l.id, l.title]));

    const context = (matches || []).map((m: any, i: number) => {
      const title = lessonMap.get(m.lesson_id) || "غير معروف";
      const ts = m.start_time ? ` [دقيقة ${Math.floor(m.start_time / 60)}:${String(Math.floor(m.start_time % 60)).padStart(2, "0")}]` : "";
      return `[مرجع ${i + 1}] الدرس: "${title}"${ts}\n${m.chunk_text}`;
    }).join("\n\n---\n\n");

    // Get/create conversation
    let { data: conv } = await supabase
      .from("course_qa_conversations")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", course_id)
      .maybeSingle();
    if (!conv) {
      const { data: newConv } = await supabase
        .from("course_qa_conversations")
        .insert({ student_id: student.id, course_id, tenant_id: course.tenant_id })
        .select("id")
        .single();
      conv = newConv;
    }

    // History
    const { data: history } = await supabase
      .from("course_qa_messages")
      .select("role, content")
      .eq("conversation_id", conv!.id)
      .order("created_at", { ascending: true })
      .limit(10);

    const systemPrompt = `أنت مساعد ذكي لكورس "${course.title}". 
مهمتك الإجابة على أسئلة الطلاب باستخدام محتوى الكورس فقط الموضح أدناه.

قواعد صارمة:
- استخدم المحتوى المقدم فقط — لا تستخدم معلومات خارجية.
- إذا لم تجد إجابة في المحتوى، قل بوضوح: "هذا السؤال غير مغطى في محتوى الكورس."
- لا تستخدم تنسيق Markdown إطلاقاً (لا نجوم ** ولا شرطات # ولا أقواس). اكتب نصاً عادياً فقط.
- لا تذكر كلمة "مرجع" ولا أرقام المراجع في إجابتك. الدروس المرتبطة ستظهر تلقائياً كأزرار أسفل الإجابة.
- أجب بالعربية بأسلوب واضح ومختصر.

محتوى الكورس:
${context || "(لا يوجد محتوى مفهرس بعد)"}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: question },
    ];

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({ model: CHAT_MODEL, messages, temperature: 0.3 }),
    });
    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "الخدمة مشغولة، حاول بعد لحظات." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "نفدت الرصيد. تواصل مع الإدارة." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) throw new Error(`AI failed: ${await aiRes.text()}`);

    const aiData = await aiRes.json();
    const answer = aiData.choices?.[0]?.message?.content || "لم أتمكن من توليد إجابة.";

    const seenLessons = new Set<string>();
    const refs = (matches || [])
      .filter((m: any) => {
        if (!m.lesson_id || seenLessons.has(m.lesson_id)) return false;
        seenLessons.add(m.lesson_id);
        return true;
      })
      .slice(0, 5)
      .map((m: any) => ({
        lesson_id: m.lesson_id,
        lesson_title: lessonMap.get(m.lesson_id) || "غير معروف",
        start_time: m.start_time,
      }));

    // Save messages
    await supabase.from("course_qa_messages").insert([
      { conversation_id: conv!.id, role: "user", content: question, refs: [] },
      { conversation_id: conv!.id, role: "assistant", content: answer, refs },
    ]);

    // Update usage
    if (usage) {
      await supabase.from("course_qa_usage")
        .update({ question_count: usage.question_count + 1 })
        .eq("id", usage.id);
    } else {
      await supabase.from("course_qa_usage").insert({
        student_id: student.id, course_id, day: today, question_count: 1,
      });
    }

    const remaining = DAILY_LIMIT - ((usage?.question_count || 0) + 1);

    return new Response(JSON.stringify({ answer, refs, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("qa-ask:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
