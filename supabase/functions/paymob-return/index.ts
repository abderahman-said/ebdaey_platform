import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { completeLiveCoursePurchase } from "../_shared/complete-lc-purchase.ts";
import { completeSubscriptionPurchase } from "../_shared/complete-subscription.ts";
import { completeOrder } from "../_shared/complete-order.ts";
import { completeDigitalProductPurchase } from "../_shared/complete-dp-purchase.ts";
import { resolvePaymentStatus } from "../_shared/paymob-inquiry.ts";

const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
  "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
  "is_standalone_payment", "is_voided", "order", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

async function hmacSHA512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function param(params: URLSearchParams, key: string): string {
  return params.get(key)
    ?? params.get(key.replace(/\./g, "_"))
    ?? (key === "order" ? params.get("order.id") ?? params.get("order_id") : null)
    ?? "";
}

function isAllowedReturnUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host === "localhost"
      || host.endsWith(".ebdaey.com")
      || host === "ebdaey.com"
      || host.endsWith(".lovable.app")
      // Lovable's authenticated workspace preview uses this host. Keeping the
      // original same-origin return URL preserves sessionStorage and the
      // /{mentor}/booking/{key}/payment route used by the two-step checkout.
      || host.endsWith(".lovableproject.com");
    return allowed ? url : null;
  } catch {
    return null;
  }
}

async function deriveReturnUrlFromDb(
  supabase: any,
  purchaseId: string | null,
  kind: string | null,
): Promise<URL> {
  const fallback = new URL("https://ebdaey.com/");
  if (!purchaseId) return fallback;
  try {
    if (kind === "lc") {
      const { data } = await supabase
        .from("live_course_purchases")
        .select("payment_key, tenants:tenant_id(slug), live_courses:live_course_id(slug)")
        .eq("id", purchaseId)
        .maybeSingle();
      const tSlug = data?.tenants?.slug;
      const cSlug = data?.live_courses?.slug;
      if (tSlug && data?.payment_key) return new URL(`https://${tSlug}.ebdaey.com/l-booking/${data.payment_key}/payment`);
      if (tSlug && cSlug) return new URL(`https://${tSlug}.ebdaey.com/l/${cSlug}/payment`);
    } else if (kind === "dp") {
      const { data } = await supabase
        .from("digital_product_purchases")
        .select("payment_key, tenants:tenant_id(slug), digital_products:digital_product_id(slug)")
        .eq("id", purchaseId)
        .maybeSingle();
      const tSlug = data?.tenants?.slug;
      const pSlug = data?.digital_products?.slug;
      // DP flow uses the two-step /booking/{payment_key}/payment page,
      // which restores sessionStorage and shows the failure toast.
      if (tSlug && data?.payment_key) return new URL(`https://${tSlug}.ebdaey.com/booking/${data.payment_key}/payment`);
      if (tSlug && pSlug) return new URL(`https://${tSlug}.ebdaey.com/p/${pSlug}/payment`);
    } else if (kind === "sub") {
      const { data } = await supabase
        .from("subscription_purchases")
        .select("payment_key, tenants:tenant_id(slug)")
        .eq("id", purchaseId)
        .maybeSingle();
      const tSlug = data?.tenants?.slug;
      if (tSlug) return new URL(`https://${tSlug}.ebdaey.com/subscribe/payment`);
    } else if (kind === "order") {
      const { data } = await supabase
        .from("orders")
        .select("payment_key, tenants:tenant_id(slug), courses:course_id(slug)")
        .eq("id", purchaseId)
        .maybeSingle();
      const tSlug = data?.tenants?.slug;
      const cSlug = data?.courses?.slug;
      if (tSlug && data?.payment_key) return new URL(`https://${tSlug}.ebdaey.com/c-booking/${data.payment_key}/payment`);
      if (tSlug && cSlug) return new URL(`https://${tSlug}.ebdaey.com/c/${cSlug}/payment`);
    }
  } catch (e) {
    console.error("deriveReturnUrlFromDb error:", e);
  }
  return fallback;
}

