// Internal sync function — invoked from webhooks and mentor UI after
// consultation_bookings / live_course_sessions are created/updated.
// Requires service-role key (verify_jwt=false and validates a shared secret in body).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createEvent,
  deleteEvent,
  getGcalAccount,
  updateEvent,
} from "../_shared/gcal.ts";
import { requireRole } from "../_shared/require-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { kind: "booking_created"; bookingId: string }
  | { kind: "booking_cancelled"; bookingId: string }
  | { kind: "session_created"; sessionId: string }
  | { kind: "session_updated"; sessionId: string }
  | { kind: "session_deleted"; sessionId: string; tenantId: string; googleEventId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Internal callers authenticate with a server-only header because
    // functions.invoke may replace the Authorization token at the gateway.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isInternal = Boolean(serviceKey) &&
      req.headers.get("x-internal-service-key") === serviceKey;
    const auth = isInternal
      ? { ok: true, status: 200, user: { id: "service_role" } }
      : await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

    const isService = auth.user?.id === "service_role";
    let callerTenantId: string | null = null;
    let isAdmin = false;
    if (!isService) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", auth.user!.id);
      isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
      const { data: tn } = await supabase
        .from("tenants").select("id").eq("owner_id", auth.user!.id).maybeSingle();
      callerTenantId = (tn as any)?.id ?? null;
    }
    const mayTouchTenant = (tenantId: string | null | undefined) =>
      isService || isAdmin || (!!tenantId && tenantId === callerTenantId);

    const action = (await req.json()) as Action;

    if (action.kind === "booking_created" || action.kind === "booking_cancelled") {
      const { data: booking, error: bookingErr } = await supabase
        .from("consultation_bookings")
        .select(`id, tenant_id, live_course_id, student_id, booking_date, booking_time,
                 duration_minutes, meeting_link, google_event_id, status,
                 live_courses:live_course_id(title)`)
        .eq("id", action.bookingId)
        .maybeSingle();
      if (bookingErr) console.error("[gcal-sync] booking query error:", bookingErr.message);
      if (!booking) return json({ ok: false, reason: "booking_not_found", detail: bookingErr?.message });
      console.log(`[gcal-sync] ${action.kind} booking=${action.bookingId} tenant=${(booking as any).tenant_id}`);
      if (!mayTouchTenant((booking as any).tenant_id)) return json({ ok: false, error: "Forbidden" }, 403);

      const account = await getGcalAccount(supabase, (booking as any).tenant_id);
      if (!account) return json({ ok: true, skipped: "no_gcal_connected" });

      if (action.kind === "booking_cancelled" && (booking as any).google_event_id) {
        await deleteEvent(account, (booking as any).google_event_id);
        await supabase
          .from("consultation_bookings")
          .update({ google_event_id: null })
          .eq("id", (booking as any).id);
        return json({ ok: true, deleted: true });
      }

      const title = (booking as any).live_courses?.title || "استشارة";
      const { data: student } = await supabase
        .from("students").select("full_name, email")
        .eq("id", (booking as any).student_id).maybeSingle();
      const { data: tenant } = await supabase
        .from("tenants").select("public_language")
        .eq("id", (booking as any).tenant_id).maybeSingle();
      const isEnglish = tenant?.public_language === "en";
      const attendees = student?.email ? [{ email: student.email, displayName: student.full_name }] : [];
      const eventInput = {
        summary: isEnglish
          ? `Consultation: ${title} — ${student?.full_name ?? ""}`.trim()
          : `استشارة: ${title} — ${student?.full_name ?? ""}`.trim(),
        description: isEnglish
          ? `Consultation booked through Ebdaey.\nStudent: ${student?.full_name ?? "-"}\nDuration: ${(booking as any).duration_minutes} minutes`
          : `حجز استشارة عبر منصة إبدأي.\nالطالب: ${student?.full_name ?? "-"}\nالمدة: ${(booking as any).duration_minutes} دقيقة`,
        date: (booking as any).booking_date,
        time: (booking as any).booking_time,
        durationMinutes: (booking as any).duration_minutes,
        attendees,
        meetingLink: (booking as any).meeting_link,
      };

      if ((booking as any).google_event_id) {
        await updateEvent(account, (booking as any).google_event_id, eventInput);
        return json({ ok: true, updated: true });
      }

      const created = await createEvent(account, eventInput);
      if (!created) return json({ ok: false, reason: "gcal_error" });

      await supabase
        .from("consultation_bookings")
        .update({ google_event_id: created.id })
        .eq("id", (booking as any).id);
      return json({ ok: true, eventId: created.id });
    }

    if (action.kind === "session_created" || action.kind === "session_updated") {
      const { data: session } = await supabase
        .from("live_course_sessions")
        .select(`id, tenant_id, live_course_id, title, session_date, session_time,
                 duration_minutes, google_event_id,
                 live_courses:live_course_id(title, attendance_type)`)
        .eq("id", action.sessionId)
        .maybeSingle();
      if (!session) return json({ ok: false, reason: "session_not_found" });
      if (!mayTouchTenant((session as any).tenant_id)) return json({ ok: false, error: "Forbidden" }, 403);

      const account = await getGcalAccount(supabase, (session as any).tenant_id);
      if (!account) return json({ ok: true, skipped: "no_gcal_connected" });

      const courseTitle = (session as any).live_courses?.title || "";
      const { data: tenant } = await supabase
        .from("tenants").select("public_language")
        .eq("id", (session as any).tenant_id).maybeSingle();
      const isEnglish = tenant?.public_language === "en";
      const input = {
        summary: `${courseTitle}: ${(session as any).title}`,
        description: isEnglish
          ? `Live session from "${courseTitle}"`
          : `جلسة لايف من كورس "${courseTitle}"`,
        date: (session as any).session_date,
        time: (session as any).session_time,
        durationMinutes: (session as any).duration_minutes,
      };

      if ((session as any).google_event_id) {
        await updateEvent(account, (session as any).google_event_id, input);
        return json({ ok: true, updated: true });
      }
      const created = await createEvent(account, input);
      if (!created) return json({ ok: false, reason: "gcal_error" });
      await supabase
        .from("live_course_sessions")
        .update({ google_event_id: created.id })
        .eq("id", (session as any).id);
      return json({ ok: true, eventId: created.id });
    }

    if (action.kind === "session_deleted") {
      if (!mayTouchTenant(action.tenantId)) return json({ ok: false, error: "Forbidden" }, 403);
      const account = await getGcalAccount(supabase, action.tenantId);
      if (!account) return json({ ok: true, skipped: "no_gcal_connected" });
      await deleteEvent(account, action.googleEventId);
      return json({ ok: true, deleted: true });
    }

    return json({ ok: false, reason: "unknown_action" }, 400);
  } catch (err) {
    console.error("gcal-sync error:", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
