import { StripePaymentOption, isStripeCurrency } from "@/components/checkout/StripePaymentOption";
import { applyLocalPrice, localBumpPrice, getDisplayCurrency, syncDisplayFromProduct } from "@/lib/localPrice";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useState, useEffect, useMemo } from "react";
import { usePageReady } from "@/hooks/usePageReady";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Lock,
  Plus,
  Package,
  Clock,
  PlayCircle,

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputField } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { queryClient, qk, fetchMentor, type fetchCourseBundle } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import PixelInjector, { firePixelEvent } from "@/components/common/PixelInjector";
import { loadGiftCoursesFor, fetchGiftDisplays } from "@/lib/giftItems";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import meezaAsset from "@/assets/pg-meeza.png.asset.json";
import visaAsset from "@/assets/pg-visa.png.asset.json";
import mastercardAsset from "@/assets/pg-mastercard.svg.asset.json";
import meezaDigitalAsset from "@/assets/pg-meeza-digital.png.asset.json";
import { Label } from "@/components/ui/label";
import VideoThumbnail from "@/components/media/VideoThumbnail";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import ApplePayLogo from "@/components/common/ApplePayLogo";
import CheckoutStepProgress from "@/components/checkout/CheckoutStepProgress";
import PaymobIframeModal from "@/components/checkout/PaymobIframeModal";
import { getFriendlyPaymentError, GENERIC_PAYMENT_FAILURE } from "@/lib/checkout/paymentFailureMessage";
import { useApplePayAvailable } from "@/hooks/useApplePayAvailable";
import { FloatingInput } from "@/components/checkout/FloatingInput";
import { WalletPaymentOption } from "@/components/checkout/WalletPaymentOption";

import { toAr, toArPrice } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CourseInfo {
  id: string;
  title: string;
  price: number;
  thumbnail_url: string | null;
  slug: string;
  banner_type: string | null;
  banner_video_url: string | null;
}

interface MentorInfo {
  name: string;
  profile_image_url: string | null;
  primary_color: string | null;
  whatsapp_number: string | null;
  whatsapp_default_color: boolean;
}

interface OrderBumpInfo {
  title: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  bump_course_id: string | null;
  bump_live_course_id: string | null;
  bump_digital_product_id: string | null;
}

