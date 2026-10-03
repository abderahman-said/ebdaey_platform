import { StripePaymentOption, isStripeCurrency } from "@/components/checkout/StripePaymentOption";
import { getDisplayCurrency, syncDisplayFromProduct } from "@/lib/localPrice";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { lcQk, fetchLiveCourseCheckoutBundle } from "@/lib/liveCourseQueries";
import { usePageReady } from "@/hooks/usePageReady";
import {
  Lock,
  Loader2,
  ShieldCheck,
  Video,
  Clock,
  Users,
  MapPin,
  CreditCard,

  CheckCircle,
  Plus,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInputField } from "@/components/ui/phone-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
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

const LiveCourseCheckoutPage = () => {
  const { courseSlug: routeCourseSlug, bookingId } = useParams<{ courseSlug?: string; bookingId?: string }>();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const savedCheckout = useMemo(() => {
    if (!bookingId) return null;
    try {
      const raw = sessionStorage.getItem(`ebdaey_checkout_l_${bookingId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        courseSlug?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
      return parsed.courseSlug ? parsed : null;
    } catch {
      return null;
    }
  }, [bookingId]);
  const courseSlug = routeCourseSlug || savedCheckout?.courseSlug;

  const [step, setStep] = useState(bookingId ? 2 : 1);
  const [buying, setBuying] = useState(false);
  const [firstName, setFirstName] = useState(savedCheckout?.firstName || "");
  const [lastName, setLastName] = useState(savedCheckout?.lastName || "");
  const [email, setEmail] = useState(savedCheckout?.email || "");
  const { emailError, handleEmailChange } = useEmailTypoCheck();
  const [phone, setPhone] = useState(savedCheckout?.phone || "");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "apple_pay">("card");
  const [walletPhone, setWalletPhone] = useState("");
  const applePayAvailable = useApplePayAvailable();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletPayment, setWalletPayment] = useState<{ kind: "order" | "lc" | "dp" | "sub"; id: string } | null>(null);
  const [iframeOpen, setIframeOpen] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState<{ id: string; discount_type: string; discount_value: number } | null>(null);
  const [bumpAccepted, setBumpAccepted] = useState(false);

  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: lcQk.checkout(mentorSlug || "", courseSlug || ""),
    queryFn: () => fetchLiveCourseCheckoutBundle(mentorSlug!, courseSlug!),
    enabled: !!mentorSlug && !!courseSlug,
  });

  const tenantId = bundle?.tenant?.id || null;
  const mentor = bundle?.tenant
    ? {
        name: bundle.tenant.name,
        profile_image_url: bundle.tenant.profile_image_url,
        primary_color: (bundle.tenant as any).primary_color,
        whatsapp_number: (bundle.tenant as any).whatsapp_number,
      }
    : null;
  const course: any = bundle?.course || null;
  syncDisplayFromProduct(course as any);
  const seatsTaken = bundle?.seatsTaken || 0;
  const sessionsCount = bundle?.sessionsCount || 0;
  const giftCourses = (bundle as any)?.giftCourses || [];
  const bump = (bundle as any)?.bump || null;
  const isFull = course?.capacity != null && seatsTaken >= course.capacity;

  // Toast a stashed failure across reloads
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
        title: t("liveCourse:checkout.toast.errorTitle"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
    } catch {}
  }, [bookingId, t, toast]);

  // Handle return from PayMob to /l-booking/{key}/payment
  useEffect(() => {
    if (!bookingId || !courseSlug) return;
    const status = (searchParams.get("paymentStatus") || searchParams.get("status") || "").toLowerCase();
    if (["success", "captured", "paid", "completed"].includes(status)) {
      const query = new URLSearchParams(searchParams);
      sessionStorage.removeItem(`ebdaey_checkout_l_${bookingId}`);
      navigate(urls.mentorPath(`/l/${courseSlug}/payment?${query.toString()}`), { replace: true });
      return;
    }
    if (["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(status)) {
      const message = getFriendlyPaymentError({
        gwCode: searchParams.get("gwCode") || undefined,
        gwMessage: searchParams.get("gwMessage") || undefined,
        reason: searchParams.get("reason") || undefined,
      });
      toast({
        title: t("liveCourse:checkout.toast.errorTitle"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
      navigate(urls.mentorPath(`/l-booking/${bookingId}/payment`), { replace: true });
    }
  }, [bookingId, courseSlug, searchParams, navigate, urls, t, toast]);


  const handleStep1Next = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: t("liveCourse:checkout.toast.fillRequired"), variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: t("liveCourse:checkout.toast.invalidEmail"), variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: t("liveCourse:checkout.toast.emailTypoTitle"),
        description: t("liveCourse:checkout.toast.emailTypoDesc", { typo: emailError.typo, correct: emailError.correct }),
        variant: "destructive",
      });
      return;
    }
    if (!phone || phone.length < 8) {
      toast({ title: t("liveCourse:checkout.toast.invalidPhone"), variant: "destructive" });
      return;
    }
    if (bookingId) {
      setStep(2);
      return;
    }
    const key = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      sessionStorage.setItem(
        `ebdaey_checkout_l_${key}`,
        JSON.stringify({ courseSlug, firstName, lastName, email, phone }),
      );
    } catch {}
    navigate(urls.mentorPath(`/l-booking/${key}/payment`));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim() || !tenantId || !course) return;
    setValidatingCoupon(true);
    try {
      const res = await supabase.functions.invoke("validate-coupon", {
        body: {
          code: couponCode.trim(),
          tenant_id: tenantId,
          currency: getDisplayCurrency(),
        },
      });
      const data = res.data as any;
      if (data?.valid) {
        setCouponApplied({
          id: data.coupon_id,
          discount_type: data.discount_type,
          discount_value: Number(data.discount_value),
        });
        toast({ title: t("liveCourse:checkout.toast.couponSuccess") });
      } else {
        toast({ title: data?.message || t("liveCourse:checkout.toast.couponInvalid"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("liveCourse:checkout.toast.genericError"), variant: "destructive" });
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
    if (!course || !tenantId) return;
    if (isFull) {
      toast({ title: t("liveCourse:checkout.toast.capacityFull"), description: t("liveCourse:checkout.toast.capacityFullDesc"), variant: "destructive" });
      return;
    }
    setBuying(true);
    try {
      if (paymentMethod === "wallet" && !isStripeCurrency(getDisplayCurrency()) && total > 0 && !/^01[0-9]{9}$/.test(walletPhone)) {
        toast({ title: t("liveCourse:checkout.toast.invalidWallet"), variant: "destructive" });
        setBuying(false);
        return;
      }
      const redirectPath = bookingId
        ? `/l/${(course as any).slug || courseSlug}/payment`
        : `/l/${courseSlug}/payment`;
      const redirectUrl = `${window.location.origin}${urls.mentorPath(redirectPath)}`;
      let bookingMeta: { date: string; time: string } | null = null;
      if ((course as any).product_type === "consultation") {
        const raw = sessionStorage.getItem(`consultation_booking_${course.id}`);
        if (raw) {
          try {
            bookingMeta = JSON.parse(raw);
          } catch {}
        }
        if (!bookingMeta) {
          toast({ title: t("liveCourse:checkout.toast.pickBookingFirst"), variant: "destructive" });
          setBuying(false);
          return;
        }
      }
      const res = await supabase.functions.invoke("live-course-checkout", {
        body: {
          live_course_id: course.id,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
          tenant_id: tenantId,
          redirect_url: redirectUrl,
          payment_key: bookingId || null,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          booking_date: bookingMeta?.date,
          booking_time: bookingMeta?.time,
          coupon_id: couponApplied?.id || null,
          payment_method: paymentMethod,
          wallet_phone: paymentMethod === "wallet" ? walletPhone : undefined,
          has_order_bump: !!(bumpAccepted && bump),
        },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) {
        if (data.error === "capacity_full") {
          toast({ title: t("liveCourse:checkout.toast.capacityFull"), variant: "destructive" });
        } else if (data.error === "already_purchased") {
          if (data.purchase_id) {
            localStorage.setItem("checkout_email", email);
            localStorage.setItem("lc_purchase_id", data.purchase_id);
            navigate(urls.mentorPath(`/l/${courseSlug}/payment?paymentStatus=SUCCESS&purchaseId=${encodeURIComponent(data.purchase_id)}`));
          } else {
            toast({ title: t("liveCourse:checkout.toast.alreadyBooked") });
          }
        } else {
          toast({ title: t("liveCourse:checkout.toast.errorTitle"), description: data.error, variant: "destructive" });
        }
        return;
      }
      localStorage.setItem("checkout_email", email);
      if (data?.purchase_id) localStorage.setItem("lc_purchase_id", data.purchase_id);
      if (data?.free) {
        navigate(urls.mentorPath(`/l/${courseSlug}/payment?free=true`));
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
        setWalletPayment(paymentMethod === "wallet" && data?.purchase_id ? { kind: "lc", id: data.purchase_id } : null);
        setIframeUrl(data.iframe_url);
        setIframeOpen(true);
        return;
      }
    } catch (err: any) {
      toast({ title: t("liveCourse:checkout.toast.genericError"), description: err?.message || t("liveCourse:checkout.toast.retry"), variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  usePageReady(loading);
  if (loading) return <TopLoadingBar coverPage />;
  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("liveCourse:checkout.notFound")}</p>
      </div>
    );
  }

  const bumpPrice = bump ? (bump.discount_price ?? bump.price) : 0;
  const subtotal = course.price + (bumpAccepted && bump ? bumpPrice : 0);
  const discount = computeDiscount(subtotal);
  const total = Math.max(0, subtotal - discount);

  const isConsultation = (course as any).product_type === "consultation";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
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
            { label: t("liveCourse:checkout.steps.info"), hint: t("liveCourse:checkout.steps.infoHint") },
            { label: isConsultation ? t("liveCourse:checkout.steps.book") : t("liveCourse:checkout.steps.pay"), hint: t("liveCourse:checkout.steps.payHint") },
          ]}
        />

        {step === 1 ? (
          /* ============ STEP 1 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} width={56} height={56} loading="eager" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("liveCourse:checkout.price")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">{course.title}</h3>
                <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1 flex-wrap">
                  {isConsultation ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {toAr((course as any).session_duration_minutes || 30)} {t("liveCourse:page.minute")}
                    </span>
                  ) : sessionsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      {toAr(sessionsCount)} {t("liveCourse:checkout.lecture")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {course.attendance_type === "in_person" ? <MapPin className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    {course.attendance_type === "zoom"
                      ? t("liveCourse:page.attendance.zoom")
                      : course.attendance_type === "online"
                        ? t("liveCourse:page.attendance.online")
                        : t("liveCourse:page.attendance.inPerson")}
                  </span>
                </div>
              </div>
              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {course.price > 0 ? toArPrice(course.price) : t("liveCourse:checkout.free")}
                </span>
              </div>
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
                        {t("liveCourse:checkout.bumpBadge")}
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

            {isFull && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-center">
                <p className="font-bold text-destructive text-sm">{t("liveCourse:checkout.fullTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("liveCourse:checkout.fullDesc")}</p>
              </div>
            )}

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t("liveCourse:checkout.contactTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("liveCourse:checkout.contactHint")}</p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label={t("liveCourse:checkout.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <FloatingInput
                    label={t("liveCourse:checkout.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div>
                  <FloatingInput
                    type="email"
                    label={t("liveCourse:checkout.emailPlaceholder")}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value, setEmail)}
                    dir="ltr"
                    error={emailError.hasError}
                  />
                  {emailError.hasError && (
                    <p className="text-destructive text-xs mt-1.5 ms-1 font-medium">
                      {t("liveCourse:checkout.toast.emailTypoDesc", { typo: emailError.typo, correct: emailError.correct })}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute -top-2 start-4 z-10 px-1.5 bg-card text-[11px] font-semibold text-foreground">
                    {t("liveCourse:checkout.phonePlaceholder")}
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
                  {t("liveCourse:checkout.back")}
                </button>
                <Button
                  onClick={handleStep1Next}
                  disabled={isFull}
                  className="rounded-2xl h-12 px-8 font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {t("liveCourse:checkout.continue")}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("liveCourse:checkout.secured")}</span>
            </div>
          </div>
        ) : (
          /* ============ STEP 2 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} width={56} height={56} loading="eager" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("liveCourse:checkout.price")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">{course.title}</h3>
                <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1 flex-wrap">
                  {isConsultation ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {toAr((course as any).session_duration_minutes || 30)} {t("liveCourse:page.minute")}
                    </span>
                  ) : sessionsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      {toAr(sessionsCount)} {t("liveCourse:checkout.lecture")}
                    </span>
                  )}
                  {course.capacity != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {toAr(Math.max(0, course.capacity - seatsTaken))} {t("liveCourse:checkout.seatsLeft")}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {total > 0 ? toArPrice(total) : t("liveCourse:checkout.free")}
                </span>
                {couponApplied && discount > 0 && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground line-through">
                    {toArPrice(course.price)}
                  </div>
                )}
              </div>
            </div>

            {/* Gift strip */}
            {giftCourses.length > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-bold text-primary mb-1.5 uppercase tracking-wider rtl:tracking-normal">
                  {t("liveCourse:checkout.giftsTitle")}
                </p>
                <div className="space-y-1">
                  {giftCourses.map((gc: any) => (
                    <div key={`${gc.kind}:${gc.id}`} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate flex-1 me-2">{gc.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {gc.price > 0 && (
                          <span className="text-muted-foreground line-through">{toArPrice(gc.price)}</span>
                        )}
                        <span className="font-bold text-primary">{t("liveCourse:checkout.free2")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFull && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-center">
                <p className="font-bold text-destructive text-sm">{t("liveCourse:checkout.fullTitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("liveCourse:checkout.fullDesc")}</p>
              </div>
            )}

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t("liveCourse:checkout.paymentMethod")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("liveCourse:checkout.paymentMethodHint")}</p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-4">
                {course.price > 0 && (
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
                      <span className="text-sm font-semibold flex-1">{t("liveCourse:checkout.cards")}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <img src={visaAsset.url} alt="Visa" className="h-4 object-contain" />
                        <img src={mastercardAsset.url} alt="Mastercard" className="h-4 object-contain" />
                        <img src={meezaDigitalAsset.url} alt="Meeza" className="h-4 object-contain" />
                      </div>
                    </button>

                    <WalletPaymentOption
                      selected={paymentMethod === "wallet"}
                      onSelect={() => setPaymentMethod("wallet")}
                      label={t("liveCourse:checkout.wallet")}
                      inputLabel={t("liveCourse:checkout.walletLabel")}
                      value={walletPhone}
                      onChange={setWalletPhone}
                      showInput={total > 0}
                      hint={t("liveCourse:checkout.walletHint")}
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
                        <span className="text-sm font-semibold flex-1">{t("liveCourse:checkout.applePay")}</span>
                      </button>
                    )}
                    </>
                    )}
                  </div>
                )}

                {course.price > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowCoupon((s) => !s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {t("liveCourse:checkout.haveCoupon")}
                    </button>

                    {showCoupon && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder={t("liveCourse:checkout.couponPlaceholder")}
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
                          {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("liveCourse:checkout.apply")}
                        </Button>
                      </div>
                    )}
                    {couponApplied && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-primary bg-primary/5 rounded-lg px-2.5 py-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="font-semibold">{t("liveCourse:checkout.couponApplied")}</span>
                        <span className="ms-auto font-bold">- {toArPrice(discount)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-sm font-semibold text-muted-foreground">{t("liveCourse:checkout.total")}</span>
                  <span className="font-black text-foreground text-xl">
                    {total > 0 ? toArPrice(total) : t("liveCourse:checkout.free")}
                  </span>
                </div>
              </div>

              <div className="px-6 md:px-8 py-5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("liveCourse:checkout.editData")}
                </button>
                <Button
                  onClick={handlePay}
                  disabled={buying || isFull}
                  className="rounded-2xl h-12 px-8 font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {buying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 me-2" />
                      {total > 0
                        ? t("liveCourse:checkout.payBtn", { amount: toArPrice(total) })
                        : t("liveCourse:checkout.confirmBooking")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("liveCourse:checkout.secured")}</span>
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
        successUrlPrefix={`${window.location.origin}${urls.mentorPath(bookingId ? `/l-booking/${bookingId}/payment` : `/l/${courseSlug}/payment`)}`}
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

export default LiveCourseCheckoutPage;
