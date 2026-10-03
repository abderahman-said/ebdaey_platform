// PayMob "Transaction Processed" webhook handler.
// Verifies HMAC-SHA512 signature, then fulfills the matching purchase/order.
// HMAC is computed over a specific concatenation of `obj` fields (see PayMob docs).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { completeSubscriptionPurchase } from "../_shared/complete-subscription.ts";
import { completeDigitalProductPurchase } from "../_shared/complete-dp-purchase.ts";
import { completeLiveCoursePurchase } from "../_shared/complete-lc-purchase.ts";
import { completeOrder } from "../_shared/complete-order.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSHA512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function pick(obj: any, path: string): string {
  const v = path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

// Exact field order required by PayMob for transaction HMAC verification.
const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
  "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
  "is_standalone_payment", "is_voided", "order.id", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

/** Every gateway callback is recorded, accepted or not, so payments are auditable. */
async function logCallback(supabase: any, entry: Record<string, unknown>) {
  try {
    await supabase.from("payment_callback_log").insert({ source: "paymob-webhook", ...entry });
  } catch (e) {
    console.error("callback log failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const HMAC_SECRET = Deno.env.get("PAYMOB_HMAC_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!HMAC_SECRET) throw new Error("PAYMOB_HMAC_SECRET not configured");

    const url = new URL(req.url);
    const hmacFromQuery = url.searchParams.get("hmac") || "";

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const obj = payload?.obj;
    if (!obj) {
      return new Response(JSON.stringify({ error: "Missing obj" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build concatenated string for HMAC and verify
    const concat = HMAC_FIELDS.map(f => pick(obj, f)).join("");
    const expected = await hmacSHA512Hex(HMAC_SECRET, concat);
    if (!hmacFromQuery || hmacFromQuery.toLowerCase() !== expected.toLowerCase()) {
      console.error("Invalid PayMob HMAC", { got: hmacFromQuery, expected: expected.slice(0, 16) + "..." });
      await logCallback(createClient(SUPABASE_URL, SERVICE_KEY), {
        paymob_txn_id: String(obj?.id || "") || null,
        paymob_order_id: String(obj?.order?.id || "") || null,
        accepted: false, reason: "invalid_signature", payload: payload,
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const success: boolean = !!obj.success && !obj.error_occured && !obj.is_refunded && !obj.is_voided;
    const paymobTxnId = String(obj.id || "");

    // Recover our internal reference. PayMob propagates extras under payment_key_claims.extra.
    let merchantOrderId: string =
      obj?.payment_key_claims?.extra?.merchant_order_id ||
      obj?.order?.merchant_order_id ||
      "";
    // Both the classic flow (order.merchant_order_id) and special_reference use
    // "<internalRef>_<timestamp>". Strip the trailing "_<digits>" so we recover
    // the original reference (e.g. "dp_<uuid>", "lc_<uuid>", "<order_uuid>").
    if (merchantOrderId) {
      merchantOrderId = merchantOrderId.replace(/_\d{10,}$/, "");
    } else {
      const sr: string = obj?.order?.shipping_data?.extra_description
        || obj?.payment_key_claims?.extra?.special_reference
        || "";
      if (sr) merchantOrderId = sr.replace(/_\d{10,}$/, "");
    }
    if (!merchantOrderId) {
      console.error("PayMob webhook: no merchant_order_id in payload");
      await logCallback(createClient(SUPABASE_URL, SERVICE_KEY), {
        paymob_txn_id: paymobTxnId || null,
        paymob_order_id: String(obj?.order?.id || "") || null,
        accepted: false, reason: "missing_merchant_order_id", success, payload: payload,
      });
      return new Response(JSON.stringify({ error: "Missing merchant_order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    console.log("PayMob webhook (verified)", { merchantOrderId, paymobTxnId, success });
    await logCallback(supabase, {
      kind: merchantOrderId.startsWith("lc_") ? "lc"
        : merchantOrderId.startsWith("sub_") ? "sub"
        : merchantOrderId.startsWith("dp_") ? "dp" : "order",
      reference: merchantOrderId,
      paymob_txn_id: paymobTxnId || null,
      paymob_order_id: String(obj?.order?.id || "") || null,
      accepted: true,
      success,
      amount_cents: Number(obj?.amount_cents) || null,
      payload: payload,
    });

    // Keep the gateway ids on our own row so any payment stays traceable.
    try {
      const table = merchantOrderId.startsWith("lc_") ? "live_course_purchases"
        : merchantOrderId.startsWith("sub_") ? "subscription_purchases"
        : merchantOrderId.startsWith("dp_") ? "digital_product_purchases" : "orders";
      const rowId = merchantOrderId.replace(/^(lc_|dp_|sub_)/, "");
      if (obj?.order?.id) {
        await supabase.from(table)
          .update({ paymob_order_id: String(obj.order.id) })
          .eq("id", rowId);
      }
    } catch (e) {
      console.error("failed to store paymob order id:", e);
    }

    // === Live course purchase ===
    if (merchantOrderId.startsWith("lc_")) {
      const purchaseId = merchantOrderId.slice(3);
      const meta = obj?.payment_key_claims?.extra || {};
      const okDone = await completeLiveCoursePurchase(
        supabase, SUPABASE_URL, SERVICE_KEY, purchaseId, paymobTxnId, success, meta,
      );
      return ok({ ok: okDone });
    }

    // === Yearly subscription ===
    if (merchantOrderId.startsWith("sub_")) {
      const purchaseId = merchantOrderId.slice(4);
      const okDone = await completeSubscriptionPurchase(
        supabase, SUPABASE_URL, SERVICE_KEY, purchaseId, paymobTxnId, success,
      );
      return ok({ ok: okDone });
    }

    // === Digital product purchase ===
    if (merchantOrderId.startsWith("dp_")) {
      const purchaseId = merchantOrderId.slice(3);
      const okDone = await completeDigitalProductPurchase(
        supabase, SUPABASE_URL, SERVICE_KEY, purchaseId, paymobTxnId, success,
      );
      return ok({ ok: okDone });
    }

    // === Main course order (UUID) ===
    const orderId = merchantOrderId;
    const okDone = await completeOrder(supabase, SUPABASE_URL, SERVICE_KEY, orderId, paymobTxnId, success);
    return ok({ ok: okDone });

  } catch (e) {
    console.error("PayMob webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
