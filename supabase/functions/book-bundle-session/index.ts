import { createClient } from "npm:@supabase/supabase-js@2";
import { createZoomMeetingForTenant } from "../_shared/zoom.ts";
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

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { live_course_id, booking_date, booking_time } = body ?? {};
    if (typeof live_course_id !== "string" || !isDate(booking_date) || !isTime(booking_time)) {
      return json({ error: "missing_fields" }, 400);
    }

  const limited = await rateLimitGuard(req, { name: "book-bundle-session", max: 30, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;

    const time = String(booking_time).slice(0, 5);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: course } = await supabase
      .from("live_courses")
      .select("id, title, slug, tenant_id, product_type, session_duration_minutes, attendance_type, sessions_count, min_lead_hours, buffer_slots, booking_start_date, booking_end_date, booking_window_days")
      .eq("id", live_course_id).maybeSingle();
    if (!course || (course as any).product_type !== "session_bundle") {
      return json({ error: "not_bundle" }, 400);
    }
    const c: any = course;
    const tenant_id = c.tenant_id;

    const { data: student } = await supabase
      .from("students").select("id, full_name, email")
      .eq("user_id", user.id).eq("tenant_id", tenant_id).maybeSingle();
    if (!student) return json({ error: "not_entitled" }, 403);

    // A student may own several bundles of the same product — use the first one
    // that still has sessions left.
    const { data: purchases } = await supabase
      .from("live_course_purchases")
      .select("id, created_at")
      .eq("student_id", (student as any).id)
      .eq("live_course_id", live_course_id)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: true });
    if (!purchases || purchases.length === 0) return json({ error: "not_entitled" }, 403);


    // Booking policy checks (server-side)
    const startMs = new Date(`${booking_date}T${time}:00`).getTime();
    if (!Number.isFinite(startMs)) return json({ error: "missing_fields" }, 400);
    const leadMs = (c.min_lead_hours || 0) * 3600 * 1000;
    if (startMs < Date.now() + leadMs) return json({ error: "too_soon" }, 200);
    if (c.booking_start_date && booking_date < c.booking_start_date) return json({ error: "outside_window" }, 200);
    if (c.booking_end_date && booking_date > c.booking_end_date) return json({ error: "outside_window" }, 200);
    if (c.booking_window_days) {
      const limit = Date.now() + c.booking_window_days * 86400000;
      if (startMs > limit) return json({ error: "outside_window" }, 200);
    }

    // Remaining sessions across the student's bundles of this product
    const total = c.sessions_count || 1;
    const duration = c.session_duration_minutes || 30;
    const purchaseIds = (purchases as any[]).map((p) => p.id);
    const { data: mineAll } = await supabase
      .from("consultation_bookings")
      .select("id, session_index, purchase_id")
      .in("purchase_id", purchaseIds)
      .neq("status", "cancelled");
    const byPurchase = new Map<string, any[]>();
    for (const id of purchaseIds) byPurchase.set(id, []);
    for (const b of ((mineAll as any[]) || [])) {
      byPurchase.get(b.purchase_id)?.push(b);
    }
    const target = purchaseIds.find((id) => (byPurchase.get(id) || []).length < total);
    if (!target) return json({ error: "no_sessions_left" }, 200);
    const purchaseId = target;
    const used = byPurchase.get(purchaseId) || [];
    const nextIndex = Math.max(0, ...used.map((b: any) => b.session_index || 0)) + 1;

    // Slot conflict across ALL of this mentor's bookings (any product / student),
    // respecting the configured buffer around each appointment.
    const buffer = Math.max(0, Number(c.buffer_slots) || 0);
    const padMs = buffer * duration * 60000;
    const newStart = startMs;
    const newEnd = startMs + duration * 60000;
    const dayBefore = new Date(startMs - 86400000).toISOString().slice(0, 10);
    const dayAfter = new Date(startMs + 86400000).toISOString().slice(0, 10);
    const { data: sameDay } = await supabase
      .from("consultation_bookings")
      .select("id, booking_date, booking_time, duration_minutes")
      .eq("tenant_id", tenant_id)
      .gte("booking_date", dayBefore)
      .lte("booking_date", dayAfter)
      .neq("status", "cancelled");
    const clash = ((sameDay as any[]) || []).some((b) => {
      const s = new Date(`${b.booking_date}T${String(b.booking_time).slice(0, 5)}:00`).getTime();
      if (!Number.isFinite(s)) return false;
      const e = s + (b.duration_minutes || duration) * 60000;
      return newStart < e + padMs && s < newEnd + padMs;
    });
    if (clash) return json({ error: "slot_taken" }, 200);


    let meeting_link: string | null = null;
    let zoom_meeting_id: string | null = null;
    let zoom_start_url: string | null = null;

    if (c.attendance_type === "zoom") {
      try {
        const meeting = await createZoomMeetingForTenant(supabase, tenant_id, {
          topic: `${c.title} — ${(student as any).full_name || (student as any).email}`,
          startDateTimeISO: `${booking_date}T${time}`,
          durationMinutes: duration,
        });
        if (meeting.ok) {
          meeting_link = meeting.meeting.join_url;
          zoom_meeting_id = meeting.meeting.meeting_id;
          zoom_start_url = meeting.meeting.start_url;
        } else {
          console.error("zoom create failed:", meeting.code, meeting.message);
        }
      } catch (e) {
        console.error("zoom create failed:", e);
      }
    }

    const { data: newBooking, error: bookErr } = await supabase.from("consultation_bookings").insert({
      live_course_id, tenant_id, student_id: (student as any).id,
      purchase_id: purchaseId,
      booking_date, booking_time: time,
      duration_minutes: duration,
      session_index: nextIndex,
      status: "scheduled",
      meeting_link, zoom_meeting_id, zoom_start_url,
    }).select("id").maybeSingle();

    if (bookErr) {
      const msg = String(bookErr.message || "");
      if (msg.toLowerCase().includes("duplicate")) return json({ error: "slot_taken" }, 200);
      return json({ error: "booking_failed", detail: msg }, 500);
    }

    if (newBooking?.id) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-service-key": serviceKey },
          body: JSON.stringify({ kind: "booking_created", bookingId: newBooking.id }),
        });
        console.log("gcal sync result:", response.status, await response.text());
      } catch (e) { console.error("gcal sync failed:", e); }
    }

    const { data: tn } = await supabase.from("tenants")
      .select("slug, name, first_name, public_language, dashboard_language")
      .eq("id", tenant_id).maybeSingle();
    const isEnDash = (tn as any)?.dashboard_language === "en";

    await supabase.from("notifications").insert({
      tenant_id, icon_name: "CalendarCheck",
      title: isEnDash ? "New session booked 📅" : "تم حجز جلسة جديدة 📅",
      description: isEnDash
        ? `A session of "${c.title}" was booked (${booking_date} ${time}).`
        : `تم حجز جلسة من "${c.title}" بتاريخ ${booking_date} ${time}.`,
    });

    // Booking confirmation email to the student
    const isEnPub = (tn as any)?.public_language === "en";
    const studentEmail = (student as any).email;
    if (studentEmail) {
      const bookingUrl = `https://ebdaey.com/${(tn as any)?.slug || ""}/l/${c.slug}/booking`;
      const when = `${booking_date} ${time}`;
      const remainingAfter = Math.max(0, total - (used.length + 1));
      const note = isEnPub
        ? `Your session is scheduled on ${when}.${
          c.attendance_type !== "in_person" ? " You will receive the meeting link one hour before the appointment." : ""
        }${remainingAfter > 0 ? ` Sessions left in your bundle: ${remainingAfter}.` : ""}`
        : `موعد جلستك ${when}.${
          c.attendance_type !== "in_person" ? " ستستقبل رابط اللقاء قبل ساعة من الموعد." : ""
        }${remainingAfter > 0 ? ` الجلسات المتبقية في باقتك: ${remainingAfter}.` : ""}`;
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            templateKey: "student.purchase_confirmation",
            to: studentEmail,
            variables: {
              student_name: (student as any).full_name || "",
              mentor_name: (tn as any)?.name || (tn as any)?.first_name || "",
              product_title: `${c.title} — ${isEnPub ? "session" : "جلسة"} ${nextIndex}`,
              amount: 0,
              order_id: purchaseId,
              access_url: bookingUrl,
              extra_note: note,
            },
            idempotencyKey: `bundle-booking-${newBooking?.id}`,
            tenant_id,
          }),
        });
      } catch (e) { console.error("booking confirmation email failed", e); }
    }



    // If the appointment starts within the hour, deliver the join link now
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-consultation-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ purchaseId }),
      });
    } catch (e) { console.error("immediate reminder failed", e); }

    return json({
      success: true,
      booking_id: newBooking?.id,
      session_index: nextIndex,
      remaining: Math.max(0, total - (used.length + 1)),
    });
  } catch (error) {
    console.error("book-bundle-session error:", error);
    return json({ error: error instanceof Error ? error.message : "unknown" }, 500);
  }
});
