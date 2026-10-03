import { StripePaymentOption, isStripeCurrency } from "@/components/checkout/StripePaymentOption";
import { applyLocalPrice } from "@/lib/localPrice";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crown, Check, Loader2, ShieldCheck, CreditCard, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { usePageReady } from "@/hooks/usePageReady";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputField } from "@/components/ui/phone-input";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import ApplePayLogo from "@/components/common/ApplePayLogo";
import { WalletPaymentOption } from "@/components/checkout/WalletPaymentOption";
import visaAsset from "@/assets/pg-visa.png.asset.json";
import mastercardAsset from "@/assets/pg-mastercard.svg.asset.json";
import meezaAsset from "@/assets/pg-meeza.png.asset.json";

import AuthDialog from "@/components/auth/AuthDialog";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import PaymobIframeModal from "@/components/checkout/PaymobIframeModal";
import { getFriendlyPaymentError, GENERIC_PAYMENT_FAILURE } from "@/lib/checkout/paymentFailureMessage";
import { useAuth } from "@/hooks/useAuth";
import { useApplePayAvailable } from "@/hooks/useApplePayAvailable";
import { toArPrice } from "@/lib/utils";

interface Plan {
  id: string;
  price: number;
  currency?: string;
  includes_digital_products: boolean;
}

