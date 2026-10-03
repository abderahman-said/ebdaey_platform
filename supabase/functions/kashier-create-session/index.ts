import { resolveMentorEmail } from "../_shared/mentor-email.ts";
import { grantOrderBump, studentOwnsBumpTarget } from "../_shared/grant-bump.ts";
import { grantCourseGifts } from "../_shared/grant-gift.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createApplePayIframe, createCardIframe, createWalletPayment } from "../_shared/paymob-iframe.ts";
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

function buildPaymobReturnUrl(supabaseUrl: string, appReturnUrl: string, orderId: string): string {
  // Strip any `/upsell` from the return path — PaymentResult page handles both
  // outcomes and forwards to upsell on success.
  const paymentResultUrl = appReturnUrl.replace(/\/upsell(?=($|[?#]))/, "/payment");
  const returnUrl = withQueryParam(paymentResultUrl, "orderId", orderId);
  const u = new URL(`${supabaseUrl}/functions/v1/paymob-return`);
  u.searchParams.set("kind", "order");
  u.searchParams.set("purchaseId", orderId);
  u.searchParams.set("returnUrl", returnUrl);
  return u.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { course_id, tenant_id, redirect_url, guest_checkout, first_name, last_name, email, phone, coupon_code, payment_method, create_pending_only, has_order_bump, bump_amount, bump_course_id, bump_digital_product_id, wallet_phone, payment_key } = body;
    const buyerCountry = detectCountry(req, { tz: body?.tz, locale: body?.locale });
    let existing_order_id = body.existing_order_id;

    if (!course_id || !tenant_id || !redirect_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;

    if (guest_checkout) {
      // Guest checkout: create or find user by email
      if (!email || !first_name || !last_name) {
        return new Response(JSON.stringify({ error: "Missing contact info" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fullName = `${first_name} ${last_name}`;

      // Check if user exists by email (paginate — listUsers returns 50 per page)
      let existingUser: any = null;
      const normalizedEmail = String(email).toLowerCase().trim();
      for (let page = 1; page <= 50; page++) {
        const { data: pageData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) {
          console.error("listUsers error:", listErr);
          break;
        }
        const users = pageData?.users || [];
        existingUser = users.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
        if (existingUser) break;
        if (users.length < 1000) break;
      }

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create user with no password (they'll set it after payment)
        const tempPassword = crypto.randomUUID() + "Aa1!";
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: "student",
            tenant_slug: undefined, // We'll handle student creation manually
            phone: phone || undefined,
          },
        });

        if (createErr) {
          // Fallback: user actually exists (pagination missed them). Look them up again.
          if ((createErr as any)?.code === "email_exists" || /already been registered/i.test(createErr.message || "")) {
            for (let page = 1; page <= 50; page++) {
              const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
              const users = pageData?.users || [];
              const found = users.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
              if (found) { userId = found.id; break; }
              if (users.length < 1000) break;
            }
            if (!userId!) {
              console.error("email_exists but user not found in listUsers");
              return new Response(JSON.stringify({ error: "Account exists — please sign in to continue" }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else {
            console.error("Failed to create user:", createErr);
            return new Response(JSON.stringify({ error: "Failed to create account: " + createErr.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          userId = newUser.user.id;
        }

        // Add student role
        await supabase.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });
      }
    } else {
      // Authenticated checkout (legacy flow)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const anonClient = createClient(SUPABASE_URL, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await anonClient.auth.getUser();
      if (claimsError || !claimsData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.user.id;
    }

    // Get course details
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, price, tenant_id, slug, gift_course_enabled, gift_course_id")
      .eq("id", course_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (courseErr || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-country price: non-EGP currencies are paid through Stripe.
    const localPrice = await resolveProductPrice(supabase, "course", course.id, buyerCountry);
    const stripeCurrency = localPrice && localPrice.currency !== "EGP" ? localPrice.currency : null;
    if (localPrice) (course as any).price = localPrice.price;

    // Get or create student record
    let { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant_id)
      .single();

    if (!student) {
      const studentName = guest_checkout ? `${first_name} ${last_name}` : "";
      const studentEmail = guest_checkout ? email : "";

      // If not guest, fetch from profiles
      let finalName = studentName;
      let finalEmail = studentEmail;
      if (!guest_checkout) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", userId)
          .single();
        finalName = profile?.full_name || "";
        finalEmail = profile?.email || "";
      }

      const { data: newStudent, error: studentErr } = await supabase
        .from("students")
        .insert({
          user_id: userId,
          tenant_id,
          full_name: finalName,
          email: finalEmail,
          phone: guest_checkout ? (phone || null) : null,
        })
        .select("id")
        .single();

      if (studentErr) {
        return new Response(JSON.stringify({ error: "Failed to create student record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      student = newStudent;
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", course_id)
      .single();

    if (existingEnrollment) {
      return new Response(
        JSON.stringify({
          error: "already_enrolled",
          guest_account_exists: !!guest_checkout,
          email,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // A caller-supplied order id must belong to this student, course and tenant.
    if (existing_order_id) {
      const { data: owned } = await supabase
        .from("orders")
        .select("id")
        .eq("id", existing_order_id)
        .eq("student_id", student.id)
        .eq("course_id", course_id)
        .eq("tenant_id", tenant_id)
        .eq("payment_status", "pending")
        .maybeSingle();
      if (!owned) existing_order_id = undefined;
    }

    // Check for existing pending order for this student+course (avoid duplicates)
    if (!existing_order_id) {
      // Prefer payment_key match (retry safe when user re-submits same booking)
      if (payment_key) {
        const { data: byKey } = await supabase
          .from("orders")
          .select("id, payment_status")
          .eq("payment_key", payment_key)
          .maybeSingle();
        if (byKey) {
          if (byKey.payment_status === "paid") {
            return new Response(
              JSON.stringify({ error: "already_enrolled", guest_account_exists: !!guest_checkout, email }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          existing_order_id = byKey.id;
        }
      }
      if (!existing_order_id) {
        const { data: existingPending } = await supabase
          .from("orders")
          .select("id")
          .eq("student_id", student.id)
          .eq("course_id", course_id)
          .eq("payment_status", "pending")
          .single();

        if (existingPending) {
          if (create_pending_only) {
            return new Response(
              JSON.stringify({ order_id: existingPending.id, pending: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // Reuse existing pending order for payment flow
          existing_order_id = existingPending.id;
        }
      }
    }

    // Server-side bump validation: never trust client bump_amount
    let bumpAmt = 0;
    let verifiedBumpCourseId: string | null = null;
    let verifiedBumpDpId: string | null = null;
    let verifiedBumpLiveId: string | null = null;
    if (has_order_bump) {
      const { data: bumpRow } = await supabase
        .from("order_bumps")
        .select("id, bump_course_id, bump_live_course_id, bump_digital_product_id, price, discount_price, is_enabled")
        .eq("course_id", course.id)
        .eq("is_enabled", true)
        .maybeSingle();
      if (bumpRow && (bumpRow.bump_course_id || (bumpRow as any).bump_live_course_id || bumpRow.bump_digital_product_id)) {
        verifiedBumpCourseId = bumpRow.bump_course_id;
        verifiedBumpLiveId = (bumpRow as any).bump_live_course_id ?? null;
        verifiedBumpDpId = bumpRow.bump_digital_product_id;
        const rowPrice = await bumpPriceFor(supabase, "course", bumpRow.id, localPrice?.country_code ?? null);
        if (rowPrice == null) { verifiedBumpCourseId = null; verifiedBumpLiveId = null; verifiedBumpDpId = null; }
        else bumpAmt = rowPrice;
      }
    }
    // Never charge twice: drop the bump if the student already owns the target
    if (bumpAmt > 0 && await studentOwnsBumpTarget(supabase, {
      bump_course_id: verifiedBumpCourseId,
      bump_live_course_id: verifiedBumpLiveId,
      bump_digital_product_id: verifiedBumpDpId,
    }, student.id)) {
      bumpAmt = 0; verifiedBumpCourseId = null; verifiedBumpLiveId = null; verifiedBumpDpId = null;
    }

    // Handle coupon — discount applies to the whole order (course + order bump)
    const couponBase = Number(course.price) + bumpAmt;
    let couponId: string | null = null;
    let discountAmount = 0;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("tenant_id", tenant_id)
        .eq("is_active", true)
        .single();

      if (coupon) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) >= new Date();
        if (notExpired) {
          if (coupon.discount_type === "percentage") {
            couponId = coupon.id;
            discountAmount = Math.round(couponBase * coupon.discount_value / 100 * 100) / 100;
          } else {
            const amt = await couponAmountFor(supabase, coupon, localPrice?.currency ?? "EGP");
            if (amt != null) { couponId = coupon.id; discountAmount = amt; }
          }
          discountAmount = Math.min(couponBase, discountAmount);
        }
      }
    }

    const grossAmount = Math.max(0, couponBase - discountAmount);


    // Free course or fully discounted → enroll directly
    if (grossAmount <= 0) {
      const { data: freeOrder } = await supabase.from("orders").insert({
        course_id: course.id,
        tenant_id,
        student_id: student.id,
        buyer_country: buyerCountry,
        gross_amount: 0,
        platform_fee: 0,
        gateway_fee: 0,
        mentor_net: 0,
        payment_status: "paid",
        coupon_id: couponId,
        has_order_bump: !!has_order_bump && bumpAmt > 0,
        bump_amount: bumpAmt,
        bump_course_id: verifiedBumpCourseId,
        bump_live_course_id: verifiedBumpLiveId,
        bump_digital_product_id: verifiedBumpDpId,
      }).select("id").single();

      await supabase.from("enrollments").insert({
        student_id: student.id,
        course_id: course.id,
        tenant_id,
        order_id: freeOrder?.id || null,
      });

      // Increment coupon used_count
      if (couponId) {
        await supabase.rpc("increment_coupon_used_count", { _coupon_id: couponId });
      }

      // Grant the order bump (any type) with dedupe protection
      await grantOrderBump(
        supabase,
        {
          has_order_bump: !!has_order_bump && bumpAmt > 0,
          bump_course_id: verifiedBumpCourseId,
          bump_live_course_id: verifiedBumpLiveId,
          bump_digital_product_id: verifiedBumpDpId,
        },
        student.id,
        tenant_id,
        freeOrder?.id || null,
      );

      // Grant all gift items attached to this course (courses, live courses, consultations, digital products)
      await grantCourseGifts(supabase, course.id, student.id, tenant_id);


      // Confirmation emails (student + mentor) — same as paid orders
      try {
        const [{ data: st }, mentorInfo] = await Promise.all([
          supabase.from("students").select("full_name, email").eq("id", student.id).maybeSingle(),
          resolveMentorEmail(supabase, tenant_id),
        ]);
        const notify = (templateKey: string, to: string, variables: Record<string, unknown>, idempotencyKey: string) =>
          fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id }),
          }).catch((e) => console.error(`notify ${templateKey} failed`, e));

        const mentorName = mentorInfo.name;
        if (mentorInfo.email) {
          await notify("mentor.new_order", mentorInfo.email, {
            mentor_name: mentorName,
            student_name: st?.full_name || "",
            student_email: st?.email || "",
            product_title: course.title,
            amount: 0,
            dashboard_url: "https://ebdaey.com/app/dashboard",
          }, `mentor-new-order-c-${freeOrder?.id}`);
        }
        if (st?.email) {
          await notify("student.purchase_confirmation", st.email, {
            student_name: st.full_name || "",
            mentor_name: mentorName,
            product_title: course.title,
            amount: 0,
            order_id: freeOrder?.id || "",
            access_url: `https://ebdaey.com/${mentorInfo.slug}/course/${course.slug}`,
          }, `student-purchase-c-${freeOrder?.id}`);
        }
      } catch (e) {
        console.error("free order notifications failed", e);
      }

      return new Response(
        JSON.stringify({ free: true, message: "Enrolled successfully", order_id: freeOrder?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fees (8% platform + payment gateway: 2% + 2 EGP with 14% VAT)
    const platformFee = Math.round(grossAmount * 0.08 * 100) / 100;
    const gatewayFee = Math.round((grossAmount * 0.02 + 2) * 1.14 * 100) / 100;
    const mentorNet = Math.round((grossAmount - platformFee - gatewayFee) * 100) / 100;

    let orderId: string;

    if (existing_order_id) {
      // Reuse existing pending order - update it with coupon if applied
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          gross_amount: grossAmount,
          platform_fee: platformFee,
          gateway_fee: gatewayFee,
          mentor_net: mentorNet,
          coupon_id: couponId,
          has_order_bump: !!has_order_bump && bumpAmt > 0,
          bump_amount: bumpAmt,
          bump_course_id: verifiedBumpCourseId,
          bump_live_course_id: verifiedBumpLiveId,
          bump_digital_product_id: verifiedBumpDpId,
          payment_key: payment_key || null,
        })
        .eq("id", existing_order_id)
        .eq("payment_status", "pending");

      if (updateErr) {
        console.error("Failed to update order:", updateErr);
      }
      orderId = existing_order_id;
    } else {
      // Create new order record
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          course_id: course.id,
          tenant_id,
          student_id: student.id,
          buyer_country: buyerCountry,
          gross_amount: grossAmount,
          platform_fee: platformFee,
          gateway_fee: gatewayFee,
          mentor_net: mentorNet,
          payment_status: "pending",
          coupon_id: couponId,
          has_order_bump: !!has_order_bump && bumpAmt > 0,
          bump_amount: bumpAmt,
          bump_course_id: verifiedBumpCourseId,
          bump_live_course_id: verifiedBumpLiveId,
          bump_digital_product_id: verifiedBumpDpId,
          payment_key: payment_key || null,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Failed to create order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orderId = order.id;
    }

    // If create_pending_only, return the order ID without creating Kashier session
    if (create_pending_only) {
      return new Response(
        JSON.stringify({ order_id: orderId, pending: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve billing info (guest flow already has it; for authed flow fall back to profile)
    let billFirst = first_name, billLast = last_name, billEmail = email, billPhone = phone;
    if (!guest_checkout) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name, email").eq("user_id", userId).single();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        billFirst = billFirst || parts[0] || "Customer";
        billLast = billLast || parts.slice(1).join(" ") || "Ebdaey";
      }
      billEmail = billEmail || profile?.email || "";
    }

    if (stripeCurrency) {
      const sep = String(redirect_url).includes("?") ? "&" : "?";
      const back = `${redirect_url}${sep}orderId=${orderId}&gateway=stripe`;
      const session = await createStripeCheckout({
        merchantOrderId: orderId, amount: grossAmount, currency: stripeCurrency,
        itemName: course.title, email: billEmail, successUrl: back, cancelUrl: back + "&cancelled=1",
      });
      await supabase.from("orders").update({
        gateway: "stripe", currency: stripeCurrency, amount_paid: grossAmount, stripe_session_id: session.id,
      }).eq("id", orderId);
      return new Response(JSON.stringify({ iframe_url: session.url, order_id: orderId, method: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("orders").update({ gateway: "paymob", currency: "EGP", amount_paid: grossAmount }).eq("id", orderId);

    const amountCents = Math.round(grossAmount * 100);

    const baseArgs = {
      amountCents,
      merchantOrderId: orderId,
      billing: {
        first_name: billFirst || "Customer",
        last_name: billLast || "Ebdaey",
        email: billEmail,
        phone_number: billPhone || "+201000000000",
      },
      itemName: course.title,
      redirectUrl: buildPaymobReturnUrl(SUPABASE_URL, redirect_url, orderId),
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
        .from("orders")
        .update({
          paymob_order_id: gatewayRef.paymobOrderId,
          paymob_special_reference: gatewayRef.merchantReference,
        })
        .eq("id", orderId);
      if (refErr) console.error("failed to store paymob reference:", refErr);
    }

    return new Response(
      JSON.stringify({ iframe_url: iframeUrl, order_id: orderId, method: payment_method || "card" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Kashier session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
