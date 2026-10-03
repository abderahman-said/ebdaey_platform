// PayMob transaction inquiry helpers.
// Used to read the REAL result of a payment straight from the gateway, so a
// missed webhook / interrupted browser return can never leave a paid order
// stuck as "pending".

const BASE = "https://accept.paymob.com/api";

export interface PaymobTxn {
  found: boolean;
  success: boolean;
  pending: boolean;
  txnId: string | null;
  paymobOrderId: string | null;
  merchantOrderId: string | null;
  amountCents: number | null;
  createdAt: string | null;
  errorOccured: boolean;
  refunded: boolean;
  voided: boolean;
  raw?: unknown;
}

const NOT_FOUND: PaymobTxn = {
  found: false, success: false, pending: false, txnId: null, paymobOrderId: null,
  merchantOrderId: null, amountCents: null, createdAt: null,
  errorOccured: false, refunded: false, voided: false,
};

export async function paymobAuthToken(): Promise<string> {
  const apiKey = Deno.env.get("PAYMOB_API_KEY");
  if (!apiKey) throw new Error("PAYMOB_API_KEY not configured");
  const res = await fetch(`${BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(`PayMob auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data?.token) throw new Error("PayMob auth: no token returned");
  return data.token as string;
}

function normalize(obj: any): PaymobTxn {
  if (!obj || (!obj.id && !obj.order)) return NOT_FOUND;
  const success = !!obj.success && !obj.error_occured && !obj.is_refunded && !obj.is_voided;
  return {
    found: true,
    success,
    pending: !!obj.pending,
    txnId: obj.id ? String(obj.id) : null,
    paymobOrderId: obj.order?.id ? String(obj.order.id) : (obj.order ? String(obj.order) : null),
    merchantOrderId: obj.order?.merchant_order_id ?? null,
    amountCents: typeof obj.amount_cents === "number" ? obj.amount_cents : null,
    createdAt: obj.created_at ?? null,
    errorOccured: !!obj.error_occured,
    refunded: !!obj.is_refunded,
    voided: !!obj.is_voided,
    raw: obj,
  };
}

/** Unified Checkout (Intention API) ids are non-numeric, e.g. "pi_live_...". */
export function isNumericPaymobOrderId(id: string | null | undefined): boolean {
  return !!id && /^\d+$/.test(String(id).trim());
}

/**
 * Unified Checkout (Apple Pay / wallet fallback) intentions have no readable
 * endpoint of their own — PayMob's /v1/intention/{id} route answers 405 for
 * every verb. They do, however, create a normal ecommerce order whose
 * merchant_order_id equals the intention's special_reference, so the numeric
 * order id can be looked up and then inquired through the legacy endpoint.
 */