const CheckoutPage = () => {
  const { courseSlug: routeCourseSlug, bookingId } = useParams<{ courseSlug?: string; bookingId?: string }>();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const savedCheckout = useMemo(() => {
    if (!bookingId) return null;
    try {
      const raw = sessionStorage.getItem(`ebdaey_checkout_c_${bookingId}`);
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
  const [course, setCourse] = useState<CourseInfo | null>(null);
  syncDisplayFromProduct(course as any);
  const [mentor, setMentor] = useState<MentorInfo | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  // Step 1: Contact info
  const [firstName, setFirstName] = useState(savedCheckout?.firstName || "");
  const [lastName, setLastName] = useState(savedCheckout?.lastName || "");
  const [email, setEmail] = useState(savedCheckout?.email || "");
  const { emailError, handleEmailChange } = useEmailTypoCheck();
  const [phone, setPhone] = useState(savedCheckout?.phone || "");

  // Step 2: Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ discount_type: string; discount_value: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "apple_pay">("card");
  const [walletPhone, setWalletPhone] = useState("");
  const applePayAvailable = useApplePayAvailable();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletPayment, setWalletPayment] = useState<{ kind: "order" | "lc" | "dp" | "sub"; id: string } | null>(null);
  const [iframeOpen, setIframeOpen] = useState(false);

  // Order Bump
  const [orderBump, setOrderBump] = useState<OrderBumpInfo | null>(null);
  const [bumpSelected, setBumpSelected] = useState(false);

  // Course stats
  const [lessonsCount, setLessonsCount] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [giftCourses, setGiftCourses] = useState<{ id: string; title: string; price: number }[]>([]);

  useEffect(() => {
    if (mentorSlug && courseSlug) loadCourse();
    else setLoading(false);
  }, [mentorSlug, courseSlug]);

  // Fire toast for a pending failure stashed in sessionStorage across a reload
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
        title: t("coursePage.checkout.toast.error"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
    } catch {}
  }, [bookingId, t, toast]);

  // Handle returning from PayMob to /c-booking/{key}/payment with status params
  useEffect(() => {
    if (!bookingId || !courseSlug) return;
    const status = (searchParams.get("paymentStatus") || searchParams.get("status") || "").toLowerCase();
    if (["success", "captured", "paid", "completed"].includes(status)) {
      const query = new URLSearchParams(searchParams);
      sessionStorage.removeItem(`ebdaey_checkout_c_${bookingId}`);
      navigate(urls.mentorPath(`/c/${courseSlug}/payment?${query.toString()}`), { replace: true });
      return;
    }
    if (["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(status)) {
      const message = getFriendlyPaymentError({
        gwCode: searchParams.get("gwCode") || undefined,
        gwMessage: searchParams.get("gwMessage") || undefined,
        reason: searchParams.get("reason") || undefined,
      });
      toast({
        title: t("coursePage.checkout.toast.error"),
        description: message || GENERIC_PAYMENT_FAILURE,
        variant: "destructive",
      });
      navigate(urls.mentorPath(`/c-booking/${bookingId}/payment`), { replace: true });
    }
  }, [bookingId, courseSlug, searchParams, navigate, urls, t, toast]);

  const loadCourse = async () => {
    try {
      // 1. Check if course bundle is already in React Query cache
      const cached =
        mentorSlug && courseSlug
          ? queryClient.getQueryData<Awaited<ReturnType<typeof fetchCourseBundle>>>(qk.course(mentorSlug, courseSlug))
          : null;

      let tenant = cached?.tenant || null;
      let courseData = cached?.course || null;

      if (!tenant) {
        tenant = await fetchMentor(mentorSlug!);
      }
      if (!tenant) return;

      setTenantId(tenant.id);
      setMentor({
        name: tenant.name,
        profile_image_url: tenant.profile_image_url,
        primary_color: tenant.primary_color,
        whatsapp_number: (tenant as any).whatsapp_number,
        whatsapp_default_color: (tenant as any).whatsapp_default_color ?? true,
      });

      if (!courseData) {
        const { data: fetchedCourse } = await supabase
          .from("courses")
          .select("id, title, price, thumbnail_url, slug, banner_type, banner_video_url")
          .eq("tenant_id", tenant.id)
          .eq("slug", courseSlug!)
          .maybeSingle();
        courseData = fetchedCourse as any;
        if (courseData) {
          await applyLocalPrice("course", courseData);
        }
      }

      if (!courseData) return;
      setCourse(courseData);

      // Hydrate giftCourses and lessonsCount if cached
      if (cached?.giftCourses && cached.giftCourses.length > 0) {
        setGiftCourses(cached.giftCourses.map((g) => ({ id: `${g.kind}:${g.id}`, title: g.title, price: g.price })));
      }
      if (typeof cached?.lessonsCount === "number") {
        setLessonsCount(cached.lessonsCount);
      }

      // Fast-path: Set loading false so UI renders immediately from cache
      setLoading(false);

      // Fetch bump and secondary stats in parallel
      const [giftItems, bumpResult, sectionsResult] = await Promise.all([
        !cached?.giftCourses ? loadGiftCoursesFor({ courseId: courseData.id }) : Promise.resolve([]),
        supabase.from("order_bumps").select("*").eq("course_id", courseData.id).eq("is_enabled", true).maybeSingle(),
        supabase.from("course_sections").select("id").eq("course_id", courseData.id),
      ]);

      if (!cached?.giftCourses && giftItems.length > 0) {
        const giftDisplays = await fetchGiftDisplays(giftItems);
        setGiftCourses(giftDisplays.map((g) => ({ id: `${g.kind}:${g.id}`, title: g.title, price: g.price })));
      }

      // Process lessons duration
      const sections = sectionsResult.data;
      if (sections && sections.length > 0) {
        const { data: lessons } = await supabase.rpc("get_public_course_curriculum", {
          _course_id: courseData.id,
        });

        if (lessons) {
          setLessonsCount(lessons.length);
          setTotalDurationSeconds(lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0));
        }
      }

      // Process order bump
      const bumpData = bumpResult.data;
      if (
        bumpData &&
        ((bumpData as any).bump_course_id ||
          (bumpData as any).bump_live_course_id ||
          (bumpData as any).bump_digital_product_id)
      ) {
        const b = bumpData as any;
        const bp = await localBumpPrice("course", b.id);
        if (bp)
          setOrderBump({
            title: b.title,
            description: b.description,
            price: bp.price,
            discount_price: bp.discount_price,
            bump_course_id: b.bump_course_id ?? null,
            bump_live_course_id: b.bump_live_course_id ?? null,
            bump_digital_product_id: b.bump_digital_product_id ?? null,
          });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBumpPrice = () => {
    if (!orderBump || !bumpSelected) return 0;
    return orderBump.discount_price ?? orderBump.price;
  };

  const getDiscountedPrice = () => {
    if (!course) return 0;
    const base = course.price + getBumpPrice();
    return Math.max(0, base - getDiscountAmount());
  };

  const getDiscountAmount = () => {
    if (!course || !couponApplied) return 0;
    const base = course.price + getBumpPrice();
    if (couponApplied.discount_type === "percentage") {
      return Math.min(base, (base * couponApplied.discount_value) / 100);
    }
    return Math.min(base, couponApplied.discount_value);
  };


  const handleStep1Next = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: t("coursePage.checkout.toast.fillRequired"), variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: t("coursePage.checkout.toast.invalidEmail"), variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: t("coursePage.checkout.toast.emailTypoTitle"),
        description: t("coursePage.checkout.emailTypo", { typo: emailError.typo, correct: emailError.correct }),
        variant: "destructive",
      });
      return;
    }
    if (!phone || phone.length < 8) {
      toast({ title: t("coursePage.checkout.toast.invalidPhone"), variant: "destructive" });
      return;
    }

    // Generate a payment key + persist step-1 state so step 2 has its own URL
    if (bookingId) {
      setStep(2);
      return;
    }
    const key = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      sessionStorage.setItem(
        `ebdaey_checkout_c_${key}`,
        JSON.stringify({ courseSlug, firstName, lastName, email, phone }),
      );
    } catch {}
    navigate(urls.mentorPath(`/c-booking/${key}/payment`));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !tenantId) return;
    setValidatingCoupon(true);
    try {
      const res = await supabase.functions.invoke("validate-coupon", {
        body: { code: couponCode.trim(), tenant_id: tenantId, currency: getDisplayCurrency() },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data.valid) {
        setCouponApplied({ discount_type: data.discount_type, discount_value: Number(data.discount_value) });
        toast({ title: t("coursePage.checkout.toast.couponApplied") });
      } else {
        toast({ title: data.message || t("coursePage.checkout.toast.couponInvalid"), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: t("coursePage.checkout.toast.couponError"), variant: "destructive" });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePay = async () => {
    if (!course || !tenantId) return;
    setBuying(true);
    try {
      if (paymentMethod === "wallet" && !isStripeCurrency(getDisplayCurrency()) && getDiscountedPrice() > 0 && !/^01[0-9]{9}$/.test(walletPhone)) {
        toast({ title: t("coursePage.checkout.toast.invalidWallet"), variant: "destructive" });
        setBuying(false);
        return;
      }
      const redirectPath = bookingId
        ? `/c/${(course as any).slug || courseSlug}/payment`
        : `/c/${courseSlug}/payment`;
      const redirectUrl = `${window.location.origin}${urls.mentorPath(redirectPath)}`;
      const includeBump = bumpSelected && orderBump;
      const bumpPrice = includeBump ? (orderBump!.discount_price ?? orderBump!.price) : 0;
      const res = await supabase.functions.invoke("kashier-create-session", {
        body: {
          course_id: course.id,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
          tenant_id: tenantId,
          redirect_url: redirectUrl,
          payment_key: bookingId || null,
          guest_checkout: true,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          coupon_code: couponApplied ? couponCode.trim() : undefined,
          payment_method: paymentMethod,
          wallet_phone: paymentMethod === "wallet" ? walletPhone : undefined,
          has_order_bump: !!includeBump,
          bump_amount: bumpPrice,
          bump_course_id: includeBump ? orderBump!.bump_course_id : null,
          bump_live_course_id: includeBump ? orderBump!.bump_live_course_id : null,
          bump_digital_product_id: includeBump ? orderBump!.bump_digital_product_id : null,
          existing_order_id: pendingOrderId,
        },
      });
      let data = res.data;
      if (res.error) {
        try {
          const ctx: any = (res.error as any).context;
          if (ctx && typeof ctx.json === "function") {
            data = await ctx.json();
          }
        } catch {}
        if (!data?.error) throw res.error;
      }
      if (data?.error) {
        if (data.error === "already_enrolled") {
          if (data.guest_account_exists) {
            toast({
              title: t("coursePage.checkout.toast.alreadyEnrolledTitle"),
              description: t("coursePage.checkout.toast.alreadyEnrolledDesc"),
            });
          } else {
            toast({ title: t("coursePage.checkout.toast.alreadyEnrolledShort") });
          }
        } else {
          toast({ title: t("coursePage.checkout.toast.error"), description: data.error, variant: "destructive" });
        }
        return;
      }
      localStorage.setItem("checkout_email", email);
      if (data?.order_id) {
        setPendingOrderId(data.order_id);
        localStorage.setItem("order_id", data.order_id);
      }
      firePixelEvent("InitiateCheckout", {
        content_name: course.title,
        content_ids: [course.id],
        value: getDiscountedPrice(),
        currency: getDisplayCurrency(),
      });
      if (data?.free) {
        navigate(urls.mentorPath(`/c/${courseSlug}/payment?free=true`));
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
        setWalletPayment(paymentMethod === "wallet" && data?.order_id ? { kind: "order", id: data.order_id } : null);
        setIframeUrl(data.iframe_url);
        setIframeOpen(true);
        return;
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: t("coursePage.checkout.toast.genericError"),
        description: err?.message || t("coursePage.checkout.toast.retry"),
        variant: "destructive",
      });
    } finally {
      setBuying(false);
    }
  };

  usePageReady(loading);
  if (loading) {
    return <TopLoadingBar coverPage />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("coursePage.checkout.notFound")}</p>
      </div>
    );
  }

  const finalPrice = getDiscountedPrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">

      {tenantId && <PixelInjector tenantId={tenantId} />}
      {mentor?.primary_color && <TenantThemeInjector primaryColor={mentor.primary_color} />}

      {/* Top Nav */}
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
        {/* Step Progress */}
        <CheckoutStepProgress
          currentStep={step}
          steps={[
            { label: t("coursePage.checkout.steps.info"), hint: t("coursePage.checkout.steps.infoHint") },
            { label: t("coursePage.checkout.steps.payment"), hint: t("coursePage.checkout.steps.paymentHint") },
          ]}
        />

        {step === 1 ? (
          /* ============ STEP 1 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    width={56}
                    height={56}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("coursePage.checkout.priceLabel")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">
                  {course.title}
                </h3>
                {(lessonsCount > 0 || totalDurationSeconds > 0) && (
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                    {lessonsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        {`${toAr(lessonsCount)} ${t("coursePage.curriculum.lectureLabel")}`}
                      </span>
                    )}
                    {totalDurationSeconds > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const hours = Math.floor(totalDurationSeconds / 3600);
                          const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
                          const h = t("coursePage.curriculum.shortHour");
                          const m = t("coursePage.curriculum.shortMinute");
                          const and = t("coursePage.checkout.and", "و");
                          if (hours > 0 && minutes > 0) return `${toAr(hours)} ${h} ${and} ${toAr(minutes)} ${m}`;
                          if (hours > 0) return `${toAr(hours)} ${h}`;
                          return `${toAr(minutes)} ${m}`;
                        })()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {course.price > 0 ? toArPrice(course.price) : t("coursePage.checkout.free")}
                </span>
              </div>
            </div>

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {t("coursePage.checkout.contact.title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("coursePage.checkout.contact.subtitle")}
                </p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label={t("coursePage.checkout.contact.firstName")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <FloatingInput
                    label={t("coursePage.checkout.contact.lastName")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div>
                  <FloatingInput
                    type="email"
                    label={t("coursePage.checkout.contact.email")}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value, setEmail)}
                    dir="ltr"
                    error={emailError.hasError}
                  />
                  {emailError.hasError && (
                    <p className="text-destructive text-xs mt-1.5 ms-1 font-medium">
                      {t("coursePage.checkout.emailTypo", { typo: emailError.typo, correct: emailError.correct })}
                    </p>
                  )}
                </div>

                {/* Phone — floating label wrapper */}
                <div className="relative">
                  <span className="absolute -top-2 start-4 z-10 px-1.5 bg-card text-[11px] font-semibold text-foreground">
                    {t("coursePage.checkout.contact.phone")}
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
                  {t("coursePage.checkout.contact.back")}
                </button>
                <Button
                  onClick={handleStep1Next}
                  className="rounded-2xl h-12 px-8 font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {t("coursePage.checkout.contact.next")}
                </Button>
              </div>
            </div>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("coursePage.checkout.encrypted")}</span>
            </div>
          </div>
        ) : (
          /* ============ STEP 2 — Single Column Stream ============ */
          <div className="max-w-lg mx-auto space-y-5">
            {/* Compact summary strip (mirrors step 1) */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    width={56}
                    height={56}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider rtl:tracking-normal">
                  {t("coursePage.checkout.priceLabel")}
                </p>
                <h3 className="text-sm font-bold text-foreground truncate leading-tight mt-0.5">
                  {course.title}
                </h3>
                {(lessonsCount > 0 || totalDurationSeconds > 0) && (
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                    {lessonsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        {`${toAr(lessonsCount)} ${t("coursePage.curriculum.lectureLabel")}`}
                      </span>
                    )}
                    {totalDurationSeconds > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const hours = Math.floor(totalDurationSeconds / 3600);
                          const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
                          const h = t("coursePage.curriculum.shortHour");
                          const m = t("coursePage.curriculum.shortMinute");
                          const and = t("coursePage.checkout.and", "و");
                          if (hours > 0 && minutes > 0) return `${toAr(hours)} ${h} ${and} ${toAr(minutes)} ${m}`;
                          if (hours > 0) return `${toAr(hours)} ${h}`;
                          return `${toAr(minutes)} ${m}`;
                        })()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-end shrink-0">
                <span className="font-black text-primary text-lg leading-none">
                  {finalPrice > 0 ? toArPrice(finalPrice) : t("coursePage.checkout.free")}
                </span>
                {couponApplied && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground line-through">
                    {toArPrice(course.price)}
                  </div>
                )}
              </div>
            </div>

            {/* Gift courses strip */}
            {giftCourses.length > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-bold text-primary mb-1.5 uppercase tracking-wider rtl:tracking-normal">
                  {t("coursePage.checkout.giftBadge")}
                </p>
                <div className="space-y-1">
                  {giftCourses.map((gc) => (
                    <div key={gc.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate flex-1 me-2">{gc.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {gc.price > 0 && (
                          <span className="text-muted-foreground line-through">{toArPrice(gc.price)}</span>
                        )}
                        <span className="font-bold text-primary">{t("coursePage.checkout.freeGift")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form card */}
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 md:p-8 pb-3">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {t("coursePage.checkout.payment.title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("coursePage.checkout.payment.subtitle")}
                </p>
              </div>

              <div className="px-6 md:px-8 pt-2 pb-6 space-y-4">
                {/* Payment Methods — Radio Cards */}
                <div className="space-y-2.5">
                  {isStripeCurrency(getDisplayCurrency()) ? (
                    <StripePaymentOption />
                  ) : (
                  <>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-start transition-all ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:border-border"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        paymentMethod === "card" ? "border-primary" : "border-muted-foreground/30"
                      }`}
                    >
                      {paymentMethod === "card" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <CreditCard className="w-4 h-4 text-foreground shrink-0" />
                    <span className="text-sm font-semibold flex-1">{t("coursePage.checkout.payment.cards")}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <img src={visaAsset.url} alt="Visa" className="h-4 object-contain" />
                      <img src={mastercardAsset.url} alt="Mastercard" className="h-4 object-contain" />
                      <img src={meezaDigitalAsset.url} alt="Meeza" className="h-4 object-contain" />
                    </div>
                  </button>

                  <WalletPaymentOption
                    selected={paymentMethod === "wallet"}
                    onSelect={() => setPaymentMethod("wallet")}
                    label={t("coursePage.checkout.payment.wallet")}
                    inputLabel={t("coursePage.checkout.payment.walletLabel")}
                    value={walletPhone}
                    onChange={setWalletPhone}
                    showInput={getDiscountedPrice() > 0}
                    hint={t("coursePage.checkout.payment.walletHint")}
                  />

                  {applePayAvailable && (
                    <button
                      onClick={() => setPaymentMethod("apple_pay")}
                      className={`w-full relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-start transition-all ${
                        paymentMethod === "apple_pay"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 bg-card hover:border-border"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          paymentMethod === "apple_pay" ? "border-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {paymentMethod === "apple_pay" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <ApplePayLogo className="w-8 h-4 text-foreground shrink-0" />
                      <span className="text-sm font-semibold flex-1">{t("coursePage.checkout.payment.applePay")}</span>
                    </button>
                  )}
                  </>
                  )}
                </div>

                {/* Order Bump */}
                {orderBump && (
                  <div
                    onClick={() => setBumpSelected(!bumpSelected)}
                    className={`rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                      bumpSelected
                        ? "border-primary bg-primary/5"
                        : "border-dashed border-border/60 bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        checked={bumpSelected}
                        onCheckedChange={(c) => setBumpSelected(!!c)}
                        className="mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-bold text-primary text-[11px] uppercase tracking-wider rtl:tracking-normal">
                            {t("coursePage.checkout.bump.addLabel")}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">{orderBump.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {orderBump.discount_price != null && orderBump.discount_price < orderBump.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {toArPrice(orderBump.price)}
                            </span>
                          )}
                          <span className="font-bold text-primary text-sm">
                            {toArPrice(orderBump.discount_price ?? orderBump.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowCoupon((s) => !s)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {t("coursePage.checkout.coupon.prompt")}
                  </button>

                  {showCoupon && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder={t("coursePage.checkout.coupon.placeholder")}
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
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="rounded-xl shrink-0 h-10 text-xs"
                      >
                        {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("coursePage.checkout.coupon.apply")}
                      </Button>
                    </div>
                  )}
                  {couponApplied && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-primary bg-primary/5 rounded-lg px-2.5 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="font-semibold">{t("coursePage.checkout.coupon.applied")}</span>
                      <span className="ms-auto font-bold">- {toArPrice(getDiscountAmount())}</span>
                    </div>
                  )}
                </div>

                {/* Totals mini-row */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {t("coursePage.checkout.total")}
                  </span>
                  <span className="font-black text-foreground text-xl">
                    {finalPrice > 0 ? toArPrice(finalPrice) : t("coursePage.checkout.free")}
                  </span>
                </div>
              </div>

              <div className="px-6 md:px-8 py-5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("coursePage.checkout.editInfo")}
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
                      <Lock className="w-3.5 h-3.5 me-2" />
                      {finalPrice <= 0
                        ? t("coursePage.checkout.continue")
                        : t("coursePage.checkout.pay", { price: toArPrice(finalPrice) })}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{t("coursePage.checkout.encrypted")}</span>
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
        successUrlPrefix={`${window.location.origin}${urls.mentorPath(bookingId ? `/c-booking/${bookingId}/payment` : `/c/${courseSlug}/payment`)}`}
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

export default CheckoutPage;
