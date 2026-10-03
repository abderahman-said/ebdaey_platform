import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createZoomMeetingForTenant } from "../_shared/zoom.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "book-gift-consultation", max: 30, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { live_course_id, booking_date, booking_time } = await req.json();
    if (!live_course_id || !booking_date || !booking_time) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load course
    const { data: course } = await supabase
      .from("live_courses")
      .select("id, title, tenant_id, product_type, session_duration_minutes, attendance_type")
      .eq("id", live_course_id).maybeSingle();
    if (!course || (course as any).product_type !== "consultation") {
      return new Response(JSON.stringify({ error: "not_consultation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenant_id = (course as any).tenant_id;

    // Find student for this user in this tenant
    const { data: student } = await supabase
      .from("students").select("id, full_name, email")
      .eq("user_id", user.id).eq("tenant_id", tenant_id).maybeSingle();
    if (!student) {
      return new Response(JSON.stringify({ error: "not_entitled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must have a completed purchase (gift or paid) with no booking yet
    const { data: purchase } = await supabase
      .from("live_course_purchases")
      .select("id, booking_date, booking_time")
      .eq("student_id", (student as any).id)
      .eq("live_course_id", live_course_id)
      .eq("payment_status", "completed")
      .maybeSingle();
    if (!purchase) {
      return new Response(JSON.stringify({ error: "not_entitled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Existing booking already?
    const { data: existingBooking } = await supabase
      .from("consultation_bookings")
      .select("id")
      .eq("purchase_id", (purchase as any).id)
      .maybeSingle();
    if (existingBooking) {
      return new Response(JSON.stringify({ error: "already_booked", booking_id: (existingBooking as any).id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Slot conflict?
    const { data: clash } = await supabase
      .from("consultation_bookings")
      .select("id")
      .eq("live_course_id", live_course_id)
      .eq("booking_date", booking_date)
      .eq("booking_time", booking_time)
      .in("status", ["scheduled", "confirmed"])
      .maybeSingle();
    if (clash) {
      return new Response(JSON.stringify({ error: "slot_taken" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const duration = (course as any).session_duration_minutes || 30;
    let meeting_link: string | null = null;
    let zoom_meeting_id: string | null = null;
    let zoom_start_url: string | null = null;

    if ((course as any).attendance_type === "zoom") {
      try {
        const meeting = await createZoomMeetingForTenant(supabase, tenant_id, {
          topic: `${(course as any).title} — ${(student as any).full_name || (student as any).email}`,
          startDateTimeISO: `${booking_date}T${booking_time}`,
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
      purchase_id: (purchase as any).id,
      booking_date, booking_time,
      duration_minutes: duration,
      status: "scheduled",
      meeting_link, zoom_meeting_id, zoom_start_url,
    }).select("id").maybeSingle();

    if (bookErr) {
      return new Response(JSON.stringify({ error: "booking_failed", detail: bookErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update purchase with booking snapshot
    await supabase.from("live_course_purchases")
      .update({ booking_date, booking_time })
      .eq("id", (purchase as any).id);

    // Fire-and-forget google calendar sync
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

    // In-app notification for mentor
    await supabase.from("notifications").insert({
      tenant_id, icon_name: "Video",
      title: "تم حجز استشارة هدية 🎁",
      description: `تم تأكيد حجز "${(course as any).title || "الاستشارة"}".`,
    });

    // Send confirmation email to student (booking details) + mentor/student templates
    const purchaseId = (purchase as any).id;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-live-course-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ purchaseId, idempotencyKey: `gift-lc-confirm-${purchaseId}` }),
      });
    } catch (e) { console.error("Live email error:", e); }

    // If the booked appointment starts in less than an hour, send the join link now
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-consultation-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ purchaseId }),
      });
    } catch (e) { console.error("immediate reminder failed", e); }

    try {
      const { data: tn } = await supabase.from("tenants")
        .select("slug, name, email, first_name, public_language, dashboard_language").eq("id", tenant_id).maybeSingle();
      const mentorEmail = (tn as any)?.email;
      const mentorName = (tn as any)?.first_name || (tn as any)?.name || "";
      const isOnline = (course as any)?.attendance_type !== "in_person";
      const noteAr = "ستقوم باستقبال رابط اللقاء قبل ساعة من الموعد.";
      const noteEn = "You will receive the meeting link one hour before the appointment.";
      const studentNote = isOnline ? ((tn as any)?.public_language === "en" ? noteEn : noteAr) : "";
      const mentorNote = isOnline ? ((tn as any)?.dashboard_language === "en" ? noteEn : noteAr) : "";
      const send = (templateKey: string, to: string, variables: Record<string, any>, idempotencyKey: string) =>
        fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id: (course as any).tenant_id }),
        }).catch((e) => console.error(`notify ${templateKey} failed`, e));
      if (mentorEmail) {
        await send("mentor.new_order", mentorEmail, {
          mentor_name: mentorName,
          student_name: (student as any).full_name || "",
          student_email: (student as any).email || "",
          product_title: (course as any).title || "",
          amount: 0,
          dashboard_url: `https://ebdaey.com/app/dashboard`,
          extra_note: mentorNote,
        }, `mentor-new-order-gift-${newBooking?.id}`);
      }
      if ((student as any).email) {
        await send("student.purchase_confirmation", (student as any).email, {
          student_name: (student as any).full_name || "",
          mentor_name: mentorName,
          product_title: (course as any).title || "",
          amount: 0,
          order_id: purchaseId,
          access_url: `https://ebdaey.com/${(tn as any)?.slug || ""}`,
          extra_note: studentNote,
        }, `student-purchase-gift-${newBooking?.id}`);
      }
    } catch (e) { console.error("notify emails failed", e); }


    return new Response(JSON.stringify({ success: true, booking_id: newBooking?.id, meeting_link }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("book-gift-consultation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