export async function findPaymobOrderIdByMerchantRef(
  merchantOrderId: string,
  token?: string,
): Promise<string | null> {
  const auth = token || await paymobAuthToken();
  const res = await fetch(
    `${BASE}/ecommerce/orders?merchant_order_id=${encodeURIComponent(merchantOrderId)}`,
    { headers: { Authorization: `Bearer ${auth}` } },
  );
  if (!res.ok) {
    console.warn("order lookup by merchant_order_id failed", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const data = await res.json().catch(() => null);
  const results: any[] = data?.results || data?.data || [];
  const hit = results.find((o) => String(o?.merchant_order_id || "") === merchantOrderId) || results[0];
  return hit?.id ? String(hit.id) : null;
}

/** Inquiry by the gateway's own numeric order id (legacy acceptance flow). */
export async function inquireByPaymobOrderId(orderId: string, token?: string): Promise<PaymobTxn> {
  if (!isNumericPaymobOrderId(orderId)) {
    // Intention ids are not accepted here; resolvePaymentStatus maps them to the
    // numeric ecommerce order id via their special_reference first.
    return NOT_FOUND;
  }
  const auth = token || await paymobAuthToken();
  const res = await fetch(`${BASE}/ecommerce/orders/transaction_inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_token: auth, order_id: Number(orderId) || orderId }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn("inquiry by order_id failed", res.status, text.slice(0, 200));
    return NOT_FOUND;
  }
  try { return normalize(JSON.parse(text)); } catch { return NOT_FOUND; }
}

/** Inquiry by the merchant_order_id we sent (`<ref>_<timestamp>`). */
export async function inquireByMerchantOrderId(merchantOrderId: string, token?: string): Promise<PaymobTxn> {
  const auth = token || await paymobAuthToken();
  const res = await fetch(`${BASE}/ecommerce/orders/transaction_inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_token: auth, merchant_order_id: merchantOrderId }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.warn("inquiry by merchant_order_id failed", res.status, text.slice(0, 200));
    return NOT_FOUND;
  }
  try { return normalize(JSON.parse(text)); } catch { return NOT_FOUND; }
}

/**
 * Legacy rows have no stored gateway reference. Walk the merchant's recent
 * orders and match `merchant_order_id` that starts with our internal
 * reference (we always send `<ref>_<timestamp>`).
 */
export async function findPaymobOrdersByPrefix(
  prefix: string,
  token?: string,
  maxPages = 6,
): Promise<{ paymobOrderId: string; merchantOrderId: string }[]> {
  const auth = token || await paymobAuthToken();
  const hits: { paymobOrderId: string; merchantOrderId: string }[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${BASE}/ecommerce/orders?page=${page}&page_size=100`, {
      headers: { Authorization: `Bearer ${auth}` },
    });
    if (!res.ok) {
      console.warn("paymob orders list failed", res.status, (await res.text()).slice(0, 200));
      break;
    }
    const data = await res.json().catch(() => null);
    const results: any[] = data?.results || data?.data || [];
    for (const o of results) {
      const mref = String(o?.merchant_order_id || "");
      if (mref === prefix || mref.startsWith(`${prefix}_`)) {
        hits.push({ paymobOrderId: String(o.id), merchantOrderId: mref });
      }
    }
    if (hits.length > 0) break;
    if (!data?.next) break;
  }
  return hits;
}

/**
 * Best-effort resolution of a payment's real status.
 * `paymobOrderId` (stored at creation time) is used when present; otherwise we
 * search the merchant's recent orders by our internal reference prefix.
 */
export async function resolvePaymentStatus(opts: {
  internalReference: string;            // e.g. order uuid, or "lc_<uuid>"
  paymobOrderId?: string | null;
  merchantReference?: string | null;     // stored `<ref>_<timestamp>`
  token?: string;
}): Promise<PaymobTxn> {
  const token = opts.token || await paymobAuthToken();

  if (opts.paymobOrderId && isNumericPaymobOrderId(opts.paymobOrderId)) {
    const r = await inquireByPaymobOrderId(opts.paymobOrderId, token);
    if (r.found) return r;
  } else if (opts.paymobOrderId && opts.merchantReference) {
    // Unified Checkout intention: its ecommerce order carries the intention's
    // special_reference as merchant_order_id.
    const numeric = await findPaymobOrderIdByMerchantRef(opts.merchantReference, token);
    if (numeric) {
      const r = await inquireByPaymobOrderId(numeric, token);
      if (r.found) return { ...r, paymobOrderId: r.paymobOrderId ?? numeric };
    }
  }

  if (opts.merchantReference) {
    const r = await inquireByMerchantOrderId(opts.merchantReference, token);
    if (r.found) return r;
  }




  const candidates = await findPaymobOrdersByPrefix(opts.internalReference, token);
  let best: PaymobTxn = NOT_FOUND;
  for (const c of candidates) {
    const r = await inquireByPaymobOrderId(c.paymobOrderId, token);
    if (r.found) {
      if (r.success) return r;         // a successful attempt wins immediately
      if (!best.found) best = r;
    }
  }
  return best;
}
