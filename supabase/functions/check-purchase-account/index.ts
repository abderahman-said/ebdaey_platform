import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


const normEmail = (v: unknown) =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { order_id, digital_product_purchase_id, live_course_purchase_id, subscription_purchase_id, email } =
      await req.json();

    // The purchase id alone is not proof of ownership (it travels in redirect
    // URLs). The caller must also know the email used at checkout.
    const claimedEmail = normEmail(email);
    if (!claimedEmail) {
      return new Response(JSON.stringify({ found: false, reason: "email_required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "check-purchase-account", max: 20, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    let userId: string | null = null;
    let userEmail: string | null = null;
    let purchaseCreatedAt: string | null = null;

    if (subscription_purchase_id) {
      const { data } = await supabase
        .from("subscription_purchases")
        .select("created_at, students(user_id, email)")
        .eq("id", subscription_purchase_id).single();
      userId = (data as any)?.students?.user_id; userEmail = (data as any)?.students?.email;
      purchaseCreatedAt = (data as any)?.created_at || null;
    } else if (live_course_purchase_id) {
      const { data } = await supabase
        .from("live_course_purchases")
        .select("created_at, students(user_id, email)")
        .eq("id", live_course_purchase_id).single();
      userId = (data as any)?.students?.user_id; userEmail = (data as any)?.students?.email;
      purchaseCreatedAt = (data as any)?.created_at || null;
    } else if (digital_product_purchase_id) {
      const { data } = await supabase
        .from("digital_product_purchases")
        .select("created_at, students(user_id, email)")
        .eq("id", digital_product_purchase_id).single();
      userId = (data as any)?.students?.user_id; userEmail = (data as any)?.students?.email;
      purchaseCreatedAt = (data as any)?.created_at || null;
    } else if (order_id) {
      const { data } = await supabase
        .from("orders").select("created_at, students(user_id, email)").eq("id", order_id).single();
      userId = (data as any)?.students?.user_id; userEmail = (data as any)?.students?.email;
      purchaseCreatedAt = (data as any)?.created_at || null;
    }

    // Only the post-checkout screen needs this; old purchases never answer.
    const recent = !!purchaseCreatedAt && Date.now() - new Date(purchaseCreatedAt).getTime() < 48 * 3600 * 1000;
    if (!userId || !recent || normEmail(userEmail) !== claimedEmail) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: auth } = await supabase.auth.admin.getUserById(userId);
    const accountPredatesPurchase = !!(
      auth?.user?.created_at &&
      purchaseCreatedAt &&
      new Date(auth.user.created_at).getTime() < new Date(purchaseCreatedAt).getTime() - 120000
    );
    const hasPassword = !!auth?.user?.last_sign_in_at || accountPredatesPurchase;
    return new Response(JSON.stringify({ found: true, hasPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
