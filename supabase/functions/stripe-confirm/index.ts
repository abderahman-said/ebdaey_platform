// Browser-return fallback: after Stripe redirects back, the result page calls
// this to verify the session with Stripe and fulfill the order immediately.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { finalizeStripeSession, STRIPE_TABLES } from "../_shared/stripe-finalize.ts";

const Body = z.object({
  kind: z.enum(["order", "lc", "dp", "sub"]),
  id: z.string().uuid(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const { kind, id } = parsed.data;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const { data: row } = await supabase.from(STRIPE_TABLES[kind])
      .select("stripe_session_id, gateway").eq("id", id).maybeSingle();
    if (!row?.stripe_session_id) return json({ ok: false, paid: false, reason: "not_stripe" });
    const r = await finalizeStripeSession(supabase, SUPABASE_URL, SERVICE_KEY, kind, id, row.stripe_session_id);
    return json({ ok: r.ok, paid: r.paid });
  } catch (e) {
    console.error("stripe-confirm error", e);
    return json({ ok: false, error: "confirm_failed" }, 500);
  }
});
