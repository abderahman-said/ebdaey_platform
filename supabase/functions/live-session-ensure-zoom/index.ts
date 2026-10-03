// Creates the Zoom meeting for a live course session immediately after the
// mentor saves it, instead of waiting for the hour-before reminder cron.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { ensureSessionZoomMeeting } from "../_shared/zoom.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const BodySchema = z.object({ sessionId: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ ok: false, reason: "invalid_session_id" }, 400);
    const { sessionId } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, reason: "server_not_configured" }, 500);
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // Auth: caller must own the tenant of this session
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ ok: false, reason: "unauthorized" }, 401);

    const limited = await rateLimitGuard(
      req,
      { name: "live-session-ensure-zoom", max: 60, windowSeconds: 300, identifier: user.id },
      corsHeaders,
    );
    if (limited) return limited;

    // A save can invoke this function before the newly inserted row is visible
    // to another backend worker. Retry briefly instead of surfacing a misleading
    // route-level 404 in the browser console.
    let session: Record<string, unknown> | null = null;
    let sessionReadError = "";
    for (let attempt = 0; attempt < 3 && !session; attempt += 1) {
      const { data, error } = await admin
        .from("live_course_sessions")
        .select(`id, tenant_id, title, session_date, session_time, duration_minutes,
                 zoom_join_url, zoom_start_url, live_course_id`)
        .eq("id", sessionId)
        .maybeSingle();
      sessionReadError = error?.message || "";
      session = data as Record<string, unknown> | null;
      if (!session && attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (sessionReadError) return json({ ok: false, reason: "session_read_failed", error: sessionReadError }, 500);
    if (!session) return json({ ok: true, skipped: "session_not_visible_yet" });

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, owner_id")
      .eq("id", session.tenant_id)
      .maybeSingle();
    const { data: adminRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isOwner = (tenant as any)?.owner_id === user.id;
    // Students who bought this live course may also trigger the lazy creation,
    // so a missing link never blocks them from joining.
    let isBuyer = false;
    if (!isOwner && !adminRole) {
      const { data: student } = await admin
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", session.tenant_id)
        .maybeSingle();
      if (student) {
        const { data: purchase } = await admin
          .from("live_course_purchases")
          .select("id")
          .eq("student_id", (student as any).id)
          .eq("live_course_id", session.live_course_id)
          .eq("payment_status", "completed")
          .maybeSingle();
        isBuyer = !!purchase;
      }
    }
    if (!tenant || (!isOwner && !adminRole && !isBuyer)) {
      return json({ ok: false, reason: "forbidden" }, 403);
    }

    const { data: courseData, error: courseError } = await admin
      .from("live_courses")
      .select("title, attendance_type, meeting_link")
      .eq("id", session.live_course_id)
      .maybeSingle();
    if (courseError || !courseData) return json({ ok: false, reason: "course_read_failed", error: courseError?.message || "Course not found" }, 500);
    const course = courseData as Record<string, unknown>;
    if (course.meeting_link) {
      return json({ ok: true, outcome: "manual_link" });
    }
    if (course.attendance_type !== "zoom") return json({ ok: true, outcome: "not_zoom" });

    const result = await ensureSessionZoomMeeting(
      admin,
      session as any,
      String(course.title || ""),
    );
    if (!result.ok) {
      await admin.from("live_course_sessions").update({
        zoom_generation_error: `${result.code}: ${result.message}`.slice(0, 1000),
        zoom_generation_attempted_at: new Date().toISOString(),
      }).eq("id", sessionId);
      return json({ ok: false, outcome: "failed", code: result.code, error: result.message }, result.code === "not_connected" ? 409 : 502);
    }
    return json({ ok: true, outcome: result.outcome, join_url: result.join_url });
  } catch (err) {
    console.error("live-session-ensure-zoom error:", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
