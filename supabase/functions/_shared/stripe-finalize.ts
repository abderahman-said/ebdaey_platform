// Shared Stripe fulfillment: used by stripe-webhook and stripe-confirm
// (browser return fallback) so a paid order completes even if the webhook
// is delayed or not configured.
import { completeOrder } from "./complete-order.ts";
import { completeSubscriptionPurchase } from "./complete-subscription.ts";
import { completeDigitalProductPurchase } from "./complete-dp-purchase.ts";
import { completeLiveCoursePurchase } from "./complete-lc-purchase.ts";
import { retrieveSession, stripeGatewayFeeUsd } from "./stripe.ts";

export type StripeKind = "lc" | "sub" | "dp" | "order";
export const STRIPE_TABLES: Record<StripeKind, string> = {
  lc: "live_course_purchases", sub: "subscription_purchases", dp: "digital_product_purchases", order: "orders",
};

/** Verify a Stripe session against Stripe and fulfill the row. Idempotent. */
export async function finalizeStripeSession(
  supabase: any, supabaseUrl: string, serviceKey: string, kind: StripeKind, rowId: string, sessionId: string,
): Promise<{ ok: boolean; paid: boolean; error?: string }> {
  const table = STRIPE_TABLES[kind];
  const { data: row } = await supabase.from(table).select("id, stripe_session_id, currency").eq("id", rowId).maybeSingle();
  if (!row) return { ok: false, paid: false, error: "not_found" };

  const session = await retrieveSession(sessionId);
  const ref: string = session.metadata?.merchant_order_id || session.client_reference_id || "";
  if (!ref.endsWith(rowId)) return { ok: false, paid: false, error: "reference_mismatch" };
  // A retried checkout can replace the stored session id; an older, unpaid
  // session must never override a newer one.
  if (row.stripe_session_id !== sessionId && session.payment_status !== "paid") return { ok: true, paid: false };

  const success = session.payment_status === "paid";
  // Still open (customer hasn't finished) — don't mark failed.
  if (!success && session.status === "open") return { ok: true, paid: false };

  const pi = session.payment_intent;
  const txnId = typeof pi === "string" ? pi : pi?.id ?? null;

  if (success) {
    const bt = pi?.latest_charge?.balance_transaction;
    // Amount the buyer paid, in the currency they were charged (Stripe sends minor units).
    const chargedAmount = Number(session.amount_total) / 100;
    // True USD value after Stripe settlement. Only trust a conversion when Stripe
    // actually gives us one: a balance transaction already in USD, or one carrying
    // an exchange rate to the account's settlement currency (USD).
    let settledUsd: number | null = null;
    if (bt) {
      if (bt.currency === "usd") settledUsd = bt.amount / 100;
      else if (bt.exchange_rate) settledUsd = Math.round((bt.amount / 100) * Number(bt.exchange_rate) * 100) / 100;
    }
    // No real rate available (e.g. Stripe test mode has no FX): keep the charged
    // amount so fees/records still have a basis. The UI hides the "after
    // conversion" note when settled_usd equals the charged amount.
    if (settledUsd == null) settledUsd = chargedAmount;
    const platformFee = Math.round(settledUsd * 0.08 * 100) / 100;
    const gatewayFee = stripeGatewayFeeUsd(settledUsd, row.currency || session.currency);
    const patch: Record<string, unknown> = {
      settled_usd: settledUsd, platform_fee: platformFee, gateway_fee: gatewayFee, gateway: "stripe",
      mentor_net: Math.round((settledUsd - platformFee - gatewayFee) * 100) / 100,
    };
    // gross_amount/amount must stay in the currency the buyer was charged.
    if (kind === "sub") patch.amount = chargedAmount; else patch.gross_amount = chargedAmount;
    await supabase.from(table).update(patch).eq("id", rowId);
  }

  let done = false;
  if (kind === "lc") done = await completeLiveCoursePurchase(supabase, supabaseUrl, serviceKey, rowId, txnId, success, {});
  else if (kind === "sub") done = await completeSubscriptionPurchase(supabase, supabaseUrl, serviceKey, rowId, txnId, success);
  else if (kind === "dp") done = await completeDigitalProductPurchase(supabase, supabaseUrl, serviceKey, rowId, txnId, success);
  else done = await completeOrder(supabase, supabaseUrl, serviceKey, rowId, txnId, success);
  return { ok: done, paid: success };
}
