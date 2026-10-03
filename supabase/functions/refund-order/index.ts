import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireRole } from "../_shared/require-role.ts";

const TABLES = ["orders", "live_course_purchases", "digital_product_purchases"] as const;
type TableName = (typeof TABLES)[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    const table = body?.table as TableName;
    if (!orderId || !TABLES.includes(table)) {
      return json({ error: "invalid_input" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: record } = await supabase.from(table).select("*").eq("id", orderId).maybeSingle();
    if (!record) return json({ error: "not_found" }, 404);

    // Tenant ownership check (admins bypass).
    if (auth.user?.id && auth.user.id !== "service_role") {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", auth.user.id);
      const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
      if (!isAdmin) {
        const { data: tenant } = await supabase
          .from("tenants").select("id").eq("owner_id", auth.user.id).maybeSingle();
        if (!tenant || tenant.id !== record.tenant_id) return json({ error: "forbidden" }, 403);
      }
    }

    const paid = record.payment_status === "paid" || record.payment_status === "completed";
    if (!paid) return json({ error: "not_paid" }, 400);

    const gross = Number(record.gross_amount || 0);
    if (gross <= 0) return json({ error: "free_order" }, 400);

    const txnId = String(record.kashier_order_id || "");
    if (!txnId) return json({ error: "no_transaction" }, 400);

    const SECRET = Deno.env.get("PAYMOB_SECRET_KEY");
    if (!SECRET) return json({ error: "gateway_not_configured" }, 500);

    const amountCents = Math.round(gross * 100);
    const res = await fetch("https://accept.paymob.com/api/acceptance/void_refund/refund", {
      method: "POST",
      headers: { "Authorization": `Token ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: txnId, amount_cents: amountCents }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("PayMob refund failed", res.status, text.slice(0, 400));
      return json({ error: "gateway_refund_failed", details: text.slice(0, 300) }, 400);
    }

    // Mark refunded and revoke access.
    await supabase.from(table).update({ payment_status: "refunded" }).eq("id", orderId);

    if (table === "orders") {
      await supabase.from("enrollments").delete().eq("order_id", orderId);
      if (record.student_id && record.course_id) {
        await supabase.from("enrollments").delete()
          .eq("student_id", record.student_id).eq("course_id", record.course_id).is("order_id", null);
      }
    } else if (table === "live_course_purchases") {
      await supabase.from("consultation_bookings")
        .update({ status: "cancelled" }).eq("purchase_id", orderId);
    }

    // Deduct the refunded amount from the mentor balance (commission stays charged).
    await supabase.from("transactions").insert({
      tenant_id: record.tenant_id,
      amount: -gross,
      category: "refund",
      description: record.product_title || "Refund",
      order_id: table === "orders" ? orderId : null,
    });

    // Notify the mentor that the order was cancelled/refunded.
    fetch(`${SUPABASE_URL}/functions/v1/send-order-cancelled`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ orderId, table }),
    }).catch((e) => console.error("cancel email failed", e));

    return json({ ok: true });
  } catch (e) {
    console.error("refund-order error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
