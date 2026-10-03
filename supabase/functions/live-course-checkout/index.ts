import { resolveMentorEmail } from "../_shared/mentor-email.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createApplePayIframe, createCardIframe, createWalletPayment } from "../_shared/paymob-iframe.ts";
import { createZoomMeetingForTenant } from "../_shared/zoom.ts";
import { grantLiveCourseGifts } from "../_shared/grant-gift.ts";
import { grantOrderBump, studentOwnsBumpTarget } from "../_shared/grant-bump.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { detectCountry } from "../_shared/geo.ts";
import { resolveProductPrice, createStripeCheckout, bumpPriceFor, couponAmountFor } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function withQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function buildPaymobReturnUrl(supabaseUrl: string, appReturnUrl: string, purchaseId: string): string {
  const returnUrl = withQueryParam(appReturnUrl, "purchaseId", purchaseId);
  const u = new URL(`${supabaseUrl}/functions/v1/paymob-return`);
  u.searchParams.set("kind", "lc");
  u.searchParams.set("purchaseId", purchaseId);
  u.searchParams.set("returnUrl", returnUrl);
  return u.toString();
}


async function callerUserId(req: Request, supabase: any): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(auth.slice(7)).catch(() => ({ data: null }));
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const {
      live_course_id, tenant_id, redirect_url,
      first_name, last_name, email, phone,
      coupon_id, booking_date, booking_time,
      payment_method, wallet_phone,
      payment_key, has_order_bump,
    } = body;
    const buyerCountry = detectCountry(req, { tz: body?.tz, locale: body?.locale });

    if (!live_course_id || !tenant_id || !redirect_url || !email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "live-course-checkout", max: 20, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    // Get live course
    const { data: course, error: courseErr } = await supabase
      .from("live_courses")
      .select("id, title, slug, price, tenant_id, capacity, is_free, product_type, session_duration_minutes, attendance_type")
      .eq("id", live_course_id).eq("tenant_id", tenant_id).single();

    if (courseErr || !course) {
      return new Response(JSON.stringify({ error: "Live course not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const localPrice = await resolveProductPrice(supabase, "live_course", course.id, buyerCountry);
    const stripeCurrency = localPrice && localPrice.currency !== "EGP" ? localPrice.currency : null;
    if (localPrice) (course as any).price = localPrice.price;


    // Capacity enforcement
    if (course.capacity != null) {
      const { count } = await supabase
        .from("live_course_purchases")
        .select("id", { count: "exact", head: true })
        .eq("live_course_id", course.id)
        .eq("payment_status", "completed");
      if ((count || 0) >= course.capacity) {
        return new Response(JSON.stringify({ error: "capacity_full" }), {
         status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isConsultation = (course as any).product_type === "consultation";
    if (isConsultation && (!booking_date || !booking_time)) {
      return new Response(JSON.stringify({ error: "booking_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isConsultation) {
      // Conflicts are checked across ALL of this mentor's appointments (including
      // sessions booked from bundles), not just this product.
      const dur = (course as any).session_duration_minutes || 30;
      const newStart = new Date(`${booking_date}T${String(booking_time).slice(0, 5)}:00`).getTime();
      const newEnd = newStart + dur * 60000;
      const { data: nearby } = await supabase
        .from("consultation_bookings")
        .select("id, booking_date, booking_time, duration_minutes")
        .eq("tenant_id", tenant_id)
        .eq("booking_date", booking_date)
        .in("status", ["scheduled", "confirmed"]);
      const clash = ((nearby as any[]) || []).some((b) => {
        const s = new Date(`${b.booking_date}T${String(b.booking_time).slice(0, 5)}:00`).getTime();
        if (!Number.isFinite(s)) return false;
        const e = s + (b.duration_minutes || dur) * 60000;
        return newStart < e && s < newEnd;
      });
      if (clash) {
        return new Response(JSON.stringify({ error: "slot_taken" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Find or create user
    let userId: string;
    let existingUser: any = null;
    for (let page = 1; page <= 20 && !existingUser; page++) {
      const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      const users = pageData?.users || [];
      existingUser = users.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (users.length < 1000) break;
    }

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true,
        user_metadata: {
          full_name: `${first_name} ${last_name}`,
          role: "student", phone: phone || undefined,
        },
      });
      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: "Failed to create account: " + (createErr?.message || "") }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
      await supabase.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });
    }

    // Find or create student
    let { data: student } = await supabase
      .from("students").select("id")
      .eq("user_id", userId).eq("tenant_id", tenant_id).single();

    if (!student) {
      const { data: newStudent, error: studentErr } = await supabase
        .from("students")
        .insert({
          user_id: userId, tenant_id,
          full_name: `${first_name} ${last_name}`,
          email, phone: phone || null,
        }).select("id").single();
      if (studentErr) {
        return new Response(JSON.stringify({ error: "Failed to create student" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      student = newStudent;
    }

    // Already purchased?
    const { data: existingPurchase } = await supabase
      .from("live_course_purchases").select("id, payment_status")
      .eq("student_id", student.id).eq("live_course_id", course.id)
      .eq("payment_status", "completed").maybeSingle();

    if (existingPurchase) {
      // Only reveal the purchase to its signed-in owner.
      const owner = (await callerUserId(req, supabase)) === userId;
      return new Response(JSON.stringify({
        error: "already_purchased",
        ...(owner ? { purchase_id: existingPurchase.id, payment_status: existingPurchase.payment_status } : {}),
      }), {
       status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseAmount = Number(course.price) || 0;

    // Server-side order bump validation (never trust client amounts)
    let bumpAmt = 0;
    let bumpCourseId: string | null = null;
    let bumpLiveCourseId: string | null = null;
    let bumpDigitalProductId: string | null = null;
    if (has_order_bump) {
      const { data: bumpRow } = await supabase
        .from("order_bumps")
        .select("id, bump_course_id, bump_live_course_id, bump_digital_product_id, price, discount_price")
        .eq("live_course_id", course.id)
        .eq("is_enabled", true)
        .maybeSingle();
      if (bumpRow && (bumpRow.bump_course_id || bumpRow.bump_live_course_id || bumpRow.bump_digital_product_id)) {
        bumpCourseId = bumpRow.bump_course_id ?? null;
        bumpLiveCourseId = bumpRow.bump_live_course_id ?? null;
        bumpDigitalProductId = bumpRow.bump_digital_product_id ?? null;
        const rowPrice = await bumpPriceFor(supabase, "course", bumpRow.id, localPrice?.country_code ?? null);
        if (rowPrice == null) { bumpCourseId = null; bumpLiveCourseId = null; bumpDigitalProductId = null; }
        else bumpAmt = rowPrice;
      }
    }
    // Never charge twice: drop the bump if the student already owns the target
    if (bumpAmt > 0 && await studentOwnsBumpTarget(supabase, {
      bump_course_id: bumpCourseId,
      bump_live_course_id: bumpLiveCourseId,
      bump_digital_product_id: bumpDigitalProductId,
    }, student.id)) {
      bumpAmt = 0; bumpCourseId = null; bumpLiveCourseId = null; bumpDigitalProductId = null;
    }

    const bumpFields = {
      has_order_bump: bumpAmt > 0,
      bump_amount: bumpAmt,
      bump_course_id: bumpAmt > 0 ? bumpCourseId : null,
      bump_live_course_id: bumpAmt > 0 ? bumpLiveCourseId : null,
      bump_digital_product_id: bumpAmt > 0 ? bumpDigitalProductId : null,
    };

    // Coupon — discount covers course + order bump
    const couponBase = baseAmount + bumpAmt;
    let discountAmount = 0;
    let validCouponId: string | null = null;
    if (coupon_id) {
      const { data: coupon } = await supabase
        .from("coupons").select("*")
        .eq("id", coupon_id).eq("tenant_id", tenant_id).eq("is_active", true)
        .maybeSingle();
      if (coupon) {
        const stillValid = (!coupon.expires_at || new Date(coupon.expires_at) > new Date())
          && (coupon.max_uses === null || coupon.used_count < coupon.max_uses);
        if (stillValid) {
          if (coupon.discount_type === "percentage") {
            discountAmount = Math.min(couponBase, Math.round(couponBase * Number(coupon.discount_value) / 100 * 100) / 100);
            validCouponId = coupon.id;
          } else {
            const amt = await couponAmountFor(supabase, coupon, localPrice?.currency ?? "EGP");
            if (amt != null) { discountAmount = Math.min(couponBase, amt); validCouponId = coupon.id; }
          }
        }
      }
    }

    const grossAmount = Math.max(0, couponBase - discountAmount);


    // Free → enroll immediately
    if (grossAmount <= 0) {
      const { data: freePurchase } = await supabase
        .from("live_course_purchases")
        .insert({
          live_course_id: course.id, tenant_id, student_id: student.id,
          buyer_country: buyerCountry,
          gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
          payment_status: "completed",
          coupon_id: validCouponId, discount_amount: discountAmount,
          booking_date: isConsultation ? booking_date : null,
          booking_time: isConsultation ? booking_time : null,
          ...bumpFields,
        }).select("id").single();
      if (validCouponId) {
        await supabase.rpc("increment_coupon_used_count", { _coupon_id: validCouponId });
      }
      await grantOrderBump(supabase, bumpFields, student.id, tenant_id, null);
      if (isConsultation && freePurchase) {
        const duration = (course as any).session_duration_minutes || 30;
        let meeting_link: string | null = null;
        let zoom_meeting_id: string | null = null;
        let zoom_start_url: string | null = null;

        if ((course as any).attendance_type === "zoom") {
          const startISO = `${booking_date}T${booking_time}`;
          const meeting = await createZoomMeetingForTenant(supabase, tenant_id, {
            topic: `${course.title} — ${first_name} ${last_name}`,
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
          live_course_id: course.id, tenant_id, student_id: student.id,
          purchase_id: freePurchase.id,
          booking_date, booking_time,
          duration_minutes: duration,
          status: "scheduled",
          meeting_link, zoom_meeting_id, zoom_start_url,
        }).select("id").maybeSingle();
        if (newBooking?.id) {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-service-key": SUPABASE_SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({ kind: "booking_created", bookingId: newBooking.id }),
            });
            console.log("gcal sync result:", response.status, await response.text());
          } catch (e) { console.error("gcal sync failed:", e); }
        }
      }

      // Auto-grant all gift items (course/live_course/consultation/digital_product) for free path
      if (freePurchase) {
        await grantLiveCourseGifts(supabase, course.id, student.id, tenant_id);
      }


      // Fire-and-forget notifications for free/zero-priced purchases
      if (freePurchase) {

        try {
          const mentorInfo = await resolveMentorEmail(supabase, tenant_id);
          const mentorEmail = mentorInfo.email;
          const mentorName = mentorInfo.name;
          const studentName = `${first_name} ${last_name}`;

          const { data: langTn } = await supabase.from("tenants")
            .select("public_language, dashboard_language").eq("id", tenant_id).maybeSingle();
          const isOnline = (course as any).attendance_type !== "in_person";
          const isBundle = (course as any).product_type === "session_bundle";
          const noteAr = "ستقوم باستقبال رابط اللقاء قبل ساعة من الموعد.";
          const noteEn = "You will receive the meeting link one hour before the appointment.";
          const isEnPub = (langTn as any)?.public_language === "en";
          const bundleUrl = `https://ebdaey.com/${mentorInfo.slug}/l/${(course as any).slug}/booking`;
          const studentNote = isBundle
            ? (isEnPub
              ? "Use the booking link to schedule each session of your bundle."
              : "استخدم رابط الحجز لتحديد مواعيد جلسات باقتك.")
            : (isOnline ? (isEnPub ? noteEn : noteAr) : "");
          const mentorNote = isBundle
            ? ((langTn as any)?.dashboard_language === "en"
              ? "The student will schedule the bundle sessions."
              : "سيقوم الطالب بتحديد مواعيد جلسات الباقة.")
            : (isOnline ? ((langTn as any)?.dashboard_language === "en" ? noteEn : noteAr) : "");


          // Student confirmation email (branded live-course template)
          fetch(`${SUPABASE_URL}/functions/v1/send-live-course-confirmation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ purchaseId: freePurchase.id }),
          }).catch((e) => console.error("live confirm email error:", e));

          // If the appointment starts in less than an hour, send the join link now
          fetch(`${SUPABASE_URL}/functions/v1/send-consultation-reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ purchaseId: freePurchase.id }),
          }).catch((e) => console.error("immediate reminder error:", e));

          // Mentor "new order" notification
          if (mentorEmail) {
            fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({
                templateKey: "mentor.new_order",
                to: mentorEmail,
                variables: {
                  mentor_name: mentorName,
                  student_name: studentName,
                  student_email: email,
                  product_title: course.title,
                  amount: 0,
                  dashboard_url: `https://ebdaey.com/app/dashboard`,
                  extra_note: mentorNote,
                },
                idempotencyKey: `mentor-new-order-lc-${freePurchase.id}`,
                tenant_id,
              }),
            }).catch((e) => console.error("mentor notify error:", e));
          }

          // Student purchase confirmation notification
          fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({
              templateKey: "student.purchase_confirmation",
              to: email,
              variables: {
                student_name: studentName,
                mentor_name: mentorName,
                product_title: course.title,
                amount: 0,
                order_id: freePurchase.id,
                access_url: isBundle ? bundleUrl : `https://ebdaey.com/${mentorInfo.slug}`,
                extra_note: studentNote,
              },
              idempotencyKey: `student-purchase-lc-${freePurchase.id}`,
              tenant_id,
            }),
          }).catch((e) => console.error("student notify error:", e));


          // In-app mentor notification
          await supabase.from("notifications").insert({
            tenant_id, icon_name: "Video",
            title: isBundle
              ? "تم شراء باقة جلسات جديدة 🎉"
              : isConsultation ? "تم حجز استشارة جديدة 🎉" : "تم حجز كورس مباشر 🎉",
            description: `تم تأكيد حجز "${course.title}".`,
          });
        } catch (e) {
          console.error("free live purchase notify block failed:", e);
        }
      }

      return new Response(
        JSON.stringify({ free: true, purchase_id: freePurchase?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const platformFee = Math.round(grossAmount * 0.08 * 100) / 100;
    // Payment gateway fee: 2% + 2 EGP, plus 14% VAT on the gateway fee
    const gatewayFee = Math.round((grossAmount * 0.02 + 2) * 1.14 * 100) / 100;
    const mentorNet = Math.round((grossAmount - platformFee - gatewayFee) * 100) / 100;

    const purchaseFields = {
      live_course_id: course.id, tenant_id, student_id: student.id,
      buyer_country: buyerCountry,
      gross_amount: grossAmount,
      platform_fee: platformFee, gateway_fee: gatewayFee, mentor_net: mentorNet,
      payment_status: "pending",
      coupon_id: validCouponId, discount_amount: discountAmount,
      booking_date: isConsultation ? booking_date : null,
      booking_time: isConsultation ? booking_time : null,
      payment_key: payment_key || null,
      ...bumpFields,
    };

    // Reuse existing pending purchase for the same payment_key (retry safe)
    let purchase: { id: string } | null = null;
    if (payment_key) {
      const { data: existing } = await supabase
        .from("live_course_purchases")
        .select("id, payment_status")
        .eq("payment_key", payment_key)
        .maybeSingle();
      if (existing) {
        if (existing.payment_status === "completed") {
          return new Response(JSON.stringify({
            error: "already_purchased",
            ...((await callerUserId(req, supabase)) === userId ? { purchase_id: existing.id } : {}),
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: updated, error: updErr } = await supabase
          .from("live_course_purchases")
          .update(purchaseFields)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (updErr) {
          return new Response(JSON.stringify({ error: "Failed to create purchase" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        purchase = updated;
      }
    }

    if (!purchase) {
      const { data: inserted, error: purchaseErr } = await supabase
        .from("live_course_purchases")
        .insert(purchaseFields)
        .select("id")
        .single();
      if (purchaseErr || !inserted) {
        return new Response(JSON.stringify({ error: "Failed to create purchase" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      purchase = inserted;
    }

    const merchantOrderId = `lc_${purchase.id}`;
    if (stripeCurrency) {
      const sep = String(redirect_url).includes("?") ? "&" : "?";
      const back = `${redirect_url}${sep}purchaseId=${purchase.id}&gateway=stripe`;
      const session = await createStripeCheckout({
        merchantOrderId: `lc_${purchase.id}`, amount: grossAmount, currency: stripeCurrency,
        itemName: course.title, email: email, successUrl: back, cancelUrl: back + "&cancelled=1",
      });
      await supabase.from("live_course_purchases").update({
        gateway: "stripe", currency: stripeCurrency, amount_paid: grossAmount, stripe_session_id: session.id,
      }).eq("id", purchase.id);
      return new Response(JSON.stringify({ iframe_url: session.url, purchase_id: purchase.id, method: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("live_course_purchases").update({ gateway: "paymob", currency: "EGP", amount_paid: grossAmount }).eq("id", purchase.id);

    const amountCents = Math.round(grossAmount * 100);

    const baseArgs = {
      amountCents,
      merchantOrderId,
      billing: {
        first_name, last_name, email,
        phone_number: phone || "+201000000000",
      },
      itemName: course.title,
      redirectUrl: buildPaymobReturnUrl(SUPABASE_URL, redirect_url, purchase.id),
    };

    let iframeUrl: string;
    let gatewayRef: { paymobOrderId: string | null; merchantReference: string } | null = null;
    if (payment_method === "wallet") {
      if (!wallet_phone || !/^01[0-9]{9}$/.test(String(wallet_phone))) {
        return new Response(JSON.stringify({ error: "invalid_wallet_phone" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await createWalletPayment({ ...baseArgs, phoneNumber: String(wallet_phone) });
      iframeUrl = r.redirectUrl;
      gatewayRef = r;
    } else if (payment_method === "apple_pay") {
      const r = await createApplePayIframe(baseArgs);
      iframeUrl = r.iframeUrl;
      gatewayRef = r;
    } else {
      const r = await createCardIframe(baseArgs);
      iframeUrl = r.iframeUrl;
      gatewayRef = r;
    }

    // Persist the gateway reference immediately so this payment can always be
    // looked up at PayMob later, even if no callback ever reaches us.
    if (gatewayRef) {
      const { error: refErr } = await supabase
        .from("live_course_purchases")
        .update({
          paymob_order_id: gatewayRef.paymobOrderId,
          paymob_special_reference: gatewayRef.merchantReference,
        })
        .eq("id", purchase.id);
      if (refErr) console.error("failed to store paymob reference:", refErr);
    }

    return new Response(
      JSON.stringify({ iframe_url: iframeUrl, purchase_id: purchase.id, method: payment_method || "card" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("live-course-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
