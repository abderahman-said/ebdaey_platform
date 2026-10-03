import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyStripeSignature } from "../_shared/stripe.ts";
import { finalizeStripeSession } from "../_shared/stripe-finalize.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "not_configured" }, 500);
  const raw = await req.text();
  if (!(await verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret))) {
    return json({ error: "bad_signature" }, 400);
  }
  const event = JSON.parse(raw);
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    return json({ ignored: event.type });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const obj = event.data.object;
    const ref: string = obj.metadata?.merchant_order_id || obj.client_reference_id || "";
    if (!ref) return json({ error: "no_reference" }, 400);
    const kind = ref.startsWith("lc_") ? "lc" : ref.startsWith("sub_") ? "sub" : ref.startsWith("dp_") ? "dp" : "order";
    const rowId = ref.replace(/^(lc_|dp_|sub_)/, "");
    const r = await finalizeStripeSession(supabase, SUPABASE_URL, SERVICE_KEY, kind, rowId, obj.id);
    if (r.error) return json({ error: r.error }, 400);
    return json({ ok: r.ok });
  } catch (e) {
    console.error("stripe-webhook error", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
