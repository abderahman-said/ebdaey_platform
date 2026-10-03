// PayMob Unified Checkout (Intention API) helper
// Docs: https://developers.paymob.com/egypt/api-reference-guide/checkout-experience/unified-checkout

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface PaymobIntentionParams {
  amountCents: number;
  currency: string;
  merchantOrderId: string; // our internal reference (e.g. "dp_<id>", "lc_<id>", "<order_uuid>")
  billing: PaymobBillingData;
  itemName: string;
  itemDescription?: string;
  paymentMethod?: "card" | "wallet" | "apple_pay" | "all";
  extras?: Record<string, unknown>;
  redirectUrl?: string;
}

export interface PaymobIntentionResult {
  clientSecret: string;
  intentionId: string;
  checkoutUrl: string;
  specialReference: string;
}

export async function createPaymobIntention(p: PaymobIntentionParams): Promise<PaymobIntentionResult> {
  const SECRET = Deno.env.get("PAYMOB_SECRET_KEY");
  const PUBLIC = Deno.env.get("PAYMOB_PUBLIC_KEY");
  const INT_CARD = Deno.env.get("PAYMOB_INTEGRATION_ID_CARD");
  const INT_WALLET = Deno.env.get("PAYMOB_INTEGRATION_ID_WALLET");
  const INT_APPLE_PAY = Deno.env.get("PAYMOB_INTEGRATION_ID_APPLE_PAY");

  if (!SECRET || !PUBLIC) throw new Error("PayMob secret/public key not configured");
  if (!INT_CARD && !INT_WALLET) throw new Error("PayMob integration IDs not configured");

  let methods: number[] = [];
  if (p.paymentMethod === "card") {
    if (INT_CARD) methods.push(Number(INT_CARD));
  } else if (p.paymentMethod === "wallet") {
    if (INT_WALLET) methods.push(Number(INT_WALLET));
  } else if (p.paymentMethod === "apple_pay") {
    if (!INT_APPLE_PAY) throw new Error("PAYMOB_INTEGRATION_ID_APPLE_PAY not configured");
    methods.push(Number(INT_APPLE_PAY));
  } else {
    if (INT_CARD) methods.push(Number(INT_CARD));
    if (INT_WALLET) methods.push(Number(INT_WALLET));
  }
  if (methods.length === 0) throw new Error("No PayMob payment methods available");

  // PayMob requires globally-unique special_reference per intention.
  const specialReference = `${p.merchantOrderId}_${Date.now()}`;

  const body = {
    amount: p.amountCents,
    currency: p.currency,
    payment_methods: methods,
    items: [{
      name: p.itemName.slice(0, 80),
      amount: p.amountCents,
      description: (p.itemDescription || p.itemName).slice(0, 200),
      quantity: 1,
    }],
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
    },
    customer: {
      first_name: p.billing.first_name || "Customer",
      last_name: p.billing.last_name || "Ebdaey",
      email: p.billing.email,
    },
    extras: { merchant_order_id: p.merchantOrderId, ...(p.extras || {}) },
    special_reference: specialReference,
    ...(p.redirectUrl ? { redirection_url: p.redirectUrl } : {}),
  };

  const res = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: {
      "Authorization": `Token ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("PayMob intention error:", res.status, text);
    throw new Error(`PayMob intention failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text);
  const clientSecret: string | undefined = data?.client_secret;
  const intentionId: string | undefined = data?.id;
  if (!clientSecret) throw new Error("PayMob did not return client_secret");

  const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(PUBLIC)}&clientSecret=${encodeURIComponent(clientSecret)}`;

  return { clientSecret, intentionId: intentionId || "", checkoutUrl, specialReference };
}
