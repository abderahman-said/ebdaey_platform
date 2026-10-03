import { createClient } from "npm:@supabase/supabase-js@2";
import { createApplePayIframe, createCardIframe, createWalletPayment } from "../_shared/paymob-iframe.ts";
import { completeSubscriptionPurchase } from "../_shared/complete-subscription.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { detectCountry } from "../_shared/geo.ts";
import { resolveProductPrice, createStripeCheckout } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function withQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function buildPaymobReturnUrl(supabaseUrl: string, appReturnUrl: string, purchaseId: string): string {
  const returnUrl = withQueryParam(appReturnUrl, "purchaseId", purchaseId);
  const u = new URL(`${supabaseUrl}/functions/v1/paymob-return`);
  u.searchParams.set("kind", "sub");
  u.searchParams.set("purchaseId", purchaseId);
  u.searchParams.set("returnUrl", returnUrl);
  return u.toString();
}


async function callerUserId(req: Request, supabase: any): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(auth.slice(7)).catch(() => ({ data: null }));
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const {
      tenant_id, redirect_url, first_name, last_name, email, phone,
      payment_method, wallet_phone, payment_key,
    } = body;
    const buyerCountry = detectCountry(req, { tz: body?.tz, locale: body?.locale });

    if (!tenant_id || !redirect_url || !email || !first_name || !last_name) {
      return json({ error: "Missing required fields" }, 400);
    }

  const limited = await rateLimitGuard(req, { name: "subscription-checkout", max: 20, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;


    // ── Plan must exist, be active, and subscriptions enabled for the tenant ──
    const { data: tenant } = await supabase
      .from("tenants").select("id, subscriptions_enabled").eq("id", tenant_id).maybeSingle();
    if (!tenant?.subscriptions_enabled) return json({ error: "subscriptions_disabled" }, 400);

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id, price, includes_digital_products, is_active")
      .eq("tenant_id", tenant_id).eq("plan_type", "yearly").eq("is_active", true)
      .maybeSingle();
    if (!plan) return json({ error: "plan_unavailable" }, 400);
    const localPrice = await resolveProductPrice(supabase, "subscription_plan", plan.id, buyerCountry);
    const stripeCurrency = localPrice && localPrice.currency !== "EGP" ? localPrice.currency : null;
    if (localPrice) (plan as any).price = localPrice.price;


    // ── Find or create the auth user ──
    let userId: string;
    let existingUser: any = null;
    for (let page = 1; page <= 20 && !existingUser; page++) {
      const { data: pageData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      const users = pageData?.users || [];
      existingUser = users.find((u: any) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (users.length < 1000) break;
    }

    if (existingUser) {
      // An existing account may only be charged/subscribed by its signed-in owner.
      const caller = await callerUserId(req, supabase);
      if (caller !== existingUser.id) return json({ error: "login_required" }, 200);
      userId = existingUser.id;
    } else {
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${first_name} ${last_name}`, role: "student", phone: phone || undefined },
      });
      if (createErr || !newUser?.user) {
        return json({ error: "Failed to create account: " + (createErr?.message || "") }, 500);
      }
      userId = newUser.user.id;
      await supabase.from("user_roles").upsert({ user_id: userId, role: "student" }, { onConflict: "user_id,role" });
    }

    // ── Find or create the tenant-scoped student ──
    let { data: student } = await supabase
      .from("students").select("id")
      .eq("user_id", userId).eq("tenant_id", tenant_id).maybeSingle();

    if (!student) {
      const { data: newStudent, error: studentErr } = await supabase
        .from("students")
        .insert({
          user_id: userId, tenant_id,
          full_name: `${first_name} ${last_name}`,
          email, phone: phone || null,
        })
        .select("id").single();
      if (studentErr || !newStudent) return json({ error: "Failed to create student" }, 500);
      student = newStudent;
    }

    // ── Already subscribed? ──
    const { data: activeSub } = await supabase
      .from("subscription_purchases")
      .select("id, expires_at")
      .eq("student_id", student.id).eq("tenant_id", tenant_id)
      .eq("payment_status", "completed")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (activeSub) return json({ error: "already_subscribed" }, 200);

    const grossAmount = Math.max(0, Number(plan.price) || 0);
    const starts = new Date();
    const expires = new Date(starts);
    expires.setFullYear(expires.getFullYear() + 1);

    // ── Free plan: activate immediately ──
    if (grossAmount <= 0) {
      const { data: freeSub } = await supabase
        .from("subscription_purchases")
        .insert({
          tenant_id, student_id: student.id, plan_id: plan.id,
          buyer_country: buyerCountry,
          amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
          payment_status: "pending",
          starts_at: starts.toISOString(), expires_at: expires.toISOString(),
          payment_key: payment_key || null,
        })
        .select("id").single();
      if (freeSub?.id) {
        await completeSubscriptionPurchase(supabase, SUPABASE_URL, SERVICE_KEY, freeSub.id, "", true);
      }
      return json({ free: true, purchase_id: freeSub?.id });
    }

    // ── Paid: fees + pending row ──
    const platformFee = Math.round(grossAmount * 0.08 * 100) / 100;
    const gatewayFee = Math.round((grossAmount * 0.02 + 2) * 1.14 * 100) / 100;
    const mentorNet = Math.round((grossAmount - platformFee - gatewayFee) * 100) / 100;

    const fields = {
      tenant_id, student_id: student.id, plan_id: plan.id,
      buyer_country: buyerCountry,
      amount: grossAmount, platform_fee: platformFee, gateway_fee: gatewayFee, mentor_net: mentorNet,
      payment_status: "pending",
      starts_at: starts.toISOString(), expires_at: expires.toISOString(),
      payment_key: payment_key || null,
    };

    let purchase: { id: string } | null = null;
    if (payment_key) {
      const { data: existing } = await supabase
        .from("subscription_purchases").select("id, payment_status")
        .eq("payment_key", payment_key).maybeSingle();
      if (existing) {
        if (existing.payment_status === "completed") return json({ error: "already_subscribed" }, 200);
        const { data: updated } = await supabase
          .from("subscription_purchases").update(fields).eq("id", existing.id).select("id").single();
        purchase = updated;
      }
    }

    if (!purchase) {
      const { data: inserted, error: insErr } = await supabase
        .from("subscription_purchases").insert(fields).select("id").single();
      if (insErr || !inserted) {
        console.error("insert subscription failed:", insErr);
        return json({ error: "Failed to create subscription", detail: insErr?.message }, 500);
      }
      purchase = inserted;
    }

    if (stripeCurrency) {
      const sep = String(redirect_url).includes("?") ? "&" : "?";
      const back = `${redirect_url}${sep}purchaseId=${purchase.id}&gateway=stripe`;
      const session = await createStripeCheckout({
        merchantOrderId: `sub_${purchase.id}`, amount: grossAmount, currency: stripeCurrency,
        itemName: "Yearly subscription", email: email, successUrl: back, cancelUrl: back + "&cancelled=1",
      });
      await supabase.from("subscription_purchases").update({
        gateway: "stripe", currency: stripeCurrency, amount_paid: grossAmount, stripe_session_id: session.id,
      }).eq("id", purchase.id);
      return new Response(JSON.stringify({ iframe_url: session.url, purchase_id: purchase.id, method: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("subscription_purchases").update({ gateway: "paymob", currency: "EGP", amount_paid: grossAmount }).eq("id", purchase.id);

    const paymobReturnUrl = buildPaymobReturnUrl(SUPABASE_URL, redirect_url, purchase.id);
    const baseArgs = {
      amountCents: Math.round(grossAmount * 100),
      merchantOrderId: `sub_${purchase.id}`,
      billing: { first_name, last_name, email, phone_number: phone || "+201000000000" },
      itemName: "الاشتراك السنوي",
      redirectUrl: paymobReturnUrl,
    };

    let iframeUrl: string;
    let gatewayRef: { paymobOrderId: string | null; merchantReference: string } | null = null;
    if (payment_method === "wallet") {
      if (!wallet_phone || !/^01[0-9]{9}$/.test(String(wallet_phone))) {
        return json({ error: "invalid_wallet_phone" }, 400);
      }
      const r = await createWalletPayment({ ...baseArgs, phoneNumber: String(wallet_phone) });
      iframeUrl = r.redirectUrl;
      gatewayRef = r;
    } else if (payment_method === "apple_pay") {
      const r = await createApplePayIframe(baseArgs);
      iframeUrl = r.iframeUrl;
      gatewayRef = r;
    } else {
      const r = await createCardIframe(baseArgs);
      iframeUrl = r.iframeUrl;
      gatewayRef = r;
    }

    // Persist the gateway reference immediately so this payment can always be
    // looked up at PayMob later, even if no callback ever reaches us.
    if (gatewayRef) {
      const { error: refErr } = await supabase
        .from("subscription_purchases")
        .update({
          paymob_order_id: gatewayRef.paymobOrderId,
          paymob_special_reference: gatewayRef.merchantReference,
        })
        .eq("id", purchase.id);
      if (refErr) console.error("failed to store paymob reference:", refErr);
    }

    return json({ iframe_url: iframeUrl, purchase_id: purchase.id, method: payment_method || "card" });
  } catch (error) {
    console.error("subscription-checkout error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
