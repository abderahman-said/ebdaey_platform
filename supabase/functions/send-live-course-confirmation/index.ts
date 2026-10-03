import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import { emailLogoHeader } from "../_shared/email-logo.ts";
import { isServiceCall, escapeHtml } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ebdaey";
const ROOT_DOMAIN = "ebdaey.com";

interface RequestBody { purchaseId: string; idempotencyKey?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isServiceCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { purchaseId, idempotencyKey: requestedIdempotencyKey } = (await req.json()) as RequestBody;
    if (!purchaseId) {
      return new Response(JSON.stringify({ error: "purchaseId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: purchase } = await supabase
      .from("live_course_purchases")
      .select("id, student_id, live_course_id, tenant_id, payment_status")
      .eq("id", purchaseId).single();

    if (!purchase || purchase.payment_status !== "completed") {
      return new Response(JSON.stringify({ error: "Invalid purchase" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: student }, { data: course }, { data: tenant }, { data: sessions }, { data: booking }] = await Promise.all([
      supabase.from("students").select("email, full_name").eq("id", purchase.student_id).single(),
      supabase.from("live_courses").select("*").eq("id", purchase.live_course_id).single(),
      supabase.from("tenants").select("slug, name, public_language").eq("id", purchase.tenant_id).single(),
      supabase.from("live_course_sessions").select("title, session_date, session_time")
        .eq("live_course_id", purchase.live_course_id).order("session_date", { ascending: true }),
      supabase.from("consultation_bookings").select("booking_date, booking_time, duration_minutes, meeting_link")
        .eq("purchase_id", purchaseId).maybeSingle(),
    ]);

    if (!student?.email || !course || !tenant) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEn = (tenant as any).public_language === "en";
    const dir = isEn ? "ltr" : "rtl";
    const lang = isEn ? "en" : "ar";
    const locale = isEn ? "en-US" : "ar-EG";
    const fontFamily = isEn
      ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
      : "Arial,Tahoma,sans-serif";
    const listPad = isEn ? "padding-left:18px" : "padding-right:18px";

    const t = isEn
      ? {
          h1: `Thank you for registering with ${escapeHtml(tenant.name)} 🎉`,
          hello: `Hello ${escapeHtml(student.full_name || "")},`,
          confirmed: `Your registration for the live course <strong>"${escapeHtml(course.title)}"</strong> is confirmed.`,
          attendanceTitle: "Attendance details",
          zoomLinkLabel: "Join link:",
          zoomLater: "You will receive the meeting link one hour before the appointment.",
          locationLabel: "Location:",
          openInMaps: "📍 Open in Google Maps",
          bookingTitle: "📅 Your session appointment",
          bookingDate: "Date:",
          bookingDuration: "Duration:",
          durationUnit: "minutes",
          sessionsTitle: "📅 Sessions schedule",
          cta: "Open student dashboard",
          subject: `Your booking is confirmed: ${course.title}`,
          bundleTitle: "Book your sessions",
          bundleIntro: `Your bundle <strong>"${escapeHtml(course.title)}"</strong> includes <strong>${course.sessions_count || 1}</strong> session(s). Use the link below to pick the date and time of each session.`,
          bundleCta: "Book from here",
        }
      : {
          h1: `شكراً لتسجيلك في ${escapeHtml(tenant.name)} 🎉`,
          hello: `مرحباً ${escapeHtml(student.full_name || "")}،`,
          confirmed: `تم تأكيد حجزك للكورس المباشر <strong>"${escapeHtml(course.title)}"</strong>.`,
          attendanceTitle: "تفاصيل الحضور",
          zoomLinkLabel: "رابط الحضور:",
          zoomLater: "ستقوم باستقبال رابط اللقاء قبل ساعة من الموعد.",
          locationLabel: "المكان:",
          openInMaps: "📍 افتح في خرائط جوجل",
          bookingTitle: "📅 موعد جلستك",
          bookingDate: "التاريخ:",
          bookingDuration: "المدة:",
          durationUnit: "دقيقة",
          sessionsTitle: "📅 جدول المحاضرات",
          cta: "افتح لوحة الطالب",
          subject: `تم تأكيد حجزك: ${course.title}`,
          bundleTitle: "احجز جلساتك",
          bundleIntro: `باقتك <strong>"${escapeHtml(course.title)}"</strong> تتضمن <strong>${course.sessions_count || 1}</strong> جلسة. استخدم الرابط التالي لتحديد موعد كل جلسة.`,
          bundleCta: "احجز من هنا",
        };

    const dashboardUrl = `https://${ROOT_DOMAIN}/${tenant.slug}/dashboard`;
    const isBundle = (course as any).product_type === "session_bundle";
    const bundleBookingUrl = `https://${ROOT_DOMAIN}/${tenant.slug}/l/${course.slug}/booking`;

    let attendanceBlock = "";
    const zoomLink = (booking as any)?.meeting_link || course.meeting_link || null;
    if (course.attendance_type === "zoom" || course.attendance_type === "online") {
      // The join link is emailed one hour before the appointment instead.
      attendanceBlock = `<p style="font-size:14px;margin:8px 0;color:#334155;">${t.zoomLater}</p>`;
    } else if (course.attendance_type === "in_person") {
      attendanceBlock = `
        ${course.location_name ? `<p style="font-size:14px;margin:8px 0;"><strong>${t.locationLabel}</strong> ${escapeHtml(course.location_name)}</p>` : ""}
        ${course.location_directions ? `<p style="font-size:14px;margin:8px 0;color:#475569;">${escapeHtml(course.location_directions)}</p>` : ""}
        ${course.location_map_url ? `<p style="font-size:14px;margin:8px 0;"><a href="${escapeHtml(course.location_map_url)}" style="color:#0f172a;">${t.openInMaps}</a></p>` : ""}
      `;
    }

    const sessionsList = (sessions || []).slice(0, 10).map((s: any) =>
      `<li style="margin:6px 0;">${escapeHtml(s.title)} — ${new Date(`${s.session_date}T${s.session_time}`).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</li>`
    ).join("");

    const customSubject = course.send_post_purchase_email && course.post_purchase_email_subject;
    const customBody = course.send_post_purchase_email && course.post_purchase_email_body;
    const subject = customSubject || t.subject;

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:${fontFamily};color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    ${emailLogoHeader(isEn)}
    <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">${t.h1}</h1>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.hello}</p>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.confirmed}</p>

    ${customBody ? `<div style="font-size:14px;line-height:1.8;color:#334155;background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">${escapeHtml(customBody).replace(/\n/g, "<br>")}</div>` : ""}

    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="font-size:15px;margin:0 0 8px;color:#0f172a;">${t.attendanceTitle}</h3>
      ${attendanceBlock}
    </div>

    ${booking ? `
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="font-size:15px;margin:0 0 8px;color:#065f46;">${t.bookingTitle}</h3>
      <p style="font-size:14px;margin:4px 0;color:#065f46;"><strong>${t.bookingDate}</strong> ${new Date(`${booking.booking_date}T${booking.booking_time}`).toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })}</p>
      <p style="font-size:13px;margin:4px 0;color:#065f46;"><strong>${t.bookingDuration}</strong> ${booking.duration_minutes} ${t.durationUnit}</p>
    </div>` : ""}

    ${isBundle ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="font-size:15px;margin:0 0 8px;color:#1e3a8a;">${(t as any).bundleTitle}</h3>
      <p style="font-size:14px;line-height:1.7;margin:4px 0;color:#1e3a8a;">${(t as any).bundleIntro}</p>
      <div style="text-align:center;margin:16px 0 4px;">
        <a href="${bundleBookingUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block;font-weight:600;">
          ${(t as any).bundleCta}
        </a>
      </div>
    </div>` : ""}

    ${sessionsList ? `
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="font-size:15px;margin:0 0 8px;color:#0f172a;">${t.sessionsTitle}</h3>
      <ul style="margin:0;${listPad};font-size:13px;color:#334155;">${sessionsList}</ul>
    </div>` : ""}

    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;">
        ${t.cta}
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">${SITE_NAME} • ${escapeHtml(tenant.name)}</p>
  </div>
</body></html>`;

    const text = isEn
      ? `Your booking for "${course.title}" is confirmed.\n${isBundle ? `Book your sessions: ${bundleBookingUrl}\n` : ""}Student dashboard: ${dashboardUrl}`
      : `تم تأكيد حجزك في "${course.title}".\n${isBundle ? `احجز جلساتك: ${bundleBookingUrl}\n` : ""}لوحة الطالب: ${dashboardUrl}`;

    const idempotencyKey = requestedIdempotencyKey || `live-course-confirmation-${purchase.id}`;

    try {
      await sendManagedEmail(supabase, {
        to: student.email,
        from: `${tenant.name} <noreply@${FROM_DOMAIN}>`,
        subject, html, text,
        label: "live_course_confirmation",
        idempotencyKey,
      });
    } catch (sendError) {
      console.error("Send failed:", sendError);
      return new Response(JSON.stringify({ error: "Send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live confirm email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
