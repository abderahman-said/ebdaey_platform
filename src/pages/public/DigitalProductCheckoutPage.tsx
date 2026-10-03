import { StripePaymentOption, isStripeCurrency } from "@/components/checkout/StripePaymentOption";
import { getDisplayCurrency, syncDisplayFromProduct } from "@/lib/localPrice";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dpQk, fetchDigitalProductCheckoutBundle } from "@/lib/digitalProductQueries";
import { usePageReady } from "@/hooks/usePageReady";
import {
  Lock,
  Loader2,
  ShieldCheck,
  Package,
  Download,
  CheckCircle,
  Plus,
  CreditCard,

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInputField } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import PixelInjector, { firePixelEvent } from "@/components/common/PixelInjector";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import ApplePayLogo from "@/components/common/ApplePayLogo";
import visaAsset from "@/assets/pg-visa.png.asset.json";
import mastercardAsset from "@/assets/pg-mastercard.svg.asset.json";
import meezaDigitalAsset from "@/assets/pg-meeza-digital.png.asset.json";
import { toAr, toArPrice } from "@/lib/utils";
import { useApplePayAvailable } from "@/hooks/useApplePayAvailable";
import CheckoutStepProgress from "@/components/checkout/CheckoutStepProgress";
import PaymobIframeModal from "@/components/checkout/PaymobIframeModal";
import { getFriendlyPaymentError, GENERIC_PAYMENT_FAILURE } from "@/lib/checkout/paymentFailureMessage";
import { FloatingInput } from "@/components/checkout/FloatingInput";
import { WalletPaymentOption } from "@/components/checkout/WalletPaymentOption";

