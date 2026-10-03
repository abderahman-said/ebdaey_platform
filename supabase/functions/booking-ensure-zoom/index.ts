// Guarantees a consultation / bundle-session booking has a meeting link.
// Called by the student booking pages and dashboard so a Zoom link is created
// on demand if it was missing (e.g. Zoom hiccup at booking time), instead of
// waiting for the reminder cron.
import { createClient } from "npm:@supabase/supabase-js@2";
import { ensureBookingZoomMeeting } from "../_shared/zoom.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, reason: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ ok: false, reason: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const bookingId = (body ?? {}).booking_id;
    if (typeof bookingId !== "string" || !UUID.test(bookingId)) {
      return json({ ok: false, reason: "invalid_booking_id" }, 400);
    }

    const limited = await rateLimitGuard(
      req,
      { name: "booking-ensure-zoom", max: 60, windowSeconds: 300, identifier: user.id },
      corsHeaders,
    );
    if (limited) return limited;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: booking } = await admin
      .from("consultation_bookings")
      .select("id, tenant_id, live_course_id, student_id, booking_date, booking_time, duration_minutes, meeting_link, zoom_start_url, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return json({ ok: false, reason: "not_found" }, 404);
    const b: any = booking;
    if (b.status === "cancelled") return json({ ok: true, outcome: "cancelled", join_url: null });

    // Authorization: the booking's student, the tenant owner, or a platform admin.
    const [{ data: student }, { data: tenant }, { data: adminRole }] = await Promise.all([
      admin.from("students").select("id, full_name, email, user_id").eq("id", b.student_id).maybeSingle(),
      admin.from("tenants").select("id, owner_id").eq("id", b.tenant_id).maybeSingle(),
      admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);
    const isStudent = (student as any)?.user_id === user.id;
    const isOwner = (tenant as any)?.owner_id === user.id;
    if (!isStudent && !isOwner && !adminRole) return json({ ok: false, reason: "forbidden" }, 403);

    const { data: course } = await admin
      .from("live_courses")
      .select("title, attendance_type, meeting_link")
      .eq("id", b.live_course_id)
      .maybeSingle();
    if (!course) return json({ ok: false, reason: "course_not_found" }, 404);

    const result = await ensureBookingZoomMeeting(
      admin,
      b,
      course as any,
      (student as any)?.full_name || (student as any)?.email || "",
    );
    if (!result.ok) {
      return json(
        { ok: false, outcome: "failed", code: result.code },
        result.code === "not_connected" ? 409 : 502,
      );
    }
    return json({
      ok: true,
      outcome: result.outcome,
      join_url: result.join_url,
      start_url: isOwner || adminRole ? result.start_url : null,
    });
  } catch (err) {
    console.error("booking-ensure-zoom error:", err);
    return json({ ok: false, reason: "unexpected_error" }, 500);
  }
});
