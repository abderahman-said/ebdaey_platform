// Reconcile pending payments against PayMob.
//
// Two modes:
//   1) Single: { kind: "order"|"lc"|"dp"|"sub", id: "<uuid>" } — used by the
//      Admin "Check payment with gateway" button (admin JWT required).
//   2) Batch:  { batch: true, days?: number } — used by the cron schedule with
//      the service role key; scans every still-pending payment and completes
//      the ones PayMob confirms as paid.
//
// Completion always goes through the shared idempotent helpers, so a payment
// can never be fulfilled twice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolvePaymentStatus, paymobAuthToken } from "../_shared/paymob-inquiry.ts";
import { completeOrder } from "../_shared/complete-order.ts";
import { completeLiveCoursePurchase } from "../_shared/complete-lc-purchase.ts";
import { completeSubscriptionPurchase } from "../_shared/complete-subscription.ts";
import { completeDigitalProductPurchase } from "../_shared/complete-dp-purchase.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "order" | "lc" | "dp" | "sub";

const TABLES: Record<Kind, { table: string; paidValue: string; refPrefix: string }> = {
  order: { table: "orders", paidValue: "paid", refPrefix: "" },
  lc: { table: "live_course_purchases", paidValue: "completed", refPrefix: "lc_" },
  dp: { table: "digital_product_purchases", paidValue: "completed", refPrefix: "dp_" },
  sub: { table: "subscription_purchases", paidValue: "completed", refPrefix: "sub_" },
};

/**
 * Verifies a bearer token really carries service-role privileges.
 * The vault copy of the key used by the cron job can differ from the env one,
 * so instead of comparing strings we let PostgREST validate the JWT: only a
 * genuine service-role key can read public.rate_limits (no RLS policies).
 */
