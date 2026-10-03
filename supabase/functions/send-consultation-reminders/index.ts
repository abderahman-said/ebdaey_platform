// Reminder emails with the join link, sent ~1 hour before an appointment.
//
// Two modes:
//  1) Cron (no body / empty body): scans consultation bookings AND live course
//     sessions starting in ~1 hour and emails the student(s) + the mentor.
//  2) Immediate ({ purchaseId }): called right after a purchase — if the booked
//     appointment (or the next live session) starts in less than an hour, the
//     join email goes out immediately instead of waiting for the cron window.
//
// Idempotency keys are stable per (appointment, recipient) so a later cron run
// can never duplicate an immediate send.
//
// Student emails follow the mentor's public_language; mentor emails follow the
// mentor's dashboard_language.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import { ensureSessionZoomMeeting, ensureBookingZoomMeeting, hardenZoomMeeting, sanitizeJoinLink } from "../_shared/zoom.ts";
import { emailLogoHeader } from "../_shared/email-logo.ts";
import { isServiceCall, escapeHtml } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ebdaey";

// Catch anything starting from 5 minutes ago up to 75 minutes ahead, so a
// session created late (inside the one-hour window) still gets its link.
const WINDOW_START_MIN = -5;
const WINDOW_END_MIN = 75;

type Lang = "ar" | "en";

