import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const limited = await rateLimitGuard(req, { name: "validate-coupon", max: 30, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { code, tenant_id, course_id, digital_product_id, currency } = await req.json();

    // Never trust a caller-supplied student id: resolve it from the caller's session.
    let student_id: string | null = null;
    const authH = req.headers.get("Authorization") || "";
    if (authH.startsWith("Bearer ") && tenant_id) {
      const { data: u } = await supabase.auth.getUser(authH.slice(7)).catch(() => ({ data: null as any }));
      if (u?.user?.id) {
        const { data: st } = await supabase.from("students").select("id")
          .eq("user_id", u.user.id).eq("tenant_id", tenant_id).maybeSingle();
        student_id = st?.id ?? null;
      }
    }

    if (!code || !tenant_id) {
      return new Response(JSON.stringify({ valid: false, message: "Missing code or tenant_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .single();

    if (!coupon) {
      return new Response(JSON.stringify({ valid: false, message: "كوبون غير صالح" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "انتهت صلاحية الكوبون" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ valid: false, message: "تم استنفاد عدد مرات استخدام الكوبون" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check course-specific
    if (coupon.course_id && course_id && coupon.course_id !== course_id) {
      return new Response(JSON.stringify({ valid: false, message: "هذا الكوبون غير صالح لهذه الدورة" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check digital-product-specific
    if (coupon.digital_product_id && digital_product_id && coupon.digital_product_id !== digital_product_id) {
      return new Response(JSON.stringify({ valid: false, message: "هذا الكوبون غير صالح لهذا المنتج" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If coupon is restricted to course but request is for product (or vice versa) → invalid
    if (coupon.course_id && !course_id && digital_product_id) {
      return new Response(JSON.stringify({ valid: false, message: "هذا الكوبون غير صالح لهذا المنتج" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coupon.digital_product_id && !digital_product_id && course_id) {
      return new Response(JSON.stringify({ valid: false, message: "هذا الكوبون غير صالح لهذه الدورة" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max per customer (across both courses and digital products)
    if (coupon.max_per_customer !== null && student_id) {
      const [{ count: oCount }, { count: dCount }] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id).eq("student_id", student_id).eq("payment_status", "paid"),
        supabase.from("digital_product_purchases").select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id).eq("student_id", student_id).eq("payment_status", "completed"),
      ]);
      if (((oCount || 0) + (dCount || 0)) >= coupon.max_per_customer) {
        return new Response(JSON.stringify({ valid: false, message: "لقد استخدمت هذا الكوبون الحد الأقصى من المرات" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let discountValue = Number(coupon.discount_value);
    if (coupon.discount_type !== "percentage") {
      const cur = String(currency || "EGP").toUpperCase();
      const { data: amt } = await supabase.from("coupon_amounts").select("amount")
        .eq("coupon_id", coupon.id).eq("currency", cur).maybeSingle();
      if (!amt) {
        return new Response(JSON.stringify({ valid: false, message: "هذا الكوبون غير متاح بعملة هذا السعر" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      discountValue = Number(amt.amount) || 0;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        discount_type: coupon.discount_type,
        discount_value: discountValue,
        coupon_id: coupon.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Coupon validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, message: "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
