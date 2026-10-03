import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSHA256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KASHIER_HASH_KEY = Deno.env.get("KASHIER_HASH_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!KASHIER_HASH_KEY) {
      throw new Error("KASHIER_HASH_KEY not configured");
    }

    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify HMAC signature from Kashier
    const signature = req.headers.get("x-kashier-signature") || req.headers.get("X-Kashier-Signature");
    if (!signature) {
      console.error("Missing Kashier signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedSignature = await hmacSHA256(KASHIER_HASH_KEY, rawBody);
    // Constant-time comparison
    if (signature.length !== expectedSignature.length || 
        !crypto.subtle || 
        signature.toLowerCase() !== expectedSignature.toLowerCase()) {
      // Use a timing-safe approach: compare all chars
      let mismatch = signature.length !== expectedSignature.length ? 1 : 0;
      const len = Math.max(signature.length, expectedSignature.length);
      for (let i = 0; i < len; i++) {
        if ((signature[i] || '') !== (expectedSignature[i] || '')) mismatch = 1;
      }
      if (mismatch) {
        console.error("Invalid Kashier signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(rawBody);
    console.log("Kashier webhook received (verified):", JSON.stringify(body));

    const { event, data } = body;

    // Kashier sends different event structures - handle the payment response
    const paymentData = data || body;
    const orderId = paymentData?.orderId || paymentData?.order?.id || paymentData?.merchantOrderId;
    const status = paymentData?.status || paymentData?.paymentStatus || event;
    const kashierOrderId = paymentData?.transactionId || paymentData?.kashierOrderId;
    let metaData: any = paymentData?.metaData || paymentData?.metadata || {};
    if (typeof metaData === "string") { try { metaData = JSON.parse(metaData); } catch { metaData = {}; } }

    if (!orderId) {
      console.error("No orderId in webhook payload");
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route live course purchases (orderId prefixed with lc_)
    if (typeof orderId === "string" && orderId.startsWith("lc_")) {
      const purchaseId = orderId.slice(3);
      const { data: purchase, error: purchaseErr } = await supabase
        .from("live_course_purchases").select("*").eq("id", purchaseId).single();

      if (purchaseErr || !purchase) {
        return new Response(JSON.stringify({ error: "Live purchase not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (purchase.payment_status === "completed") {
        return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isSuccess = status === "SUCCESS" || status === "CAPTURED" || status === "success";
      if (isSuccess) {
        await supabase.from("live_course_purchases")
          .update({ payment_status: "completed", kashier_order_id: kashierOrderId || null })
          .eq("id", purchaseId);
        if (purchase.coupon_id) {
          await supabase.rpc("increment_coupon_used_count", { _coupon_id: purchase.coupon_id });
        }
        const { data: courseInfo } = await supabase
          .from("live_courses").select("title, product_type, session_duration_minutes").eq("id", purchase.live_course_id).single();
        if ((courseInfo as any)?.product_type === "consultation" && metaData?.booking_date && metaData?.booking_time) {
          const { data: existingBooking } = await supabase
            .from("consultation_bookings").select("id").eq("purchase_id", purchaseId).maybeSingle();
          if (!existingBooking) {
            const { data: newBooking } = await supabase.from("consultation_bookings").insert({
              live_course_id: purchase.live_course_id,
              tenant_id: purchase.tenant_id,
              student_id: purchase.student_id,
              purchase_id: purchaseId,
              booking_date: metaData.booking_date,
              booking_time: metaData.booking_time,
              duration_minutes: metaData.duration_minutes || (courseInfo as any)?.session_duration_minutes || 30,
              status: "scheduled",
            }).select("id").maybeSingle();
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
          }
        }
        await supabase.from("notifications").insert({
          tenant_id: purchase.tenant_id,
          icon_name: "Video",
          title: "تم حجز كورس مباشر 🎉",
          description: `تم تأكيد حجزك لـ "${courseInfo?.title || "الكورس"}".`,
        });

        // Fire-and-forget confirmation email
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-live-course-confirmation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ purchaseId }),
          });
        } catch (e) {
          console.error("Failed to trigger live confirmation email:", e);
        }
      } else {
        await supabase.from("live_course_purchases")
          .update({ payment_status: "failed", kashier_order_id: kashierOrderId || null })
          .eq("id", purchaseId);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route digital product purchases (orderId prefixed with dp_)
    if (typeof orderId === "string" && orderId.startsWith("dp_")) {
      const purchaseId = orderId.slice(3);
      const { data: purchase, error: purchaseErr } = await supabase
        .from("digital_product_purchases")
        .select("*")
        .eq("id", purchaseId)
        .single();

      if (purchaseErr || !purchase) {
        console.error("DP purchase not found:", purchaseId);
        return new Response(JSON.stringify({ error: "Purchase not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (purchase.payment_status === "completed") {
        return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSuccess = status === "SUCCESS" || status === "CAPTURED" || status === "success";

      if (isSuccess) {
        await supabase
          .from("digital_product_purchases")
          .update({ payment_status: "completed", kashier_order_id: kashierOrderId || null })
          .eq("id", purchaseId);

        // Increment coupon usage if applicable
        if (purchase.coupon_id) {
          await supabase.rpc("increment_coupon_used_count", { _coupon_id: purchase.coupon_id });
        }

        // Enroll in gift courses
        const { data: gifts } = await supabase
          .from("digital_product_gift_courses")
          .select("course_id")
          .eq("digital_product_id", purchase.digital_product_id);
        for (const g of gifts || []) {
          const { data: existing } = await supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", purchase.student_id)
            .eq("course_id", g.course_id)
            .maybeSingle();
          if (!existing) {
            await supabase.from("enrollments").insert({
              student_id: purchase.student_id,
              course_id: g.course_id,
              tenant_id: purchase.tenant_id,
            });
          }
        }

        // Enroll in bump course (if any)
        if (purchase.has_order_bump && purchase.bump_course_id) {
          const { data: existingBump } = await supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", purchase.student_id)
            .eq("course_id", purchase.bump_course_id)
            .maybeSingle();
          if (!existingBump) {
            await supabase.from("enrollments").insert({
              student_id: purchase.student_id,
              course_id: purchase.bump_course_id,
              tenant_id: purchase.tenant_id,
            });
          }
        }

        // Notification
        const { data: productInfo } = await supabase
          .from("digital_products")
          .select("title")
          .eq("id", purchase.digital_product_id)
          .single();
        await supabase.from("notifications").insert({
          tenant_id: purchase.tenant_id,
          icon_name: "Package",
          title: "تم شراء منتج رقمي 🎉",
          description: `تم تأكيد شرائك لـ "${productInfo?.title || "المنتج"}". يمكنك الآن تحميله.`,
        });

        // Send delivery email (fire-and-forget)
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-digital-product-delivery`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ purchaseId }),
          });
        } catch (e) {
          console.error("Failed to trigger delivery email:", e);
        }

        console.log(`DP purchase completed: ${purchaseId}`);
      } else {
        await supabase
          .from("digital_product_purchases")
          .update({ payment_status: "failed", kashier_order_id: kashierOrderId || null })
          .eq("id", purchaseId);
        console.log(`DP purchase failed: ${purchaseId}, status: ${status}`);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("Order not found:", orderId);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already processed
    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuccess = status === "SUCCESS" || status === "CAPTURED" || status === "success";

    if (isSuccess) {
      // Update order to paid
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          kashier_order_id: kashierOrderId || null,
        })
        .eq("id", orderId);

      // Increment coupon used_count
      if (order.coupon_id) {
        await supabase.rpc("increment_coupon_used_count", { _coupon_id: order.coupon_id });
      }

      // Create enrollment for main course
      const { error: enrollErr } = await supabase.from("enrollments").insert({
        student_id: order.student_id,
        course_id: order.course_id,
        tenant_id: order.tenant_id,
        order_id: orderId,
      });

      if (enrollErr) {
        console.error("Failed to create enrollment:", enrollErr);
      }

      // If order has a bump course, also enroll in bump course
      if (order.has_order_bump && order.bump_course_id) {
        const { error: bumpEnrollErr } = await supabase.from("enrollments").insert({
          student_id: order.student_id,
          course_id: order.bump_course_id,
          tenant_id: order.tenant_id,
          order_id: orderId,
        });
        if (bumpEnrollErr) {
          console.error("Failed to create bump enrollment:", bumpEnrollErr);
        }
      }

      // If order has a bump digital product, create a completed purchase row
      if (order.has_order_bump && order.bump_digital_product_id) {
        const { data: existingDp } = await supabase
          .from("digital_product_purchases").select("id")
          .eq("student_id", order.student_id)
          .eq("digital_product_id", order.bump_digital_product_id)
          .eq("payment_status", "completed").maybeSingle();
        if (!existingDp) {
          const { error: bumpDpErr } = await supabase.from("digital_product_purchases").insert({
            digital_product_id: order.bump_digital_product_id,
            tenant_id: order.tenant_id,
            student_id: order.student_id,
            order_id: orderId,
            gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
            payment_status: "completed", discount_amount: 0,
          });
          if (bumpDpErr) console.error("Failed to create bump digital product purchase:", bumpDpErr);
        }
      }

      // Check if main course has gift courses configured
      const { data: giftCoursesData } = await supabase
        .from("gift_courses")
        .select("gift_course_id")
        .eq("course_id", order.course_id);

      if (giftCoursesData && giftCoursesData.length > 0) {
        for (const gc of giftCoursesData) {
          // Check not already enrolled
          const { data: existingGiftEnroll } = await supabase
            .from("enrollments")
            .select("id")
            .eq("student_id", order.student_id)
            .eq("course_id", gc.gift_course_id)
            .single();

          if (!existingGiftEnroll) {
            const { error: giftEnrollErr } = await supabase.from("enrollments").insert({
              student_id: order.student_id,
              course_id: gc.gift_course_id,
              tenant_id: order.tenant_id,
              order_id: orderId,
            });
            if (giftEnrollErr) {
              console.error("Failed to create gift enrollment:", giftEnrollErr);
            } else {
              console.log(`Gift course ${gc.gift_course_id} enrolled for student ${order.student_id}`);
            }
          }
        }
      }

      // Auto-notification for successful payment
      const { data: courseInfo } = await supabase
        .from("courses")
        .select("title")
        .eq("id", order.course_id)
        .single();

      await supabase.from("notifications").insert({
        tenant_id: order.tenant_id,
        icon_name: "CreditCard",
        title: "تم الدفع بنجاح 🎉",
        description: `تم تأكيد اشتراكك في "${courseInfo?.title || "الدورة"}". يمكنك البدء الآن!`,
      });

      console.log(`Payment successful for order ${orderId}`);
    } else {
      // Update order status to failed
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          kashier_order_id: kashierOrderId || null,
        })
        .eq("id", orderId);

      console.log(`Payment failed for order ${orderId}, status: ${status}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
