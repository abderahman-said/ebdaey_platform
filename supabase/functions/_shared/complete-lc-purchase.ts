import { resolveMentorEmail } from "./mentor-email.ts";
// Shared completion logic for a live_course_purchases row.
// Called from both paymob-webhook (server-to-server) and paymob-return
// (browser redirect fallback) so the fulfillment happens no matter which
// callback fires first — or if only one of them fires.
import { createZoomMeetingForTenant } from "./zoom.ts";
import { grantLiveCourseGifts } from "./grant-gift.ts";
import { grantOrderBump } from "./grant-bump.ts";

async function sendNotification(
  supabaseUrl: string,
  serviceKey: string,
  templateKey: string,
  to: string,
  variables: Record<string, any>,
  idempotencyKey?: string,
  tenantId?: string,
) {
  if (!to) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id: tenantId }),
    });
  } catch (e) {
    console.error(`notify ${templateKey} failed`, e);
  }
}

async function ensureConsultationBooking(
  supabase: any,
  purchase: any,
  purchaseId: string,
  courseInfo: any,
  meta: Record<string, any>,
) {
  const bookingDate = purchase?.booking_date || meta?.booking_date;
  const bookingTime = purchase?.booking_time || meta?.booking_time;
  if (courseInfo?.product_type !== "consultation" || !bookingDate || !bookingTime) return;

  const { data: existing } = await supabase
    .from("consultation_bookings")
    .select("id")
    .eq("purchase_id", purchaseId)
    .maybeSingle();

  if (existing) return;

  const duration = meta?.duration_minutes || courseInfo?.session_duration_minutes || 30;
  let meeting_link: string | null = null;
  let zoom_meeting_id: string | null = null;
  let zoom_start_url: string | null = null;

  if (courseInfo?.attendance_type === "zoom") {
    const startISO = `${bookingDate}T${bookingTime}`;
    const meeting = await createZoomMeetingForTenant(supabase, purchase.tenant_id, {
      topic: `${courseInfo?.title || "Consultation"}`,
      startDateTimeISO: startISO,
      durationMinutes: duration,
    });
    if (meeting.ok) {
      meeting_link = meeting.meeting.join_url;
      zoom_meeting_id = meeting.meeting.meeting_id;
      zoom_start_url = meeting.meeting.start_url;
    } else {
      console.error("zoom create failed:", meeting.code, meeting.message);
    }
  }

  const { data: newBooking } = await supabase.from("consultation_bookings").insert({
    live_course_id: purchase.live_course_id,
    tenant_id: purchase.tenant_id,
    student_id: purchase.student_id,
    purchase_id: purchaseId,
    booking_date: bookingDate,
    booking_time: bookingTime,
    duration_minutes: duration,
    status: "scheduled",
    meeting_link, zoom_meeting_id, zoom_start_url,
  }).select("id").maybeSingle();

  if (newBooking?.id) {
    try {
      const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-service-key": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        },
        body: JSON.stringify({ kind: "booking_created", bookingId: newBooking.id }),
      });
      console.log("gcal sync result:", response.status, await response.text());
    } catch (e) { console.error("gcal sync failed:", e); }
  }
}

/**
 * Complete a live_course_purchases row. Idempotent — safe to call multiple
 * times; the second call will only reconcile a missing consultation booking.
 */
