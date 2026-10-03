// Sends the mentor "order cancelled" email after a mentor cancels an order
// from their dashboard. Verifies the caller owns the tenant of that order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireRole } from "../_shared/require-role.ts";
import { resolveMentorEmail } from "../_shared/mentor-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = ["orders", "live_course_purchases", "digital_product_purchases"] as const;
type Table = typeof TABLES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const { orderId, table } = await req.json();
    if (!orderId || typeof orderId !== "string") return json({ error: "orderId required" }, 400);
    if (!TABLES.includes(table as Table)) return json({ error: "invalid table" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: row } = await supabase
      .from(table as Table)
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!row) return json({ error: "order not found" }, 404);

    // Ownership check (skip for service-role / admin callers)
    if (auth.user?.id && auth.user.id !== "service_role") {
      const { data: tenant } = await supabase
        .from("tenants").select("id").eq("id", (row as any).tenant_id)
        .eq("owner_id", auth.user.id).maybeSingle();
      const { data: adminRole } = await supabase
        .from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
      if (!tenant && !adminRole) return json({ error: "Forbidden" }, 403);
    }

    const mentor = await resolveMentorEmail(supabase, (row as any).tenant_id);
    if (!mentor.email) return json({ success: true, skipped: "no mentor email" });

    // Product title
    let productTitle = (row as any).product_title || "";
    if (!productTitle) {
      if (table === "orders" && (row as any).course_id) {
        const { data: c } = await supabase.from("courses").select("title").eq("id", (row as any).course_id).maybeSingle();
        productTitle = c?.title || "";
      } else if (table === "live_course_purchases") {
        const { data: c } = await supabase.from("live_courses").select("title").eq("id", (row as any).live_course_id).maybeSingle();
        productTitle = c?.title || "";
      } else if (table === "digital_product_purchases") {
        const { data: c } = await supabase.from("digital_products").select("title").eq("id", (row as any).digital_product_id).maybeSingle();
        productTitle = c?.title || "";
      }
    }

    const { data: st } = await supabase
      .from("students").select("full_name").eq("id", (row as any).student_id).maybeSingle();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        templateKey: "mentor.order_cancelled",
        to: mentor.email,
        variables: {
          mentor_name: mentor.name,
          student_name: st?.full_name || "",
          order_id: orderId,
          product_title: productTitle,
          amount: (row as any).gross_amount ?? 0,
        },
        idempotencyKey: `mentor-order-cancelled-${orderId}`,
        tenant_id: (row as any).tenant_id,
      }),
    });
    if (!res.ok) console.error("send-notification failed", await res.text());

    return json({ success: true });
  } catch (e) {
    console.error("send-order-cancelled error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