const DigitalProductCheckoutPage = () => {
  const { productSlug: routeProductSlug, bookingId } = useParams<{ productSlug?: string; bookingId?: string }>();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const savedCheckout = useMemo(() => {
    if (!bookingId) return null;
    try {
      const raw = sessionStorage.getItem(`ebdaey_checkout_${bookingId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        productSlug?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
      return parsed.productSlug ? parsed : null;
    } catch {
      return null;
    }
  }, [bookingId]);
  const productSlug = routeProductSlug || savedCheckout?.productSlug;

  const [step, setStep] = useState(bookingId ? 2 : 1);
  const [buying, setBuying] = useState(false);

  const [firstName, setFirstName] = useState(savedCheckout?.firstName || "");
  const [lastName, setLastName] = useState(savedCheckout?.lastName || "");
  const [email, setEmail] = useState(savedCheckout?.email || "");
  const { emailError, handleEmailChange } = useEmailTypoCheck();
  const [phone, setPhone] = useState(savedCheckout?.phone || "");
  const [bumpAccepted, setBumpAccepted] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState<{ id: string; discount_type: string; discount_value: number } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "apple_pay">("card");
  const [walletPhone, setWalletPhone] = useState("");
  const applePayAvailable = useApplePayAvailable();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletPayment, setWalletPayment] = useState<{ kind: "order" | "lc" | "dp" | "sub"; id: string } | null>(null);
  const [iframeOpen, setIframeOpen] = useState(false);

  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: dpQk.productCheckout(mentorSlug || "", productSlug || ""),
    queryFn: () => fetchDigitalProductCheckoutBundle(mentorSlug!, productSlug!),
    enabled: !!mentorSlug && !!productSlug,
  });

  const tenantId = bundle?.tenant?.id || null;
  const mentor = bundle?.tenant
    ? {
        name: bundle.tenant.name,
        profile_image_url: bundle.tenant.profile_image_url,
        primary_color: bundle.tenant.primary_color,
        whatsapp_number: (bundle.tenant as any).whatsapp_number,
      }
    : null;
  const product = bundle?.product || null;
  syncDisplayFromProduct(product as any);
  const filesCount = bundle?.filesCount || 0;
  const giftCourses = bundle?.giftCourses || [];
  const bump = bundle?.bump || null;

  useEffect(() => {
    setStep(bookingId ? 2 : 1);
  }, [bookingId]);

  // Fire toast for a pending failure stashed in sessionStorage (used after a
  // full reload in the recovery flow so the message survives the reload).
  useEffect(() => {
    if (!bookingId) return;
    const key = `ebdaey_pay_failure_${bookingId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);
    try {
      const info = JSON.parse(raw);
      const message = getFriendlyPaymentError(info);
      toast({
        title: t("digitalProduct:checkout.toast.errorTitle"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
    } catch {}
  }, [bookingId, t, toast]);

  useEffect(() => {
    if (!bookingId || !savedCheckout || !productSlug) return;
    const status = (searchParams.get("paymentStatus") || searchParams.get("status") || "").toLowerCase();
    if (["success", "captured", "paid", "completed"].includes(status)) {
      const query = new URLSearchParams(searchParams);
      sessionStorage.removeItem(`ebdaey_checkout_${bookingId}`);
      navigate(urls.mentorPath(`/p/${productSlug}/payment?${query.toString()}`), { replace: true });
      return;
    }
    if (["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(status)) {
      const message = getFriendlyPaymentError({
        gwCode: searchParams.get("gwCode") || undefined,
        gwMessage: searchParams.get("gwMessage") || undefined,
        reason: searchParams.get("reason") || undefined,
      });
      toast({
        title: t("digitalProduct:checkout.toast.errorTitle"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
      navigate(urls.mentorPath(`/p/${(product as any)?.slug || productSlug}/payment`), { replace: true });
    }
  }, [bookingId, navigate, productSlug, savedCheckout, searchParams, t, toast, urls]);

  const handleStep1Next = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: t("digitalProduct:checkout.toast.fillRequired"), variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: t("digitalProduct:checkout.toast.invalidEmail"), variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: t("digitalProduct:checkout.toast.emailTypoTitle"),
        description: t("digitalProduct:checkout.toast.emailTypoDesc", { typo: emailError.typo, correct: emailError.correct }),
        variant: "destructive",
      });
      return;
    }
    if (!phone || phone.length < 8) {
      toast({ title: t("digitalProduct:checkout.toast.invalidPhone"), variant: "destructive" });
      return;
    }
    if (!productSlug) return;
    const paymentKey = crypto.randomUUID();
    sessionStorage.setItem(`ebdaey_checkout_${paymentKey}`, JSON.stringify({
      productSlug,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone,
    }));
    navigate(urls.mentorPath(`/booking/${paymentKey}/payment`));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim() || !tenantId || !product) return;
    setValidatingCoupon(true);
    try {
      const res = await supabase.functions.invoke("validate-coupon", {
        body: {
          code: couponCode.trim(),
          tenant_id: tenantId,
          currency: getDisplayCurrency(),
          digital_product_id: product.id,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
        },
      });
      const data = res.data as any;
      if (data?.valid) {
        setCouponApplied({
          id: data.coupon_id,
          discount_type: data.discount_type,
          discount_value: Number(data.discount_value),
        });
        toast({ title: t("digitalProduct:checkout.toast.couponSuccess") });
      } else {
        toast({ title: data?.message || t("digitalProduct:checkout.toast.couponInvalid"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("digitalProduct:checkout.toast.genericError"), variant: "destructive" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const computeDiscount = (price: number) => {
    if (!couponApplied) return 0;
    if (couponApplied.discount_type === "percentage") {
      return Math.min(price, (price * couponApplied.discount_value) / 100);
    }
    return Math.min(price, couponApplied.discount_value);
  };

  const handlePay = async () => {
    if (!product || !tenantId) return;
    setBuying(true);
    try {
      if (paymentMethod === "wallet" && !isStripeCurrency(getDisplayCurrency()) && total > 0 && !/^01[0-9]{9}$/.test(walletPhone)) {
        toast({ title: t("digitalProduct:checkout.toast.invalidWallet"), variant: "destructive" });
        setBuying(false);
        return;
      }
      // Always return to the product's own result page (never the booking
      // URL) so the payment is verified instead of bouncing back to checkout.
      const redirectUrl = `${window.location.origin}${urls.mentorPath(`/p/${(product as any)?.slug || productSlug}/payment`)}`;
      const bumpPrice = bump ? (bump.discount_price ?? bump.price) : 0;
      const includeBump = bumpAccepted && bump;
      const res = await supabase.functions.invoke("digital-product-checkout", {
        body: {
          digital_product_id: product.id,
          tenant_id: tenantId,
          redirect_url: redirectUrl,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          bump_course_id: includeBump && bump.bump_kind === "course" ? bump.bump_target_id : null,
          bump_live_course_id: includeBump && bump.bump_kind === "live_course" ? bump.bump_target_id : null,
          bump_digital_product_id: includeBump && bump.bump_kind === "product" ? bump.bump_target_id : null,
          bump_amount: includeBump ? bumpPrice : 0,
          coupon_id: couponApplied?.id || null,
          payment_method: paymentMethod,
          wallet_phone: paymentMethod === "wallet" ? walletPhone : undefined,
          payment_key: bookingId || undefined,
        },
      });

      if (res.error) throw res.error;
      const data = res.data;

      if (data?.error) {
        if (data.error === "already_purchased") {
          localStorage.setItem("checkout_email", email);
          if (data.purchase_id) localStorage.setItem("dp_purchase_id", data.purchase_id);
          navigate(urls.mentorPath(`/p/${productSlug}/payment?paymentStatus=SUCCESS&purchaseId=${encodeURIComponent(data.purchase_id || "")}`));
          return;
        }
        toast({ title: t("digitalProduct:checkout.toast.errorTitle"), description: data.error, variant: "destructive" });
        return;
      }

      localStorage.setItem("checkout_email", email);
      if (data?.purchase_id) {
        localStorage.setItem("dp_purchase_id", data.purchase_id);
      }

      firePixelEvent("InitiateCheckout", {
        content_name: product.title,
        content_ids: [product.id],
        value: product.price + (includeBump ? bumpPrice : 0),
        currency: getDisplayCurrency(),
      });

      if (data?.free) {
        navigate(urls.mentorPath(`/p/${productSlug}/payment?purchaseId=${data.purchase_id || ""}&free=true`));
        return;
      }

      if (data?.method === "stripe" && data?.iframe_url) {
        window.location.href = data.iframe_url;
        return;
      }
      if (data?.iframe_url) {
        if (bookingId) {
          sessionStorage.setItem(`ebdaey_checkout_${bookingId}`, JSON.stringify({
            productSlug,
            firstName,
            lastName,
            email,
            phone,
          }));
        }
        // Apple Pay and legacy PayMob hosts must open as a top-level page so
        // the native sheet / wallet OTP can present correctly.
        if (paymentMethod === "apple_pay") {
          window.location.href = data.iframe_url;
          return;
        }
        try {
          const checkoutHost = new URL(data.iframe_url).hostname.toLowerCase();
          if (checkoutHost === "vcheckout.paymobsolutions.com" || checkoutHost.endsWith(".paymobsolutions.com")) {
            try {
              (window.top || window).location.href = data.iframe_url;
            } catch {
              window.location.href = data.iframe_url;
            }
            return;
          }
        } catch {
          // Let the modal surface malformed or immediate-failure return URLs.
        }
        setWalletPayment(paymentMethod === "wallet" && data?.purchase_id ? { kind: "dp", id: data.purchase_id } : null);
        setIframeUrl(data.iframe_url);
        setIframeOpen(true);
        return;
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: t("digitalProduct:checkout.toast.genericError"),
        description: err?.message || t("digitalProduct:checkout.toast.retry"),
        variant: "destructive",
      });
    } finally {
      setBuying(false);
    }

  };

  usePageReady(loading);
  if (loading) return <TopLoadingBar coverPage />;

  if (bookingId && !savedCheckout) {
    return <RecoverFromBooking bookingId={bookingId} urls={urls} searchParams={searchParams} />;
  }


  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("digitalProduct:page.notFound")}</p>
      </div>
    );
  }

  const bumpPrice = bump ? (bump.discount_price ?? bump.price) : 0;
  const subtotal = product.price + (bumpAccepted && bump ? bumpPrice : 0);
  const discount = computeDiscount(subtotal);
  const subtotalAfterDiscount = Math.max(0, product.price - computeDiscount(product.price));
  const total = Math.max(0, subtotal - discount);


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {tenantId && <PixelInjector tenantId={tenantId} />}
      {mentor?.primary_color && <TenantThemeInjector primaryColor={mentor.primary_color} />}

      <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <Link to={urls.profileUrl()} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-primary-foreground font-bold shrink-0 shadow-md">
              {mentor?.profile_image_url ? (
                <img
                  src={mentor.profile_image_url}
                  alt={mentor?.name}
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                mentor?.name.charAt(0)
              )}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">{mentor?.name}</h2>
            </div>
          </Link>
          <AuthStatusButton
            mentorSlug={mentorSlug || undefined}
            studentOnly
            size="sm"
            className="h-9 px-4 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          />

        </div>
      </header>

      <div className="container py-4 max-w-5xl mx-auto">
        <CheckoutStepProgress
          currentStep={step}
          steps={[
            { label: t("digitalProduct:checkout.steps.info"), hint: t("digitalProduct:checkout.steps.infoHint") },
            { label: t("digitalProduct:checkout.steps.pay"), hint: t("digitalProduct:checkout.steps.payHint") },
          ]}
        />

        {step === 1 ? (
          /* ============ STEP 1 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.title} width={56} height={56} loading="eager" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("digitalProduct:checkout.price")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">{product.title}</h3>
                {filesCount > 0 && (
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {toAr(filesCount)} {t("digitalProduct:checkout.downloadable")}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {product.price > 0 ? toArPrice(product.price) : t("digitalProduct:checkout.free")}
                </span>
              </div>
            </div>

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t("digitalProduct:checkout.contactTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("digitalProduct:checkout.contactHint")}</p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label={t("digitalProduct:checkout.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <FloatingInput
                    label={t("digitalProduct:checkout.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div>
                  <FloatingInput
                    type="email"
                    label={t("digitalProduct:checkout.emailPlaceholder")}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value, setEmail)}
                    dir="ltr"
                    error={emailError.hasError}
                  />
                  {emailError.hasError && (
                    <p className="text-destructive text-xs mt-1.5 ms-1 font-medium">
                      {t("digitalProduct:checkout.toast.emailTypoDesc", { typo: emailError.typo, correct: emailError.correct })}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute -top-2 start-4 z-10 px-1.5 bg-card text-[11px] font-semibold text-foreground">
                    {t("digitalProduct:checkout.phonePlaceholder")}
                  </span>
                  <PhoneInputField
                    value={phone}
                    onChange={setPhone}
                    placeholder=""
                    rootClassName="!h-14 !rounded-2xl !bg-card !border !border-border focus-within:!border-primary focus-within:!ring-4 focus-within:!ring-primary/10 focus-within:!ring-offset-0"
                    className="[&_input]:bg-transparent [&_input]:text-sm"
                  />
                </div>
              </div>

              <div className="px-6 md:px-8 py-5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("digitalProduct:checkout.back")}
                </button>
                <Button
                  onClick={handleStep1Next}
                  className="rounded-2xl h-12 px-8 font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {t("digitalProduct:checkout.continue")}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("digitalProduct:checkout.secured")}</span>
            </div>
          </div>
        ) : (
          /* ============ STEP 2 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.title} width={56} height={56} loading="eager" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("digitalProduct:checkout.price")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">{product.title}</h3>
                {filesCount > 0 && (
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {toAr(filesCount)} {t("digitalProduct:checkout.downloadable")}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {total > 0 ? toArPrice(total) : t("digitalProduct:checkout.free")}
                </span>
                {couponApplied && discount > 0 && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground line-through">
                    {toArPrice(product.price)}
                  </div>
                )}
              </div>
            </div>

            {/* Gift strip */}
            {giftCourses.length > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-bold text-primary mb-1.5 uppercase tracking-wider rtl:tracking-normal">
                  {t("digitalProduct:checkout.giftsTitle")}
                </p>
                <div className="space-y-1">
                  {giftCourses.map((gc) => (
                    <div key={gc.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate flex-1 me-2">{gc.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {gc.price > 0 && (
                          <span className="text-muted-foreground line-through">{toArPrice(gc.price)}</span>
                        )}
                        <span className="font-bold text-primary">{t("digitalProduct:checkout.free2")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t("digitalProduct:checkout.paymentMethod")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("digitalProduct:checkout.paymentMethodHint")}</p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-4">
                <div className="space-y-2.5">
                  {isStripeCurrency(getDisplayCurrency()) ? (
                    <StripePaymentOption />
                  ) : (
                  <>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-start transition-all ${
                      paymentMethod === "card" ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:border-border"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${paymentMethod === "card" ? "border-primary" : "border-muted-foreground/30"}`}>
                      {paymentMethod === "card" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                    <span className="text-sm font-semibold flex-1">{t("digitalProduct:checkout.cards")}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <img src={visaAsset.url} alt="Visa" className="h-4 object-contain" />
                      <img src={mastercardAsset.url} alt="Mastercard" className="h-4 object-contain" />
                      <img src={meezaDigitalAsset.url} alt="Meeza" className="h-4 object-contain" />
                    </div>
                  </button>

                  <WalletPaymentOption
                    selected={paymentMethod === "wallet"}
                    onSelect={() => setPaymentMethod("wallet")}
                    label={t("digitalProduct:checkout.wallet")}
                    inputLabel={t("digitalProduct:checkout.walletLabel")}
                    value={walletPhone}
                    onChange={setWalletPhone}
                    showInput={total > 0}
                    hint={t("digitalProduct:checkout.walletHint")}
                  />

                  {applePayAvailable && (
                    <button
                      onClick={() => setPaymentMethod("apple_pay")}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-start transition-all ${
                        paymentMethod === "apple_pay" ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 bg-card hover:border-border"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${paymentMethod === "apple_pay" ? "border-primary" : "border-muted-foreground/30"}`}>
                        {paymentMethod === "apple_pay" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <ApplePayLogo className="w-8 h-4 text-foreground shrink-0" />
                      <span className="text-sm font-semibold flex-1">{t("digitalProduct:checkout.applePay")}</span>
                    </button>
                  )}
                  </>
                  )}
                </div>

                {bump && (
                  <div
                    onClick={() => setBumpAccepted((v) => !v)}
                    className={`rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                      bumpAccepted ? "border-primary bg-primary/5" : "border-dashed border-border/60 bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        checked={bumpAccepted}
                        onCheckedChange={(c) => setBumpAccepted(!!c)}
                        className="mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {bump.bump_target_thumbnail && (
                        <img
                          src={bump.bump_target_thumbnail}
                          alt={bump.bump_target_title || bump.title}
                          loading="lazy"
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/60"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-bold text-primary text-[11px] uppercase tracking-wider rtl:tracking-normal">
                            {t("digitalProduct:checkout.bumpBadge")}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">{bump.title}</p>
                        {bump.bump_target_title && bump.bump_target_title !== bump.title && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{bump.bump_target_title}</p>
                        )}
                        {bump.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{bump.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {bump.discount_price != null && bump.discount_price < bump.price && (
                            <span className="text-xs text-muted-foreground line-through">{toArPrice(bump.price)}</span>
                          )}
                          <span className="font-bold text-primary text-sm">{toArPrice(bumpPrice)}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowCoupon((s) => !s)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {t("digitalProduct:checkout.haveCoupon")}
                  </button>

                  {showCoupon && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder={t("digitalProduct:checkout.couponPlaceholder")}
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponApplied(null);
                        }}
                        className="rounded-xl h-10 text-sm"
                        dir="ltr"
                      />
                      <Button
                        variant="outline"
                        onClick={applyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="rounded-xl shrink-0 h-10 text-xs"
                      >
                        {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("digitalProduct:checkout.apply")}
                      </Button>
                    </div>
                  )}
                  {couponApplied && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-primary bg-primary/5 rounded-lg px-2.5 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="font-semibold">{t("digitalProduct:checkout.couponApplied")}</span>
                      <span className="ms-auto font-bold">- {toArPrice(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-sm font-semibold text-muted-foreground">{t("digitalProduct:checkout.total")}</span>
                  <span className="font-black text-foreground text-xl">
                    {total > 0 ? toArPrice(total) : t("digitalProduct:checkout.free")}
                  </span>
                </div>
              </div>

              <div className="px-6 md:px-8 py-5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("digitalProduct:checkout.editData")}
                </button>
                <Button
                  onClick={handlePay}
                  disabled={buying}
                  className="rounded-2xl h-12 px-8 font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {buying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {total <= 0
                        ? t("digitalProduct:checkout.continue")
                        : t("digitalProduct:checkout.payBtn", { amount: toArPrice(total) })}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("digitalProduct:checkout.secured")}</span>
            </div>
          </div>
        )}
      </div>
      <TrustedBadge />
      {mentor?.whatsapp_number && <MentorWhatsAppButton phoneNumber={mentor.whatsapp_number} />}
      <PaymobIframeModal
        wallet={walletPayment}
        open={iframeOpen}
        iframeUrl={iframeUrl}
        successUrlPrefix={`${window.location.origin}${urls.mentorPath(`/p/${productSlug}/payment`)}`}
        onClose={() => setIframeOpen(false)}
        onSuccess={(url) => {
          setIframeOpen(false);
          navigate(url.replace(window.location.origin, ""));
        }}
        onFailure={(info) => {
          toast({
            title: getFriendlyPaymentError(info) ?? GENERIC_PAYMENT_FAILURE,
            variant: "destructive",
          });
        }}
      />
    </div>
  );
};

export default DigitalProductCheckoutPage;

// Recovery view: user landed on /booking/{key}/payment without sessionStorage
// (e.g. cross-origin return from PayMob or refresh in a new tab). Look up the
// purchase in the DB, then send them back to the product's contact step with a
// friendly failure toast so they can retry the checkout cleanly.
function RecoverFromBooking({
  bookingId,
  urls,
  searchParams,
}: {
  bookingId: string;
  urls: ReturnType<typeof useMentorUrls>;
  searchParams: URLSearchParams;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("digital_product_purchases")
        .select("digital_products:digital_product_id(slug), profiles:student_id(full_name, email, phone)")
        .eq("payment_key", bookingId)
        .maybeSingle();
      if (cancelled) return;

      // Stripe return landing on a booking URL: forward to the result page,
      // which verifies the payment with Stripe.
      const dpSlug = (data as any)?.digital_products?.slug;
      if (searchParams.get("gateway") === "stripe" && searchParams.get("purchaseId") && dpSlug) {
        navigate(urls.mentorPath(`/p/${dpSlug}/payment?${searchParams.toString()}`), { replace: true });
        return;
      }


      const status = (searchParams.get("paymentStatus") || searchParams.get("status") || "").toLowerCase();
      const isFailure = ["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(status);
      if (isFailure) {
        // Stash failure for the post-reload page to render as a toast, so it
        // survives the window.location.replace below without an extra route.
        sessionStorage.setItem(`ebdaey_pay_failure_${bookingId}`, JSON.stringify({
          gwCode: searchParams.get("gwCode") || undefined,
          gwMessage: searchParams.get("gwMessage") || undefined,
          reason: searchParams.get("reason") || undefined,
        }));
      }

      const pSlug = (data as any)?.digital_products?.slug;
      const profile = (data as any)?.profiles;

      // Restore sessionStorage from DB so the user stays on step 2 (/payment)
      // and doesn't get bounced back to /contact after a failed PayMob attempt.
      if (pSlug && profile?.email) {
        const [firstName, ...rest] = String(profile.full_name || "").trim().split(/\s+/);
        sessionStorage.setItem(`ebdaey_checkout_${bookingId}`, JSON.stringify({
          productSlug: pSlug,
          firstName: firstName || "",
          lastName: rest.join(" ") || "",
          email: profile.email,
          phone: profile.phone || "",
        }));
        // Reload without query params so savedCheckout memo picks up the value
        // and the payment step renders normally (toast persists across reload).
        window.location.replace(urls.mentorPath(`/booking/${bookingId}/payment`));
        return;
      }

      navigate(pSlug ? urls.mentorPath(`/p/${pSlug}/contact`) : urls.profileUrl(), { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, navigate, searchParams, t, toast, urls]);

  return <TopLoadingBar coverPage />;
}