// Session/booking date+time are stored as naive local values in the mentor's
// timezone (Africa/Cairo), matching the SQL reminder window which uses
// `AT TIME ZONE 'Africa/Cairo'`. Parse them the same way here.
const TZ = "Africa/Cairo";
const tzOffsetMs = (utcMs: number) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, timeZoneName: "longOffset",
  }).formatToParts(new Date(utcMs));
  const name = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * ((+m[2]) * 60 + (+(m[3] || 0))) * 60_000;
};
const startsAtMs = (date: string, time: string) => {
  const asUtc = Date.parse(`${date}T${time}Z`);
  return asUtc - tzOffsetMs(asUtc);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* cron sends no body */ }

    // Only backend functions (service key) or the scheduler (cron secret) may run this.
    let authorized = isServiceCall(req);
    if (!authorized) {
      const provided = req.headers.get("x-cron-secret") || "";
      if (provided) {
        const { data: row } = await supabase
          .from("internal_cron_secrets").select("secret").eq("name", "reminders").maybeSingle();
        authorized = !!row?.secret && row.secret === provided;
      }
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    if (body?.purchaseId) {
      const sent = await sendImmediateForPurchase(supabase, String(body.purchaseId));
      return json({ ok: true, mode: "immediate", sent }, 200);
    }

    const now = new Date();
    const winStart = new Date(now.getTime() + WINDOW_START_MIN * 60_000).toISOString();
    const winEnd = new Date(now.getTime() + WINDOW_END_MIN * 60_000).toISOString();

    const consult = await processConsultations(supabase, winStart, winEnd);
    const sessions = await processLiveSessions(supabase, winStart, winEnd);

    return json({ ok: true, consultations: consult, liveSessions: sessions }, 200);
  } catch (e) {
    console.error("send-consultation-reminders error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

/* ------------------------------------------------------------------ */
/* Consultations                                                       */
/* ------------------------------------------------------------------ */

async function processConsultations(supabase: any, winStart: string, winEnd: string) {
  const { data: bookings, error } = await supabase.rpc("find_upcoming_consultation_reminders", {
    _win_start: winStart,
    _win_end: winEnd,
  });
  if (error) {
    console.error("consultation rpc error", error);
    return { processed: 0, sent: 0 };
  }

  const list = (bookings || []) as any[];
  let sent = 0;
  for (const b of list) {
    try {
      const ok = await sendConsultationReminder(supabase, b);
      if (ok) sent++;
    } catch (e) {
      console.error("consultation reminder failed", b.id, e);
    }
  }
  return { processed: list.length, sent };
}

async function sendConsultationReminder(supabase: any, b: any): Promise<boolean> {
  const [{ data: student }, { data: course }, { data: tenant }] = await Promise.all([
    supabase.from("students").select("email, full_name").eq("id", b.student_id).single(),
    supabase.from("live_courses")
      .select("title, attendance_type, meeting_link, location_name, location_map_url, location_directions")
      .eq("id", b.live_course_id).single(),
    supabase.from("tenants")
      .select("slug, name, email, first_name, public_language, dashboard_language")
      .eq("id", b.tenant_id).single(),
  ]);
  if (!student?.email || !course || !tenant) return false;

  const mentorName = (tenant as any).first_name || tenant.name || "";
  const mentorEmail = (tenant as any).email;
  const studentLang: Lang = (tenant as any).public_language === "en" ? "en" : "ar";
  const mentorLang: Lang = (tenant as any).dashboard_language === "en" ? "en" : "ar";

  // The Zoom meeting may not exist yet (creation at purchase time can fail, or
  // the mentor connected Zoom afterwards). Create it now so the reminder always
  // carries a real join link.
  let bookingJoin = b.meeting_link || null;
  let bookingStart = b.zoom_start_url || null;
  if (!bookingJoin) {
    const ensured = await ensureBookingZoomMeeting(
      supabase,
      { ...b, live_course_id: b.live_course_id },
      course as any,
      student.full_name || student.email,
    );
    if (ensured.ok) {
      bookingJoin = ensured.join_url;
      bookingStart = ensured.start_url;
    }
  }

  // Meetings created before the host-only settings existed still allow the
  // student to use host tools. Re-apply the settings before every reminder.
  if ((b as any).zoom_meeting_id) {
    const hardened = await hardenZoomMeeting(supabase, b.tenant_id, (b as any).zoom_meeting_id);
    if (!hardened.ok) console.error("booking harden failed", b.id, hardened.code, hardened.message);
  }

  const zoomLink = sanitizeJoinLink(bookingJoin || course.meeting_link || null);

  const base = {
    tenantName: tenant.name,
    courseTitle: course.title,
    mentorName,
    bookingDate: b.booking_date,
    bookingTime: b.booking_time,
    duration: b.duration_minutes,
    attendanceType: course.attendance_type,
    locationName: course.location_name,
    locationDirections: course.location_directions,
    locationMapUrl: course.location_map_url,
    kind: "consultation" as const,
  };

  await enqueue(supabase, {
    to: student.email,
    from: `${tenant.name} <noreply@${FROM_DOMAIN}>`,
    subject: studentLang === "en"
      ? `⏰ Reminder: your session "${course.title}" in 1 hour`
      : `⏰ تذكير: جلستك "${course.title}" خلال ساعة`,
    html: renderHtml({ ...base, lang: studentLang, studentName: student.full_name || "", zoomLink, audience: "student" }),
    text: studentLang === "en"
      ? `Reminder: session "${course.title}" starts in 1 hour.${zoomLink ? `\nJoin link: ${zoomLink}` : ""}`
      : `تذكير: جلسة "${course.title}" تبدأ خلال ساعة.${zoomLink ? `\nرابط الحضور: ${zoomLink}` : ""}`,
    idempotencyKey: `consult-reminder-student-${b.id}`,
    label: "consultation_reminder_student",
  });

  if (mentorEmail) {
    const studentLabel = student.full_name || student.email;
    await enqueue(supabase, {
      to: mentorEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      subject: mentorLang === "en"
        ? `⏰ Reminder: your session with ${studentLabel} in 1 hour`
        : `⏰ تذكير: جلستك مع ${studentLabel} خلال ساعة`,
      html: renderHtml({
        ...base, lang: mentorLang, studentName: studentLabel,
        zoomLink: bookingStart || zoomLink, audience: "mentor",
      }),
      text: mentorLang === "en"
        ? `Reminder: consultation with ${studentLabel} starts in 1 hour.`
        : `تذكير: جلسة استشارة مع ${studentLabel} تبدأ خلال ساعة.`,
      idempotencyKey: `consult-reminder-mentor-${b.id}`,
      label: "consultation_reminder_mentor",
    });

    await supabase.from("notifications").insert({
      tenant_id: b.tenant_id,
      icon_name: "Clock",
      title: mentorLang === "en" ? "Reminder: session in 1 hour ⏰" : "تذكير: جلسة خلال ساعة ⏰",
      description: mentorLang === "en"
        ? `Session "${course.title}" with ${studentLabel} starts in 1 hour.`
        : `جلسة "${course.title}" مع ${studentLabel} تبدأ خلال ساعة.`,
    });
  }

  await supabase.from("consultation_bookings")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", b.id);

  return true;
}

/* ------------------------------------------------------------------ */
/* Live course sessions                                                */
/* ------------------------------------------------------------------ */

async function processLiveSessions(supabase: any, winStart: string, winEnd: string) {
  const { data: sessions, error } = await supabase.rpc("find_upcoming_live_session_reminders", {
    _win_start: winStart,
    _win_end: winEnd,
  });
  if (error) {
    console.error("live session rpc error", error);
    return { processed: 0, sent: 0 };
  }

  const list = (sessions || []) as any[];
  let sent = 0;
  for (const s of list) {
    try {
      const n = await sendSessionReminder(supabase, s, null);
      await supabase.from("live_course_sessions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", s.id);
      sent += n;
    } catch (e) {
      console.error("session reminder failed", s.id, e);
    }
  }
  return { processed: list.length, sent };
}

/**
 * Emails the join link for one live session.
 * `onlyStudentId` restricts the send to a single student (immediate mode);
 * when null, every completed purchaser gets it plus the mentor.
 */
async function sendSessionReminder(
  supabase: any,
  s: any,
  onlyStudentId: string | null,
): Promise<number> {
  const [{ data: course }, { data: tenant }] = await Promise.all([
    supabase.from("live_courses")
      .select("title, attendance_type, meeting_link, location_name, location_map_url, location_directions")
      .eq("id", s.live_course_id).maybeSingle(),
    supabase.from("tenants")
      .select("name, email, first_name, public_language, dashboard_language")
      .eq("id", s.tenant_id).maybeSingle(),
  ]);
  if (!course || !tenant) return 0;

  const mentorName = (tenant as any).first_name || tenant.name || "";
  const mentorEmail = (tenant as any).email;
  const studentLang: Lang = (tenant as any).public_language === "en" ? "en" : "ar";
  const mentorLang: Lang = (tenant as any).dashboard_language === "en" ? "en" : "ar";
  // Live sessions don't get a Zoom meeting at creation time — make sure one
  // exists before we email the join link.
  let sessionJoin = s.zoom_join_url || null;
  let sessionStart = s.zoom_start_url || null;
  if (!sessionJoin && course.attendance_type === "zoom") {
    try {
      const m = await ensureSessionZoomMeeting(supabase, s, course.title);
      if (m.ok) {
        sessionJoin = m.join_url;
        sessionStart = m.start_url;
      } else {
        console.error("session zoom create failed", s.id, m.code, m.message);
      }
    } catch (e) {
      console.error("session zoom create failed", s.id, e);
    }
  }
  if ((s as any).zoom_meeting_id) {
    const hardened = await hardenZoomMeeting(supabase, s.tenant_id, (s as any).zoom_meeting_id);
    if (!hardened.ok) console.error("session harden failed", s.id, hardened.code, hardened.message);
  }

  const joinLink = sanitizeJoinLink(sessionJoin || course.meeting_link || null);

  let studentIds: string[] = [];
  if (onlyStudentId) {
    studentIds = [onlyStudentId];
  } else {
    const { data: purchases } = await supabase
      .from("live_course_purchases")
      .select("student_id")
      .eq("live_course_id", s.live_course_id)
      .eq("payment_status", "completed");
    studentIds = [...new Set((purchases || []).map((p: any) => p.student_id).filter(Boolean))] as string[];
  }
  if (!studentIds.length && !mentorEmail) return 0;

  const { data: students } = studentIds.length
    ? await supabase.from("students").select("id, email, full_name").in("id", studentIds)
    : { data: [] as any[] };

  const base = {
    tenantName: tenant.name,
    courseTitle: `${course.title}${s.title ? ` — ${s.title}` : ""}`,
    mentorName,
    bookingDate: s.session_date,
    bookingTime: s.session_time,
    duration: s.duration_minutes || 60,
    attendanceType: course.attendance_type,
    locationName: course.location_name,
    locationDirections: course.location_directions,
    locationMapUrl: course.location_map_url,
    kind: "session" as const,
  };

  let sent = 0;
  for (const st of (students || []) as any[]) {
    if (!st?.email) continue;
    await enqueue(supabase, {
      to: st.email,
      from: `${tenant.name} <noreply@${FROM_DOMAIN}>`,
      subject: studentLang === "en"
        ? `⏰ Reminder: "${base.courseTitle}" starts in 1 hour`
        : `⏰ تذكير: "${base.courseTitle}" تبدأ خلال ساعة`,
      html: renderHtml({ ...base, lang: studentLang, studentName: st.full_name || "", zoomLink: joinLink, audience: "student" }),
      text: studentLang === "en"
        ? `Reminder: "${base.courseTitle}" starts in 1 hour.${joinLink ? `\nJoin link: ${joinLink}` : ""}`
        : `تذكير: "${base.courseTitle}" تبدأ خلال ساعة.${joinLink ? `\nرابط الحضور: ${joinLink}` : ""}`,
      idempotencyKey: `session-reminder-student-${s.id}-${st.id}`,
      label: "live_session_reminder_student",
    });
    sent++;
  }

  if (mentorEmail && !onlyStudentId) {
    await enqueue(supabase, {
      to: mentorEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      subject: mentorLang === "en"
        ? `⏰ Reminder: "${base.courseTitle}" starts in 1 hour`
        : `⏰ تذكير: "${base.courseTitle}" تبدأ خلال ساعة`,
      html: renderHtml({
        ...base, lang: mentorLang, studentName: "",
        zoomLink: sessionStart || joinLink, audience: "mentor",
      }),
      text: mentorLang === "en"
        ? `Reminder: "${base.courseTitle}" starts in 1 hour.`
        : `تذكير: "${base.courseTitle}" تبدأ خلال ساعة.`,
      idempotencyKey: `session-reminder-mentor-${s.id}`,
      label: "live_session_reminder_mentor",
    });
    sent++;

    await supabase.from("notifications").insert({
      tenant_id: s.tenant_id,
      icon_name: "Clock",
      title: mentorLang === "en" ? "Reminder: session in 1 hour ⏰" : "تذكير: محاضرة خلال ساعة ⏰",
      description: mentorLang === "en"
        ? `"${base.courseTitle}" starts in 1 hour.`
        : `"${base.courseTitle}" تبدأ خلال ساعة.`,
    });
  }

  return sent;
}

/* ------------------------------------------------------------------ */
/* Immediate send after a late purchase                                */
/* ------------------------------------------------------------------ */

async function sendImmediateForPurchase(supabase: any, purchaseId: string): Promise<number> {
  const { data: purchase } = await supabase
    .from("live_course_purchases")
    .select("id, student_id, live_course_id, tenant_id, payment_status")
    .eq("id", purchaseId).maybeSingle();
  if (!purchase || purchase.payment_status !== "completed") return 0;

  const now = Date.now();
  const cutoff = now + 60 * 60_000;
  let sent = 0;

  // Consultation booking tied to this purchase
  const { data: booking } = await supabase
    .from("consultation_bookings")
    .select("id, tenant_id, live_course_id, student_id, booking_date, booking_time, duration_minutes, meeting_link, zoom_meeting_id, zoom_start_url, reminder_sent_at")
    .eq("purchase_id", purchaseId)
    .maybeSingle();

  if (booking && !booking.reminder_sent_at) {
    const startsAt = startsAtMs(booking.booking_date, booking.booking_time);
    if (startsAt > now - 5 * 60_000 && startsAt <= cutoff) {
      const ok = await sendConsultationReminder(supabase, booking);
      if (ok) sent++;
    }
  }

  // Live course sessions starting within the next hour
  const { data: sessions } = await supabase
    .from("live_course_sessions")
    .select("id, tenant_id, live_course_id, title, session_date, session_time, duration_minutes, zoom_meeting_id, zoom_join_url, zoom_start_url")
    .eq("live_course_id", purchase.live_course_id);

  for (const s of (sessions || []) as any[]) {
    const startsAt = startsAtMs(s.session_date, s.session_time);
    if (startsAt > now - 5 * 60_000 && startsAt <= cutoff) {
      sent += await sendSessionReminder(supabase, s, purchase.student_id);
    }
  }

  return sent;
}

/* ------------------------------------------------------------------ */
/* Rendering + queue                                                   */
/* ------------------------------------------------------------------ */

function renderHtml(raw: {
  lang: Lang;
  tenantName: string;
  courseTitle: string;
  mentorName: string;
  studentName: string;
  bookingDate: string;
  bookingTime: string;
  duration: number;
  attendanceType: string;
  locationName?: string | null;
  locationDirections?: string | null;
  locationMapUrl?: string | null;
  zoomLink?: string | null;
  audience: "student" | "mentor";
  kind?: "consultation" | "session";
}): string {
  const o = {
    ...raw,
    tenantName: escapeHtml(raw.tenantName),
    courseTitle: escapeHtml(raw.courseTitle),
    mentorName: escapeHtml(raw.mentorName),
    studentName: escapeHtml(raw.studentName),
    locationName: raw.locationName ? escapeHtml(raw.locationName) : raw.locationName,
    locationDirections: raw.locationDirections ? escapeHtml(raw.locationDirections) : raw.locationDirections,
    locationMapUrl: raw.locationMapUrl ? escapeHtml(raw.locationMapUrl) : raw.locationMapUrl,
    zoomLink: raw.zoomLink ? escapeHtml(raw.zoomLink) : raw.zoomLink,
  };
  const isEn = o.lang === "en";
  const dir = isEn ? "ltr" : "rtl";
  const lang = isEn ? "en" : "ar";
  const locale = isEn ? "en-US" : "ar-EG";
  const fontFamily = isEn
    ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
    : "Arial,Tahoma,sans-serif";
  const isSession = o.kind === "session";

  const startLocal = new Date(`${o.bookingDate}T${o.bookingTime}`).toLocaleString(locale, {
    dateStyle: "full", timeStyle: "short",
  });

  const t = isEn
    ? {
        heading: "Reminder: your session starts in 1 hour ⏰",
        greeting: o.audience === "student" ? `Hello ${o.studentName},` : `Hello ${o.mentorName},`,
        intro: o.audience === "student"
          ? `This is a reminder that "<strong>${o.courseTitle}</strong>" with ${o.mentorName} starts in about an hour.`
          : isSession
            ? `Your session "<strong>${o.courseTitle}</strong>" starts in about an hour.`
            : `You have a consultation session "<strong>${o.courseTitle}</strong>" with <strong>${o.studentName}</strong> in about an hour.`,
        dateLabel: "Time:",
        durationLabel: "Duration:",
        minutes: "minutes",
        attendanceTitle: "Attendance details",
        zoomLabelStudent: "Session link:",
        zoomCtaStudent: "Join session now",
        zoomCtaMentor: "Start session",
        locationLabel: "Location:",
        mapCta: "📍 Open in Google Maps",
        noDetails: "Please contact the mentor for attendance details.",
      }
    : {
        heading: "تذكير: جلستك تبدأ خلال ساعة ⏰",
        greeting: o.audience === "student" ? `مرحباً ${o.studentName}،` : `مرحباً ${o.mentorName}،`,
        intro: o.audience === "student"
          ? `هذا تذكير بأن "<strong>${o.courseTitle}</strong>" مع ${o.mentorName} ستبدأ خلال ساعة تقريباً.`
          : isSession
            ? `محاضرتك "<strong>${o.courseTitle}</strong>" ستبدأ خلال ساعة تقريباً.`
            : `لديك جلسة استشارة "<strong>${o.courseTitle}</strong>" مع الطالب <strong>${o.studentName}</strong> خلال ساعة تقريباً.`,
        dateLabel: "الموعد:",
        durationLabel: "المدة:",
        minutes: "دقيقة",
        attendanceTitle: "تفاصيل الحضور",
        zoomLabelStudent: "رابط اللقاء:",
        zoomCtaStudent: "انضم للجلسة الآن",
        zoomCtaMentor: "ابدأ الجلسة",
        locationLabel: "المكان:",
        mapCta: "📍 افتح في خرائط جوجل",
        noDetails: "تواصل مع المنتور للحصول على تفاصيل الحضور.",
      };

  let attendanceBlock = "";
  if (o.attendanceType !== "in_person" && o.zoomLink) {
    const ctaLabel = o.audience === "mentor" ? t.zoomCtaMentor : t.zoomCtaStudent;
    attendanceBlock = o.audience === "mentor"
      ? `<p style="margin:8px 0;"><a href="${o.zoomLink}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">${ctaLabel}</a></p><p style="font-size:12px;color:#64748b;word-break:break-all;">${o.zoomLink}</p>`
      : `<p style="font-size:15px;margin:8px 0;"><strong>${t.zoomLabelStudent}</strong></p>
         <p style="margin:8px 0;"><a href="${o.zoomLink}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600;">${ctaLabel}</a></p>
         <p style="font-size:12px;color:#64748b;word-break:break-all;">${o.zoomLink}</p>`;
  } else if (o.attendanceType === "in_person") {
    attendanceBlock = `
      ${o.locationName ? `<p style="font-size:14px;margin:8px 0;"><strong>${t.locationLabel}</strong> ${o.locationName}</p>` : ""}
      ${o.locationDirections ? `<p style="font-size:14px;margin:8px 0;color:#475569;">${o.locationDirections}</p>` : ""}
      ${o.locationMapUrl ? `<p style="font-size:14px;margin:8px 0;"><a href="${o.locationMapUrl}" style="color:#0f172a;">${t.mapCta}</a></p>` : ""}`;
  } else {
    attendanceBlock = `<p style="font-size:14px;color:#64748b;">${t.noDetails}</p>`;
  }

  return `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:${fontFamily};color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    ${emailLogoHeader(isEn)}
    <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">${t.heading}</h1>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.greeting}</p>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.intro}</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-size:14px;margin:4px 0;color:#065f46;"><strong>${t.dateLabel}</strong> ${startLocal}</p>
      <p style="font-size:13px;margin:4px 0;color:#065f46;"><strong>${t.durationLabel}</strong> ${o.duration} ${t.minutes}</p>
    </div>
    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:20px 0;">
      <h3 style="font-size:15px;margin:0 0 8px;color:#0f172a;">${t.attendanceTitle}</h3>
      ${attendanceBlock}
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">${SITE_NAME} • ${o.tenantName}</p>
  </div>
</body></html>`;
}

// Sends one reminder through Lovable's managed email API. On a rate limit the
// send is retried once after the wait the API asks for.
async function enqueue(supabase: any, p: {
  to: string; from: string; subject: string; html: string; text: string;
  idempotencyKey: string; label: string;
}) {
  const payload = {
    to: p.to, from: p.from, subject: p.subject, html: p.html, text: p.text,
    label: p.label, idempotencyKey: p.idempotencyKey,
  };

  try {
    await sendManagedEmail(supabase, payload);
  } catch (error) {
    const status = (error as any)?.status;
    if (status === 429) {
      const waitSeconds = (error as any)?.retryAfterSeconds ?? 60;
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      try {
        await sendManagedEmail(supabase, payload);
        return;
      } catch (retryError) {
        console.error("reminder send failed after rate limit", p.label, retryError);
        return;
      }
    }
    console.error("reminder send failed", p.label, error);
  }
}


function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
