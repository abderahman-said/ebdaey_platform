// Stripe helpers (REST, no SDK) + per-country price resolution.
const STRIPE_API = "https://api.stripe.com/v1";
const ZERO_DECIMAL = new Set<string>([]); // none of our currencies are zero-decimal

export const STRIPE_CURRENCIES = ["USD", "SAR", "AED", "QAR", "GBP", "EUR"];

export type ResolvedPrice = { currency: string; price: number; compare_at_price: number | null; country_code: string | null };

/** Price for a buyer's country: country row → default row → null (use legacy EGP price). */
export async function resolveProductPrice(
  supabase: any, productType: string, productId: string, country: string | null,
): Promise<ResolvedPrice | null> {
  const { data } = await supabase.from("product_prices")
    .select("country_code, currency, price, compare_at_price")
    .eq("product_type", productType).eq("product_id", productId);
  const rows = (data || []) as any[];
  const cc = (country || "").toUpperCase();
  const row = rows.find((r) => r.country_code === cc) ?? rows.find((r) => r.country_code === null);
  if (!row) return null;
  return { currency: row.currency, price: Number(row.price) || 0, compare_at_price: row.compare_at_price, country_code: row.country_code ?? null };
}

async function stripeFetch(path: string, params?: Record<string, string>, method = "POST") {
  // Test mode: when STRIPE_TEST_API_KEY is set it takes priority. Delete that secret to go back live.
  const key = Deno.env.get("STRIPE_TEST_API_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("stripe_not_configured");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `stripe_${res.status}`);
  return json;
}

export async function createStripeCheckout(opts: {
  merchantOrderId: string; amount: number; currency: string; itemName: string;
  email?: string; successUrl: string; cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const cur = opts.currency.toLowerCase();
  const unit = ZERO_DECIMAL.has(cur) ? Math.round(opts.amount) : Math.round(opts.amount * 100);
  const p: Record<string, string> = {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.merchantOrderId,
    "metadata[merchant_order_id]": opts.merchantOrderId,
    "payment_intent_data[metadata][merchant_order_id]": opts.merchantOrderId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": cur,
    "line_items[0][price_data][unit_amount]": String(unit),
    "line_items[0][price_data][product_data][name]": opts.itemName.slice(0, 250) || "Ebdaey",
  };
  if (opts.email) p.customer_email = opts.email;
  const s = await stripeFetch("/checkout/sessions", p);
  return { id: s.id, url: s.url };
}

export async function retrieveSession(id: string) {
  return stripeFetch(`/checkout/sessions/${id}?expand[]=payment_intent.latest_charge.balance_transaction`, undefined, "GET");
}

/** Verify Stripe-Signature header (v1, HMAC-SHA256, 5 min tolerance). */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t; const sigs = header.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && s === hex);
}

/** Stripe fees shown to mentors: 4.4% + $0.30, +1% FX for non-USD. */
export function stripeGatewayFeeUsd(chargeUsd: number, currency: string) {
  const fx = currency.toUpperCase() === "USD" ? 0 : 0.01;
  return Math.round((chargeUsd * (0.044 + fx) + 0.3) * 100) / 100;
}

/** Add-on price for the buyer's price row (null = add-on not offered for that row). */
export async function bumpPriceFor(
  supabase: any, kind: "course" | "dp", bumpId: string, countryCode: string | null,
): Promise<number | null> {
  let q = supabase.from("order_bump_prices").select("price, discount_price").eq("bump_kind", kind).eq("bump_id", bumpId);
  q = countryCode ? q.eq("country_code", countryCode) : q.is("country_code", null);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  return Number(data.discount_price ?? data.price) || 0;
}

/** Fixed coupon amount in a currency (null = coupon has no amount for that currency). */
export async function couponAmountFor(supabase: any, coupon: any, currency: string): Promise<number | null> {
  const { data } = await supabase.from("coupon_amounts").select("amount")
    .eq("coupon_id", coupon.id).eq("currency", currency).maybeSingle();
  if (data) return Number(data.amount) || 0;
  return null;
}