async function isVerifiedServiceRole(supabaseUrl: string, token: string): Promise<boolean> {
  try {
    const probe = createClient(supabaseUrl, token, { auth: { persistSession: false } });
    const { error } = await probe.from("rate_limits").select("bucket_key").limit(1);
    return !error;
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function completeByKind(
  supabase: any, supabaseUrl: string, serviceKey: string,
  kind: Kind, id: string, txnId: string | null, success: boolean,
): Promise<boolean> {
  if (kind === "order") return await completeOrder(supabase, supabaseUrl, serviceKey, id, txnId, success);
  if (kind === "lc") return await completeLiveCoursePurchase(supabase, supabaseUrl, serviceKey, id, txnId, success, {});
  if (kind === "sub") return await completeSubscriptionPurchase(supabase, supabaseUrl, serviceKey, id, txnId || "", success);
  return await completeDigitalProductPurchase(supabase, supabaseUrl, serviceKey, id, txnId, success);
}

async function reconcileOne(
  supabase: any, supabaseUrl: string, serviceKey: string,
  kind: Kind, row: any, token: string,
) {
  const cfg = TABLES[kind];
  const internalReference = `${cfg.refPrefix}${row.id}`;

  const txn = await resolvePaymentStatus({
    internalReference,
    paymobOrderId: row.paymob_order_id,
    merchantReference: row.paymob_special_reference,
    token,
  });

  // Remember what we learned so the next lookup is direct.
  if (txn.found && (txn.paymobOrderId || txn.merchantOrderId)) {
    await supabase.from(cfg.table).update({
      paymob_order_id: txn.paymobOrderId ?? row.paymob_order_id ?? null,
      paymob_special_reference: txn.merchantOrderId ?? row.paymob_special_reference ?? null,
    }).eq("id", row.id);
  }

  if (!txn.found) {
    return { id: row.id, kind, gateway: "no_transaction", action: "none" };
  }

  if (txn.success) {
    const done = await completeByKind(supabase, supabaseUrl, serviceKey, kind, row.id, txn.txnId, true);
    return {
      id: row.id, kind, gateway: "paid", txnId: txn.txnId,
      amount: txn.amountCents != null ? txn.amountCents / 100 : null,
      paidAt: txn.createdAt, action: done ? "completed" : "complete_failed",
    };
  }

  if (txn.pending) {
    return { id: row.id, kind, gateway: "pending_at_gateway", txnId: txn.txnId, action: "none" };
  }

  return { id: row.id, kind, gateway: "failed", txnId: txn.txnId, action: "none" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const isInternal = bearer === SERVICE_KEY
      || (!!bearer && await isVerifiedServiceRole(SUPABASE_URL, bearer));

    // Buyer check: the wallet helper dialog asks "did my payment go through?".
    // Only recent pending payments, looked up by their unguessable id; the
    // gateway is the only source of truth, and the answer is just a status.
    if (!isInternal && body?.buyer_check === true) {
      const limited = await rateLimitGuard(
        req, { name: "reconcile-paymob-buyer", max: 40, windowSeconds: 300 }, corsHeaders,
      );
      if (limited) return limited;
      const kind = body.kind as Kind;
      const id = String(body.id || "");
      if (!TABLES[kind] || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "invalid_input" }, 400);
      const { data: row } = await supabase
        .from(TABLES[kind].table)
        .select("id, payment_status, paymob_order_id, paymob_special_reference, created_at")
        .eq("id", id).maybeSingle();
      if (!row) return json({ status: "pending" });
      if (row.payment_status === TABLES[kind].paidValue) return json({ status: "paid" });
      if (Date.now() - new Date(row.created_at).getTime() > 3 * 3600 * 1000) {
        return json({ status: "pending" });
      }
      const token = await paymobAuthToken();
      const r = await reconcileOne(supabase, SUPABASE_URL, SERVICE_KEY, kind, row, token);
      const status = r.gateway === "paid" ? "paid" : r.gateway === "failed" ? "failed" : "pending";
      return json({ status });
    }

    // Admin-only when called from the browser.
    if (!isInternal) {
      const limited = await rateLimitGuard(
        req, { name: "reconcile-paymob", max: 60, windowSeconds: 300 }, corsHeaders,
      );
      if (limited) return limited;

      if (!bearer) return json({ error: "unauthorized" }, 401);
      const { data: userRes } = await supabase.auth.getUser(bearer);
      const uid = userRes?.user?.id;
      if (!uid) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    const token = await paymobAuthToken();

    // --- Single payment ---
    if (body?.id && body?.kind) {
      const kind = body.kind as Kind;
      if (!TABLES[kind]) return json({ error: "invalid_kind" }, 400);
      const { data: row } = await supabase
        .from(TABLES[kind].table)
        .select("id, payment_status, paymob_order_id, paymob_special_reference")
        .eq("id", body.id).maybeSingle();
      if (!row) return json({ error: "not_found" }, 404);
      if (row.payment_status === TABLES[kind].paidValue) {
        return json({ ok: true, result: { id: row.id, kind, gateway: "paid", action: "already_completed" } });
      }
      const result = await reconcileOne(supabase, SUPABASE_URL, SERVICE_KEY, kind, row, token);
      return json({ ok: true, result });
    }

    // --- Batch ---
    const days = Math.min(Math.max(Number(body?.days) || 7, 1), 30);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const results: unknown[] = [];

    for (const kind of Object.keys(TABLES) as Kind[]) {
      const { data: rows, error } = await supabase
        .from(TABLES[kind].table)
        .select("id, payment_status, paymob_order_id, paymob_special_reference, created_at")
        .eq("payment_status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) { console.error(`scan ${kind} failed`, error.message); continue; }
      for (const row of rows || []) {
        try {
          results.push(await reconcileOne(supabase, SUPABASE_URL, SERVICE_KEY, kind, row, token));
        } catch (e) {
          console.error(`reconcile ${kind}/${row.id} failed`, e);
          results.push({ id: row.id, kind, gateway: "error", action: "none" });
        }
      }
    }

    const recovered = results.filter((r: any) => r.action === "completed");
    if (recovered.length > 0) console.log("reconciled paid-but-pending payments:", recovered);

    return json({ ok: true, scanned: results.length, recovered: recovered.length, results });
  } catch (e) {
    console.error("reconcile-paymob-payments error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