const SubscriptionCheckoutPage = () => {
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t: tRaw, i18n } = useTranslation();
  const isAr = (i18n?.language || "ar").startsWith("ar");
  const t = (k: string, o?: any) => tRaw(k, o) as string;
  const { session } = useAuth();

  const s = (k: string, opts?: Record<string, unknown>) => t(`miscPublic.subscribe.${k}`, opts as any);

  const [loading, setLoading] = useState(true);
  const [mentor, setMentor] = useState<{ id: string; name: string; primary_color: string | null; profile_image_url: string | null; whatsapp_number: string | null } | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "apple_pay">("card");
  const [walletPhone, setWalletPhone] = useState("");
  const applePayAvailable = useApplePayAvailable();
  const [buying, setBuying] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletPayment, setWalletPayment] = useState<{ kind: "order" | "lc" | "dp" | "sub"; id: string } | null>(null);
  const [iframeOpen, setIframeOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const paymentKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    if (!mentorSlug) return;
    (async () => {
      const { data: tenant } = await supabase
        .from("public_tenants")
        .select("id, name, primary_color, profile_image_url, subscriptions_enabled, whatsapp_number")
        .eq("slug", mentorSlug)
        .maybeSingle();
      if (tenant?.id && (tenant as any).subscriptions_enabled) {
        setMentor(tenant as any);
        const { data: planRow } = await supabase
          .from("subscription_plans")
          .select("id, price, includes_digital_products")
          .eq("tenant_id", tenant.id)
          .eq("plan_type", "yearly")
          .eq("is_active", true)
          .maybeSingle();
        if (planRow) { await applyLocalPrice("subscription_plan", planRow); setPlan(planRow as Plan); }
      }
      setLoading(false);
    })();
  }, [mentorSlug]);

  // Prefill from the signed-in student profile
  useEffect(() => {
    if (!session?.user || !mentor?.id) return;
    supabase.from("students").select("full_name, email, phone")
      .eq("user_id", session.user.id).eq("tenant_id", mentor.id).maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setEmail((prev) => prev || session.user.email || "");
          return;
        }
        const parts = (data.full_name || "").trim().split(" ");
        setFirstName((prev) => prev || parts[0] || "");
        setLastName((prev) => prev || parts.slice(1).join(" ") || "");
        setEmail((prev) => prev || data.email || session.user.email || "");
        setPhone((prev) => prev || data.phone || "");
      });
  }, [session?.user, mentor?.id]);

  const features = useMemo(() => {
    const keys = [
      "mentorPublic.subscriptions.features.allCourses",
      "mentorPublic.subscriptions.features.updates",
      "mentorPublic.subscriptions.features.certificates",
      "mentorPublic.subscriptions.features.support",
    ];
    if (plan?.includes_digital_products) keys.push("mentorPublic.subscriptions.features.digitalProducts");
    return keys.map((k) => t(k));
  }, [plan?.includes_digital_products, t]);

  const canSubmit = !!firstName.trim() && !!lastName.trim() && /\S+@\S+\.\S+/.test(email) && phone.replace(/\D/g, "").length >= 8;

  const handlePay = async () => {
    if (!plan || !mentor) return;
    if (paymentMethod === "wallet" && !isStripeCurrency(((plan as any)?.currency || "EGP")) && (plan.price > 0) && !/^01[0-9]{9}$/.test(walletPhone)) {
      toast({ title: s("invalidWallet"), variant: "destructive" });
      return;
    }
    setBuying(true);
    try {
      const redirectUrl = `${window.location.origin}${urls.mentorPath("/subscribe/payment")}`;
      const res = await supabase.functions.invoke("subscription-checkout", {
        body: {
          tenant_id: mentor.id,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
          redirect_url: redirectUrl,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone,
          payment_method: paymentMethod,
          wallet_phone: paymentMethod === "wallet" ? walletPhone : undefined,
          payment_key: paymentKey,
        },
      });
      if (res.error) throw res.error;
      const data: any = res.data;

      if (data?.error === "already_subscribed") {
        toast({ title: s("alreadySubscribed") });
        navigate(urls.mentorPath("/dashboard?tab=subscription"));
        return;
      }
      if (data?.error === "login_required") {
        toast({ title: isAr ? "لديك حساب بهذا البريد بالفعل" : "You already have an account with this email", description: isAr ? "سجّل الدخول لإكمال الاشتراك." : "Please sign in to complete your subscription." });
        setLoginOpen(true);
        return;
      }
      if (data?.error) {
        toast({ title: s("errorTitle"), description: String(data.error), variant: "destructive" });
        return;
      }

      localStorage.setItem("checkout_email", email.trim());
      if (data?.purchase_id) localStorage.setItem("sub_purchase_id", data.purchase_id);

      if (data?.free) {
        navigate(urls.mentorPath(`/subscribe/payment?purchaseId=${data.purchase_id || ""}&free=true`));
        return;
      }

      if (data?.method === "stripe" && data?.iframe_url) {
        window.location.href = data.iframe_url;
        return;
      }
      if (data?.iframe_url) {
        if (paymentMethod === "apple_pay") {
          window.location.href = data.iframe_url;
          return;
        }
        try {
          const host = new URL(data.iframe_url).hostname.toLowerCase();
          if (host === "vcheckout.paymobsolutions.com" || host.endsWith(".paymobsolutions.com")) {
            try { (window.top || window).location.href = data.iframe_url; }
            catch { window.location.href = data.iframe_url; }
            return;
          }
        } catch { /* fall through to the modal */ }
        setWalletPayment(paymentMethod === "wallet" && data?.purchase_id ? { kind: "sub", id: data.purchase_id } : null);
        setIframeUrl(data.iframe_url);
        setIframeOpen(true);
      }
    } catch (err: any) {
      console.error("Subscription payment error:", err);
      toast({ title: s("errorTitle"), description: err?.message || s("retry"), variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  usePageReady(loading);
  if (loading) return <TopLoadingBar coverPage />;

  if (!mentor || !plan) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Crown className="w-10 h-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">{s("unavailable")}</p>
        <Link to={urls.profileUrl()}>
          <Button variant="outline" className="rounded-xl">{s("backToProfile")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {mentor.primary_color && <TenantThemeInjector primaryColor={mentor.primary_color} />}

      <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <Link to={urls.profileUrl()} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-primary-foreground font-bold shrink-0 shadow-md">
              {mentor.profile_image_url
                ? <img src={mentor.profile_image_url} alt={mentor.name} width={40} height={40} loading="lazy" className="w-full h-full object-cover" />
                : mentor.name.charAt(0)}
            </div>
            <h2 className="font-bold text-foreground text-sm">{mentor.name}</h2>
          </Link>
          <AuthStatusButton
            mentorSlug={mentorSlug || undefined}
            studentOnly
            size="sm"
            className="h-9 px-4 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          />
        </div>
      </header>

      <div className="container py-6 max-w-lg mx-auto space-y-5">
        {/* Plan summary */}
        <div className="bg-card rounded-3xl border border-border/60 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold rtl:tracking-normal">{s("planLabel")}</p>
                <h1 className="text-base font-black text-foreground leading-tight">{t("mentorPublic.subscriptions.yearlyPlan")}</h1>
              </div>
            </div>
            <div className="text-end shrink-0">
              <span className="block font-black text-primary text-2xl leading-none">
                {plan.price > 0 ? toArPrice(plan.price, plan.currency || "EGP") : s("free")}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("mentorPublic.subscriptions.perYear")}</span>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground">{s("yourData")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={s("firstName")} className="h-11 rounded-xl bg-background" />
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={s("lastName")} className="h-11 rounded-xl bg-background" />
          </div>
          <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={s("email")} className="h-11 rounded-xl bg-background" />
          <PhoneInputField value={phone} onChange={setPhone} placeholder={s("phone")} />

            {plan.price > 0 && (
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">{s("paymentMethod")}</p>
              <div className="space-y-2.5">
                {isStripeCurrency(((plan as any)?.currency || "EGP")) ? (
                  <StripePaymentOption />
                ) : (
                <>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`w-full rounded-2xl border-2 p-3.5 flex items-center justify-between gap-3 text-start transition-all ${paymentMethod === "card" ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:border-border"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "card" ? "border-primary" : "border-muted-foreground/30"}`}>
                      {paymentMethod === "card" && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                    <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                    <span className="text-sm font-semibold">{s("card")}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <img src={visaAsset.url} alt="Visa" className="h-4 object-contain" />
                    <img src={mastercardAsset.url} alt="Mastercard" className="h-4 object-contain" />
                    <img src={meezaAsset.url} alt="Meeza" className="h-4 object-contain" />
                  </span>
                </button>

                <WalletPaymentOption
                  selected={paymentMethod === "wallet"}
                  onSelect={() => setPaymentMethod("wallet")}
                  label={s("wallet")}
                  inputLabel={s("walletLabel")}
                  value={walletPhone}
                  onChange={setWalletPhone}
                  showInput={plan.price > 0}
                  hint={s("walletHint")}
                />

                {applePayAvailable && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("apple_pay")}
                    className={`w-full rounded-2xl border-2 p-3.5 flex items-center justify-between gap-3 text-start transition-all ${paymentMethod === "apple_pay" ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:border-border"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "apple_pay" ? "border-primary" : "border-muted-foreground/30"}`}>
                        {paymentMethod === "apple_pay" && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="text-sm font-semibold">{s("applePay")}</span>
                    </span>
                    <ApplePayLogo className="w-10 h-5 shrink-0" />
                  </button>
                )}
                </>
                )}
              </div>
            </div>
          )}


          <Button
            onClick={handlePay}
            disabled={buying || !canSubmit}
            className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
          >
            {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <Lock className="w-4 h-4 me-2" />
                {plan.price > 0 ? s("payBtn", { amount: toArPrice(plan.price, plan.currency || "EGP") }) : s("activateBtn")}
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>{s("secured")}</span>
          </div>
        </div>
      </div>

      <TrustedBadge />
      {mentor?.whatsapp_number && <MentorWhatsAppButton phoneNumber={mentor.whatsapp_number} />}

      <AuthDialog open={loginOpen} onOpenChange={setLoginOpen} mentorSlug={mentorSlug} />
      <PaymobIframeModal
        wallet={walletPayment}
        open={iframeOpen}
        iframeUrl={iframeUrl}
        successUrlPrefix={`${window.location.origin}${urls.mentorPath("/subscribe/payment")}`}
        onClose={() => setIframeOpen(false)}
        onSuccess={(url) => {
          setIframeOpen(false);
          navigate(url.replace(window.location.origin, ""));
        }}
        onFailure={(info) => {
          toast({ title: getFriendlyPaymentError(info) ?? GENERIC_PAYMENT_FAILURE, variant: "destructive" });
        }}
      />
    </div>
  );
};

export default SubscriptionCheckoutPage;
