// PayMob classic iframe integration (3-step flow + wallet pay)
// Docs: https://developers.paymob.com/egypt/accept-standard-redirect/getting-started-with-acceptance
// Card  -> https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={token}
// Wallet -> POST /api/acceptance/payments/pay -> returns redirect_url (PayMob OTP page)

import { createPaymobIntention } from "./paymob.ts";

/** Gateway references stored on our own record so a payment can always be looked up later. */
export interface PaymobPaymentRef {
  paymobOrderId: string | null;
  merchantReference: string;
}

export interface PaymobBilling {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

interface BaseParams {
  amountCents: number;
  merchantOrderId: string; // our internal reference (e.g. orderId or `dp_<id>`, `lc_<id>`)
  billing: PaymobBilling;
  itemName: string;
  itemDescription?: string;
  redirectUrl?: string;
}

interface CardParams extends BaseParams {}
interface WalletParams extends BaseParams {
  phoneNumber: string; // wallet identifier (Egyptian mobile, e.g. 01xxxxxxxxx)
}

const BASE = "https://accept.paymob.com/api";

async function authToken(): Promise<string> {
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

async function createOrder(
  p: BaseParams,
  token: string,
): Promise<{ id: number; merchantOrderId: string }> {
  const merchantOrderId = `${p.merchantOrderId}_${Date.now()}`;
  const res = await fetch(`${BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: p.amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items: [{
        name: p.itemName.slice(0, 80),
        amount_cents: p.amountCents,
        description: (p.itemDescription || p.itemName).slice(0, 200),
        quantity: 1,
      }],
    }),
  });
  if (!res.ok) throw new Error(`PayMob order failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data?.id) throw new Error("PayMob order: no id returned");
  return { id: data.id as number, merchantOrderId };
}

async function createPaymentKey(
  p: BaseParams,
  token: string,
  orderId: number,
  integrationId: number,
): Promise<string> {
  const res = await fetch(`${BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: p.amountCents,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        first_name: p.billing.first_name || "Customer",
        last_name: p.billing.last_name || "Ebdaey",
        email: p.billing.email,
        phone_number: p.billing.phone_number || "+201000000000",
        country: "EG",
        street: "NA",
        building: "NA",
        floor: "NA",
        apartment: "NA",
        city: "NA",
        state: "NA",
        postal_code: "NA",
        shipping_method: "NA",
      },
      currency: "EGP",
      integration_id: integrationId,
      redirection_url: p.redirectUrl,
    }),
  });
  if (!res.ok) throw new Error(`PayMob payment_key failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data?.token) throw new Error("PayMob payment_key: no token returned");
  return data.token as string;
}

export async function createCardIframe(p: CardParams): Promise<PaymobPaymentRef & { iframeUrl: string }> {
  const IFRAME = Deno.env.get("PAYMOB_IFRAME_ID_CARD");
  const INT_CARD = Deno.env.get("PAYMOB_INTEGRATION_ID_CARD");
  if (!IFRAME) throw new Error("PAYMOB_IFRAME_ID_CARD not configured");
  if (!INT_CARD) throw new Error("PAYMOB_INTEGRATION_ID_CARD not configured");

  const token = await authToken();
  const order = await createOrder(p, token);
  const paymentToken = await createPaymentKey(p, token, order.id, Number(INT_CARD));

  return {
    iframeUrl: `${BASE.replace("/api", "")}/api/acceptance/iframes/${IFRAME}?payment_token=${encodeURIComponent(paymentToken)}`,
    paymobOrderId: String(order.id),
    merchantReference: order.merchantOrderId,
  };
}

// Apple Pay cannot run inside the legacy acceptance iframe: that page always
// renders the card form. PayMob only serves the Apple Pay sheet from Unified
// Checkout (Intention API) loaded as a top-level page, so we return that URL.
export async function createApplePayIframe(p: CardParams): Promise<PaymobPaymentRef & { iframeUrl: string }> {
  const { checkoutUrl, intentionId, specialReference } = await createPaymobIntention({
    amountCents: p.amountCents,
    currency: "EGP",
    merchantOrderId: p.merchantOrderId,
    billing: p.billing,
    itemName: p.itemName,
    itemDescription: p.itemDescription,
    paymentMethod: "apple_pay",
    redirectUrl: p.redirectUrl,
  });
  return { iframeUrl: checkoutUrl, paymobOrderId: intentionId || null, merchantReference: specialReference };
}

// PayMob expects the wallet identifier as a local Egyptian mobile: 01XXXXXXXXX
function normalizeEgyptWallet(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length > 11) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = `0${d}`;
  return d;
}

export async function createWalletPayment(p: WalletParams): Promise<PaymobPaymentRef & { redirectUrl: string }> {
  const INT_WALLET = Deno.env.get("PAYMOB_INTEGRATION_ID_WALLET");
  if (!INT_WALLET) throw new Error("PAYMOB_INTEGRATION_ID_WALLET not configured");

  const identifier = normalizeEgyptWallet(p.phoneNumber);
  if (!/^01[0-25]\d{8}$/.test(identifier)) {
    throw new Error("INVALID_WALLET_PHONE");
  }

  const token = await authToken();
  const order = await createOrder(p, token);
  const paymentToken = await createPaymentKey(p, token, order.id, Number(INT_WALLET));

  const res = await fetch(`${BASE}/acceptance/payments/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: { identifier, subtype: "WALLET" },
      payment_token: paymentToken,
    }),
  });

  if (res.ok) {
    const data = await res.json().catch(() => null);
    const redirectUrl: string | undefined =
      data?.redirect_url || data?.iframe_redirection_url;
    if (redirectUrl) {
      return {
        redirectUrl,
        paymobOrderId: String(order.id),
        merchantReference: order.merchantOrderId,
      };
    }
  } else {
    console.error(`PayMob wallet pay failed: ${res.status} ${await res.text()}`);
  }

  // Fallback: PayMob's legacy direct wallet pay endpoint intermittently returns
  // HTML 500s. Unified Checkout handles the same wallet flow reliably.
  const fallback = await createPaymobIntention({
    amountCents: p.amountCents,
    currency: "EGP",
    merchantOrderId: p.merchantOrderId,
    billing: { ...p.billing, phone_number: identifier },
    itemName: p.itemName,
    itemDescription: p.itemDescription,
    paymentMethod: "wallet",
    redirectUrl: p.redirectUrl,
  });
  return {
    redirectUrl: fallback.checkoutUrl,
    paymobOrderId: fallback.intentionId || String(order.id),
    merchantReference: fallback.specialReference,
  };
}
