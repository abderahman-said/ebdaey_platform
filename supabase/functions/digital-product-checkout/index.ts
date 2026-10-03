import { safeReturnUrl } from "../_shared/safe-return-url.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createApplePayIframe, createCardIframe, createWalletPayment } from "../_shared/paymob-iframe.ts";
import { grantOrderBump, studentOwnsBumpTarget } from "../_shared/grant-bump.ts";
import { grantDigitalProductGifts } from "../_shared/grant-gift.ts";
import { resolveMentorEmail } from "../_shared/mentor-email.ts";
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
  const safe = safeReturnUrl(appReturnUrl);
  if (!safe) throw new Error("invalid_redirect_url");
  appReturnUrl = safe;
  const paymentResultUrl = appReturnUrl.replace(/\/upsell(?=($|[?#]))/, "/payment");
  const returnUrl = withQueryParam(paymentResultUrl, "purchaseId", purchaseId);
  const u = new URL(`${supabaseUrl}/functions/v1/paymob-return`);
  u.searchParams.set("kind", "dp");
  u.searchParams.set("purchaseId", purchaseId);
  u.searchParams.set("returnUrl", returnUrl);
  return u.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const {
      digital_product_id, tenant_id, redirect_url, first_name, last_name, email, phone,
      bump_course_id, bump_live_course_id, bump_digital_product_id, bump_amount,
      coupon_id, payment_method, wallet_phone,
      payment_key,
    } = body;
    const buyerCountry = detectCountry(req, { tz: body?.tz, locale: body?.locale });

    if (!digital_product_id || !tenant_id || !redirect_url || !email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "digital-product-checkout", max: 20, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    // Get product
    const { data: product, error: productErr } = await supabase
      .from("digital_products")
      .select("id, title, price, tenant_id")
      .eq("id", digital_product_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (productErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const localPrice = await resolveProductPrice(supabase, "digital_product", product.id, buyerCountry);
    const stripeCurrency = localPrice && localPrice.currency !== "EGP" ? localPrice.currency : null;
    if (localPrice) (product as any).price = localPrice.price;


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
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: `${first_name} ${last_name}`,
          role: "student",
          phone: phone || undefined,
        },
      });
      if (createErr || !newUser?.user) {
        return new Response(JSON.stringify({ error: "Failed to create account: " + (createErr?.message || "") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
      await supabase.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });
    }

    // Find or create student
    let { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", tenant_id)
      .single();

    if (!student) {
      const { data: newStudent, error: studentErr } = await supabase
        .from("students")
        .insert({
          user_id: userId,
          tenant_id,
          full_name: `${first_name} ${last_name}`,
          email,
          phone: phone || null,
        })
        .select("id")
        .single();
      if (studentErr) {
        return new Response(JSON.stringify({ error: "Failed to create student" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      student = newStudent;
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("digital_product_purchases")
      .select("id, payment_status")
      .eq("student_id", student.id)
      .eq("digital_product_id", product.id)
      .eq("payment_status", "completed")
      .maybeSingle();

    if (existingPurchase) {
      return new Response(JSON.stringify({
        error: "already_purchased",
        purchase_id: existingPurchase.id,
        payment_status: existingPurchase.payment_status,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseAmount = Number(product.price) || 0;

    // Server-side bump validation: never trust client bump_amount
    let bumpAmt = 0;
    let verifiedBumpCourseId: string | null = null;
    let verifiedBumpDigitalProductId: string | null = null;
    let verifiedBumpLiveCourseId: string | null = null;
    if (bump_course_id || bump_live_course_id || bump_digital_product_id) {
      const { data: bumpRow } = await supabase
        .from("digital_product_order_bumps")
        .select("id, bump_course_id, bump_live_course_id, bump_digital_product_id, price, discount_price, is_enabled")
        .eq("digital_product_id", product.id)
        .eq("is_enabled", true)
        .maybeSingle();
      if (bumpRow) {
        verifiedBumpCourseId = bumpRow.bump_course_id;
        verifiedBumpLiveCourseId = (bumpRow as any).bump_live_course_id ?? null;
        verifiedBumpDigitalProductId = bumpRow.bump_digital_product_id;
        const rowPrice = await bumpPriceFor(supabase, "dp", bumpRow.id, localPrice?.country_code ?? null);
        if (rowPrice == null) { verifiedBumpCourseId = null; verifiedBumpLiveCourseId = null; verifiedBumpDigitalProductId = null; }
        else bumpAmt = rowPrice;
      }
    }

    // Never charge twice: drop the bump if the student already owns the target
    if (bumpAmt > 0 && await studentOwnsBumpTarget(supabase, {
      bump_course_id: verifiedBumpCourseId,
      bump_live_course_id: verifiedBumpLiveCourseId,
      bump_digital_product_id: verifiedBumpDigitalProductId,
    }, student.id)) {
      bumpAmt = 0; verifiedBumpCourseId = null; verifiedBumpLiveCourseId = null; verifiedBumpDigitalProductId = null;
    }
    const hasBump = !!(verifiedBumpCourseId || verifiedBumpLiveCourseId || verifiedBumpDigitalProductId) && bumpAmt > 0;

    // Apply coupon (server-side recompute) — discount covers product + order bump
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
          && (coupon.max_uses === null || coupon.used_count < coupon.max_uses)
          && (!coupon.digital_product_id || coupon.digital_product_id === digital_product_id)
          && !coupon.course_id;
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


    // Free product: enroll immediately
    if (grossAmount <= 0) {
      const { data: freePurchase } = await supabase
        .from("digital_product_purchases")
        .insert({
          digital_product_id: product.id,
          tenant_id,
          student_id: student.id,
          buyer_country: buyerCountry,
          gross_amount: 0,
          platform_fee: 0,
          gateway_fee: 0,
          mentor_net: 0,
          payment_status: "completed",
          coupon_id: validCouponId,
          discount_amount: discountAmount,
          payment_key: payment_key || null,
          has_order_bump: hasBump && bumpAmt > 0,
          bump_course_id: hasBump ? verifiedBumpCourseId : null,
          bump_live_course_id: hasBump ? verifiedBumpLiveCourseId : null,
          bump_digital_product_id: hasBump ? verifiedBumpDigitalProductId : null,
          bump_amount: hasBump ? bumpAmt : 0,
        })
        .select("id")
        .single();

      if (validCouponId) {
        await supabase.rpc("increment_coupon_used_count", { _coupon_id: validCouponId });
      }

      // Grant the order bump (any type) — dedupe-safe
      await grantOrderBump(supabase, {
        has_order_bump: hasBump && bumpAmt > 0,
        bump_course_id: hasBump ? verifiedBumpCourseId : null,
        bump_live_course_id: hasBump ? verifiedBumpLiveCourseId : null,
        bump_digital_product_id: hasBump ? verifiedBumpDigitalProductId : null,
      }, student.id, tenant_id, null);

      // Grant all gift items (course/live_course/consultation/digital_product)
      await grantDigitalProductGifts(supabase, product.id, student.id, tenant_id);

      // Delivery + notification emails (same as the paid path)
      if (freePurchase?.id) {
        const notify = async (templateKey: string, to: string, variables: Record<string, unknown>, idempotencyKey: string) => {
          if (!to) return;
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id }),
            });
          } catch (e) { console.error(`notify ${templateKey} failed`, e); }
        };

        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-digital-product-delivery`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ purchaseId: freePurchase.id }),
          });
        } catch (e) { console.error("dp delivery email failed", e); }

        const mentor = await resolveMentorEmail(supabase, tenant_id);
        const studentName = [first_name, last_name].filter(Boolean).join(" ").trim();
        await notify("mentor.new_order", mentor.email, {
          mentor_name: mentor.name,
          student_name: studentName,
          student_email: email || "",
          product_title: product.title || "",
          amount: 0,
          dashboard_url: `https://ebdaey.com/app/dashboard`,
        }, `mentor-new-order-dp-${freePurchase.id}`);
        await notify("student.purchase_confirmation", email || "", {
          student_name: studentName,
          mentor_name: mentor.name,
          product_title: product.title || "",
          amount: 0,
          order_id: freePurchase.id,
          access_url: `https://ebdaey.com/${mentor.slug}`,
        }, `student-purchase-dp-${freePurchase.id}`);
      }

      return new Response(
        JSON.stringify({ free: true, purchase_id: freePurchase?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Paid: calculate fees + create pending purchase
    const platformFee = Math.round(grossAmount * 0.08 * 100) / 100;
    // Payment gateway fee: 2% + 2 EGP, plus 14% VAT on the gateway fee
    const gatewayFee = Math.round((grossAmount * 0.02 + 2) * 1.14 * 100) / 100;
    const mentorNet = Math.round((grossAmount - platformFee - gatewayFee) * 100) / 100;

    const purchaseFields = {
      digital_product_id: product.id,
      tenant_id,
      student_id: student.id,
      buyer_country: buyerCountry,
      gross_amount: grossAmount,
      platform_fee: platformFee,
      gateway_fee: gatewayFee,
      mentor_net: mentorNet,
      payment_status: "pending",
      has_order_bump: hasBump && bumpAmt > 0,
      bump_course_id: hasBump ? verifiedBumpCourseId : null,
      bump_live_course_id: hasBump ? verifiedBumpLiveCourseId : null,
      bump_digital_product_id: hasBump ? verifiedBumpDigitalProductId : null,
      bump_amount: hasBump ? bumpAmt : 0,
      coupon_id: validCouponId,
      discount_amount: discountAmount,
      payment_key: payment_key || null,
    };

    // Reuse existing pending purchase for the same payment_key (retry safe)
    let purchase: { id: string } | null = null;
    if (payment_key) {
      const { data: existing } = await supabase
        .from("digital_product_purchases")
        .select("id, payment_status")
        .eq("payment_key", payment_key)
        .maybeSingle();
      if (existing) {
        if (existing.payment_status === "completed") {
          return new Response(JSON.stringify({ error: "already_purchased" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: updated, error: updErr } = await supabase
          .from("digital_product_purchases")
          .update(purchaseFields)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (updErr) {
          console.error("update purchase failed:", updErr);
          return new Response(JSON.stringify({ error: "Failed to create purchase" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        purchase = updated;
      }
    }

    if (!purchase) {
      const { data: inserted, error: purchaseErr } = await supabase
        .from("digital_product_purchases")
        .insert(purchaseFields)
        .select("id")
        .single();

      if (purchaseErr || !inserted) {
        console.error("insert purchase failed:", purchaseErr);
        return new Response(JSON.stringify({ error: "Failed to create purchase", detail: purchaseErr?.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      purchase = inserted;
    }

    const merchantOrderId = `dp_${purchase.id}`;
    if (stripeCurrency) {
      const sep = String(redirect_url).includes("?") ? "&" : "?";
      const back = `${redirect_url}${sep}purchaseId=${purchase.id}&gateway=stripe`;
      const session = await createStripeCheckout({
        merchantOrderId: `dp_${purchase.id}`, amount: grossAmount, currency: stripeCurrency,
        itemName: product.title, email: email, successUrl: back, cancelUrl: back + "&cancelled=1",
      });
      await supabase.from("digital_product_purchases").update({
        gateway: "stripe", currency: stripeCurrency, amount_paid: grossAmount, stripe_session_id: session.id,
      }).eq("id", purchase.id);
      return new Response(JSON.stringify({ iframe_url: session.url, purchase_id: purchase.id, method: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("digital_product_purchases").update({ gateway: "paymob", currency: "EGP", amount_paid: grossAmount }).eq("id", purchase.id);

    const amountCents = Math.round(grossAmount * 100);

    const paymobReturnUrl = buildPaymobReturnUrl(SUPABASE_URL, redirect_url, purchase.id);

    const baseArgs = {
      amountCents,
      merchantOrderId,
      billing: {
        first_name, last_name, email,
        phone_number: phone || "+201000000000",
      },
      itemName: product.title,
      redirectUrl: paymobReturnUrl,
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
        .from("digital_product_purchases")
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
    console.error("digital-product-checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