function redirectTo(returnUrl: URL, status: "SUCCESS" | "FAILED", purchaseId: string | null, kind?: string | null, reason?: string, gateway?: { code?: string; message?: string; acq?: string }) {
  returnUrl.searchParams.set("paymentStatus", status);
  if (purchaseId) {
    // Match the id param the app page expects: orders read `orderId`, everything
    // else reads `purchaseId`.
    if (kind === "order") returnUrl.searchParams.set("orderId", purchaseId);
    else returnUrl.searchParams.set("purchaseId", purchaseId);
  }
  if (reason) returnUrl.searchParams.set("reason", reason);
  if (gateway?.code) returnUrl.searchParams.set("gwCode", gateway.code);
  if (gateway?.message) returnUrl.searchParams.set("gwMessage", gateway.message.slice(0, 200));
  if (gateway?.acq) returnUrl.searchParams.set("gwAcq", gateway.acq);
  return new Response(null, { status: 302, headers: { Location: returnUrl.toString() } });
}

const TABLE_BY_KIND: Record<string, string> = {
  order: "orders",
  lc: "live_course_purchases",
  dp: "digital_product_purchases",
  sub: "subscription_purchases",
};

/** Every gateway callback is recorded, accepted or not, so payments are auditable. */
async function logCallback(supabase: any, entry: Record<string, unknown>) {
  try {
    await supabase.from("payment_callback_log").insert({ source: "paymob-return", ...entry });
  } catch (e) {
    console.error("callback log failed:", e);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const purchaseId = url.searchParams.get("purchaseId");
  const kind = url.searchParams.get("kind");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Prefer explicit returnUrl if PayMob preserved it; otherwise derive from DB
  // so we always land back on the correct product page (PayMob can strip nested
  // query params from the redirection URL).
  const explicit = isAllowedReturnUrl(url.searchParams.get("returnUrl"));
  const returnUrl = explicit ?? await deriveReturnUrlFromDb(supabase, purchaseId, kind);

  try {
    if (!purchaseId || (kind !== "dp" && kind !== "lc" && kind !== "order" && kind !== "sub")) {
      await logCallback(supabase, { kind, reference: purchaseId, accepted: false, reason: "missing_purchase", payload: Object.fromEntries(url.searchParams) });
      return redirectTo(returnUrl, "FAILED", purchaseId, kind, "missing_purchase");
    }

    const hmacSecret = Deno.env.get("PAYMOB_HMAC_SECRET");
    if (!hmacSecret) throw new Error("PAYMOB_HMAC_SECRET not configured");

    const hmac = url.searchParams.get("hmac") || "";
    const concat = HMAC_FIELDS.map((field) => param(url.searchParams, field)).join("");
    const expected = await hmacSHA512Hex(hmacSecret, concat);

    if (!hmac || hmac.toLowerCase() !== expected.toLowerCase()) {
      console.error("Invalid PayMob return HMAC", { purchaseId });
      await logCallback(supabase, { kind, reference: purchaseId, accepted: false, reason: "invalid_signature", payload: Object.fromEntries(url.searchParams) });
      return redirectTo(returnUrl, "FAILED", purchaseId, kind, "invalid_signature");
    }

    const success = param(url.searchParams, "success") === "true"
      && param(url.searchParams, "error_occured") !== "true"
      && param(url.searchParams, "is_refunded") !== "true"
      && param(url.searchParams, "is_voided") !== "true";
    let paymobTxnId = param(url.searchParams, "id");
    const paymobOrderIdFromReturn = param(url.searchParams, "order");

    // The signature covers the PayMob order id but NOT our purchaseId/kind
    // query params. Bind them: the signed PayMob order must be the one created
    // for this exact purchase, otherwise a valid return could be replayed
    // against someone else's purchase.
    {
      const table = TABLE_BY_KIND[kind];
      const { data: bindRow } = await supabase
        .from(table).select("paymob_order_id").eq("id", purchaseId).maybeSingle();
      let expectedOrder: string | null = bindRow?.paymob_order_id ? String(bindRow.paymob_order_id) : null;
      if (!expectedOrder) {
        try {
          const txn = await resolvePaymentStatus({
            internalReference: kind === "order" ? purchaseId : `${kind}_${purchaseId}`,
            paymobOrderId: null,
            merchantReference: null,
          });
          if (txn.found && txn.paymobOrderId) expectedOrder = String(txn.paymobOrderId);
        } catch (e) {
          console.error("order binding lookup failed:", e);
        }
      }
      if (!paymobOrderIdFromReturn || !expectedOrder || expectedOrder !== String(paymobOrderIdFromReturn)) {
        console.error("PayMob return order mismatch", { purchaseId, kind });
        await logCallback(supabase, { kind, reference: purchaseId, paymob_order_id: paymobOrderIdFromReturn || null, accepted: false, reason: "order_mismatch", payload: Object.fromEntries(url.searchParams) });
        return redirectTo(returnUrl, "FAILED", purchaseId, kind, "order_mismatch");
      }
    }

    // Some returns arrive without a transaction id. Ask PayMob directly so the
    // reference is never lost on a paid order.
    if (!paymobTxnId) {
      try {
        const table = TABLE_BY_KIND[kind];
        const { data: row } = await supabase
          .from(table)
          .select("paymob_order_id, paymob_special_reference")
          .eq("id", purchaseId)
          .maybeSingle();
        const txn = await resolvePaymentStatus({
          internalReference: kind === "order" ? purchaseId : `${kind}_${purchaseId}`,
          paymobOrderId: paymobOrderIdFromReturn || row?.paymob_order_id || null,
          merchantReference: row?.paymob_special_reference || null,
        });
        if (txn.found && txn.txnId) paymobTxnId = txn.txnId;
        if (txn.found && txn.paymobOrderId) {
          await supabase.from(table)
            .update({ paymob_order_id: String(txn.paymobOrderId) })
            .eq("id", purchaseId);
        }
      } catch (e) {
        console.error("txn id rescue failed:", e);
      }
    } else if (paymobOrderIdFromReturn) {
      await supabase.from(TABLE_BY_KIND[kind])
        .update({ paymob_order_id: String(paymobOrderIdFromReturn) })
        .eq("id", purchaseId);
    }
    const gateway = success ? undefined : {
      code: param(url.searchParams, "txn_response_code") || undefined,
      message: param(url.searchParams, "data.message") || param(url.searchParams, "data_message") || undefined,
      acq: param(url.searchParams, "data.acq_response_code") || param(url.searchParams, "data_acq_response_code") || undefined,
    };
    await logCallback(supabase, {
      kind,
      reference: purchaseId,
      paymob_order_id: paymobOrderIdFromReturn || null,
      paymob_txn_id: paymobTxnId || null,
      accepted: true,
      success,
      amount_cents: Number(param(url.searchParams, "amount_cents")) || null,
      payload: Object.fromEntries(url.searchParams),
    });

    const completed = kind === "sub"
      ? await completeSubscriptionPurchase(supabase, supabaseUrl, serviceKey, purchaseId, paymobTxnId, success)
      : kind === "lc"
      ? await completeLiveCoursePurchase(supabase, supabaseUrl, serviceKey, purchaseId, paymobTxnId, success)
      : kind === "order"
        ? await completeOrder(supabase, supabaseUrl, serviceKey, purchaseId, paymobTxnId, success)
        : await completeDigitalProductPurchase(supabase, supabaseUrl, serviceKey, purchaseId, paymobTxnId, success);

    return redirectTo(returnUrl, completed ? "SUCCESS" : "FAILED", purchaseId, kind, undefined, completed ? undefined : gateway);
  } catch (error) {
    console.error("paymob-return error:", error);
    await logCallback(supabase, { kind, reference: purchaseId, accepted: false, reason: "processing_error", payload: Object.fromEntries(url.searchParams) });
    return redirectTo(returnUrl, "FAILED", purchaseId, kind, "processing_error");
  }
});