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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const limited = await rateLimitGuard(req, { name: "setup-student-password", max: 10, windowSeconds: 600 }, corsHeaders);
  if (limited) return limited;


  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { order_id, password, digital_product_purchase_id, live_course_purchase_id, subscription_purchase_id, email } =
      await req.json();

    // Knowing the purchase id is not enough — the caller must also present the
    // email address used at checkout before we may set a password.
    const claimedEmail = normEmail(email);
    if (!claimedEmail) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((!order_id && !digital_product_purchase_id && !live_course_purchase_id && !subscription_purchase_id) || !password) {
      return new Response(JSON.stringify({ error: "Missing identifier or password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    let purchaseAt: string | null = null;

    if (subscription_purchase_id) {
      const { data: p } = await supabase
        .from("subscription_purchases")
        .select("payment_status, created_at, students(user_id, email)")
        .eq("id", subscription_purchase_id).single();
      if (!p || p.payment_status !== "completed") {
        return new Response(JSON.stringify({ error: "Payment not confirmed yet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = (p as any).students?.user_id; userEmail = (p as any).students?.email; purchaseAt = (p as any).created_at;
    } else if (live_course_purchase_id) {
      const { data: p } = await supabase
        .from("live_course_purchases")
        .select("payment_status, created_at, students(user_id, email)")
        .eq("id", live_course_purchase_id).single();
      if (!p || p.payment_status !== "completed") {
        return new Response(JSON.stringify({ error: "Payment not confirmed yet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = (p as any).students?.user_id; userEmail = (p as any).students?.email; purchaseAt = (p as any).created_at;
    } else if (digital_product_purchase_id) {
      const { data: p } = await supabase
        .from("digital_product_purchases")
        .select("payment_status, created_at, students(user_id, email)")
        .eq("id", digital_product_purchase_id).single();
      if (!p || p.payment_status !== "completed") {
        return new Response(JSON.stringify({ error: "Payment not confirmed yet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = (p as any).students?.user_id; userEmail = (p as any).students?.email; purchaseAt = (p as any).created_at;
    } else {
      const { data: order, error: orderErr } = await supabase
        .from("orders").select("*, students(user_id, email)").eq("id", order_id).single();
      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (order.payment_status !== "paid") {
        return new Response(JSON.stringify({ error: "Payment not confirmed yet" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = (order as any).students?.user_id; userEmail = (order as any).students?.email; purchaseAt = (order as any).created_at;
    }

    if (!userId || normEmail(userEmail) !== claimedEmail) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow setting a password if the user has never signed in yet.
    // Prevents an attacker who guesses/knows a purchase id from resetting an
    // existing account's password.
    const { data: existingAuth } = await supabase.auth.admin.getUserById(userId);
    if (!existingAuth?.user) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existingAuth.user.last_sign_in_at) {
      return new Response(JSON.stringify({ already_set: true, email: userEmail }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only accounts created by this very checkout (never pre-existing ones) and
    // only shortly after the purchase may receive an initial password here.
    const purchaseMs = purchaseAt ? new Date(purchaseAt).getTime() : NaN;
    const accountMs = new Date(existingAuth.user.created_at).getTime();
    const tooOld = !Number.isFinite(purchaseMs) || Date.now() - purchaseMs > 7 * 24 * 3600 * 1000;
    const predates = Number.isFinite(purchaseMs) && accountMs < purchaseMs - 120000;
    const { data: privileged } = await supabase.from("user_roles").select("role")
      .eq("user_id", userId).in("role", ["admin", "mentor"]).limit(1);
    if (tooOld || predates || (privileged || []).length) {
      return new Response(JSON.stringify({ already_set: true, email: userEmail }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { password });
    if (updateErr) {
      console.error("Failed to set password:", updateErr);
      const code = (updateErr as any)?.code;
      const isWeak = code === "weak_password" || (updateErr as any)?.name === "AuthWeakPasswordError";
      const message = isWeak
        ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
        : "تعذر تعيين كلمة المرور. يرجى المحاولة مرة أخرى.";
      return new Response(JSON.stringify({ error: message, code: code || "update_failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ success: true, email: userEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Setup password error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