export async function completeLiveCoursePurchase(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  purchaseId: string,
  paymobTxnId: string | null,
  success: boolean,
  meta: Record<string, any> = {},
): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("live_course_purchases").select("*").eq("id", purchaseId).maybeSingle();
  if (!purchase) return false;

  const { data: courseInfo } = await supabase
    .from("live_courses")
    .select("title, slug, product_type, session_duration_minutes, attendance_type")
    .eq("id", purchase.live_course_id)
    .maybeSingle();

  if (purchase.payment_status === "completed") {
    await ensureConsultationBooking(supabase, purchase, purchaseId, courseInfo, meta);
    return true;
  }

  if (!success) {
    await supabase.from("live_course_purchases")
      .update({ payment_status: "failed", kashier_order_id: paymobTxnId || null })
      .eq("id", purchaseId);
    return false;
  }

  await supabase.from("live_course_purchases")
    .update({ payment_status: "completed", kashier_order_id: paymobTxnId || null })
    .eq("id", purchaseId);

  if (purchase.coupon_id) {
    await supabase.rpc("increment_coupon_used_count", { _coupon_id: purchase.coupon_id });
  }

  await grantOrderBump(supabase, purchase, purchase.student_id, purchase.tenant_id, null);
  await grantLiveCourseGifts(supabase, purchase.live_course_id, purchase.student_id, purchase.tenant_id);

  await ensureConsultationBooking(supabase, purchase, purchaseId, courseInfo, meta);

  const isConsultation = courseInfo?.product_type === "consultation";
  const isBundle = (courseInfo as any)?.product_type === "session_bundle";
  await supabase.from("notifications").insert({
    tenant_id: purchase.tenant_id, icon_name: "Video",
    title: isBundle
      ? "تم شراء باقة جلسات جديدة 🎉"
      : isConsultation ? "تم حجز استشارة جديدة 🎉" : "تم حجز كورس مباشر 🎉",
    description: `تم تأكيد حجز "${courseInfo?.title || (isConsultation ? "الاستشارة" : "الكورس")}".`,
  });


  try {
    await fetch(`${supabaseUrl}/functions/v1/send-live-course-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ purchaseId }),
    });
  } catch (e) { console.error("Live email error:", e); }

  const [{ data: st }, mentor, { data: langTn }] = await Promise.all([
    supabase.from("students").select("full_name, email").eq("id", purchase.student_id).maybeSingle(),
    resolveMentorEmail(supabase, purchase.tenant_id),
    supabase.from("tenants").select("public_language, dashboard_language").eq("id", purchase.tenant_id).maybeSingle(),
  ]);
  const mentorEmail = mentor.email;
  const mentorName = mentor.name;

  // Online appointments get their join link one hour before the start time.
  const isOnline = courseInfo?.attendance_type !== "in_person";
  const noteAr = "ستقوم باستقبال رابط اللقاء قبل ساعة من الموعد.";
  const noteEn = "You will receive the meeting link one hour before the appointment.";
  const isEnPub = (langTn as any)?.public_language === "en";
  const bundleNote = isEnPub
    ? "Use the booking link to schedule each session of your bundle."
    : "استخدم رابط الحجز لتحديد مواعيد جلسات باقتك.";
  const studentNote = isBundle ? bundleNote : (isOnline ? (isEnPub ? noteEn : noteAr) : "");
  const mentorNote = isBundle
    ? ((langTn as any)?.dashboard_language === "en"
      ? "The student will schedule the bundle sessions."
      : "سيقوم الطالب بتحديد مواعيد جلسات الباقة.")
    : (isOnline
      ? ((langTn as any)?.dashboard_language === "en" ? noteEn : noteAr) : "");
  const bundleUrl = isBundle && (courseInfo as any)?.slug
    ? `https://ebdaey.com/${mentor.slug}/l/${(courseInfo as any).slug}/booking`
    : null;

  await sendNotification(supabaseUrl, serviceKey, "mentor.new_order", mentorEmail, {
    mentor_name: mentorName,
    student_name: st?.full_name || "",
    student_email: st?.email || "",
    product_title: courseInfo?.title || "",
    amount: purchase.gross_amount || 0,
    dashboard_url: `https://ebdaey.com/app/dashboard`,
    extra_note: mentorNote,
  }, `mentor-new-order-lc-${purchaseId}`, purchase.tenant_id);
  await sendNotification(supabaseUrl, serviceKey, "student.purchase_confirmation", st?.email || "", {
    student_name: st?.full_name || "",
    mentor_name: mentorName,
    product_title: courseInfo?.title || "",
    amount: purchase.gross_amount || 0,
    order_id: purchaseId,
    access_url: bundleUrl || `https://ebdaey.com/${mentor.slug}`,
    extra_note: studentNote,
  }, `student-purchase-lc-${purchaseId}`, purchase.tenant_id);


  // If the appointment starts in less than an hour, send the join link now.
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-consultation-reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ purchaseId }),
    });
  } catch (e) { console.error("immediate reminder failed", e); }

  return true;
}

