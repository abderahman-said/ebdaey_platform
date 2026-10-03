import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInputField } from "@/components/ui/phone-input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Mail,
  Lock,
  User,
  Link2,
  Briefcase,
  ShieldCheck,
  Check,
  UserRound,
  Package,
  Home,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

type Step = "form" | "otp" | "details" | "google-phone" | "done";

interface Props {
  onSwitchToLogin: () => void;
  resume?: boolean;
}

const specializations = [
  "التسويق الرقمي",
  "البرمجة والتقنية",
  "التصميم والإبداع",
  "التصوير والفيديو",
  "الأعمال وريادة الأعمال",
  "التطوير الشخصي",
  "اللغات",
  "الصحة واللياقة",
  "التعليم والأكاديمي",
  "غير ذلك",
];

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 30);

export default function MentorSignupFlow({ onSwitchToLogin, resume }: Props) {
  const { t } = useTranslation();
  const { signUp, user } = useAuth();
  const { toast } = useToast();
  const urls = useMentorUrls();
  const { emailError, handleEmailChange } = useEmailTypoCheck();

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2
  const [resending, setResending] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for the resend button (rate-limit protection).
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // When we land on the OTP step, an email was just sent — start the 60s cooldown.
  useEffect(() => {
    if (step === "otp") setResendCooldown((c) => (c > 0 ? c : 60));
  }, [step]);

  // Step 3
  const [slug, setSlug] = useState("");
  const [slugLangWarning, setSlugLangWarning] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [brandName, setBrandName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);

  const isGoogleFlow = useRef(false);

  // Detect Google post-login return: if user is already authenticated and hits
  // this signup flow, treat as Google completion. Load tenant and pick step.
  useEffect(() => {
    // Resume via unconfirmed email (no session yet)
    if (!user && resume && step === "form") {
      try {
        const pendingEmail = sessionStorage.getItem("mentor_resume_email");
        if (pendingEmail) {
          setEmail(pendingEmail);
          setStep("otp");
          return;
        }
      } catch {
        /* ignore */
      }
    }
    if (!user) return;
    if (step !== "form") return;

    // If email not yet confirmed (email/password signup), force OTP step first
    const provider = (user.app_metadata as any)?.provider;
    if (!user.email_confirmed_at && provider !== "google") {
      setEmail(user.email ?? "");
      supabase.auth.resend({ type: "signup", email: user.email ?? "" }).catch(() => {});
      setStep("otp");
      return;
    }

    (async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, name, phone, specialty, first_name, last_name")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!tenant) return; // No mentor tenant → let them use normal flow
      isGoogleFlow.current = true;
      setTenantId(tenant.id);
      setBrandName(tenant.name ?? "");
      setSpecialty(tenant.specialty ?? "");
      setSlug(tenant.slug ?? "");
      setFirstName(tenant.first_name ?? "");
      setLastName(tenant.last_name ?? "");
      setPhone(tenant.phone ?? "");
      if (!tenant.phone) setStep("google-phone");
      else if (!tenant.specialty || !tenant.name) setStep("details");
      else if (resume) setStep("details");
      // else fully complete — leave on form so they can login/switch
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resume]);

  // Live slug availability check
  useEffect(() => {
    if (step !== "details" && step !== "google-phone") return;
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    let cancelled = false;
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("is_tenant_slug_available" as any, { _slug: slug });
      if (cancelled) return;
      setSlugAvailable(data === true);
      setSlugChecking(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug, step, user?.id]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        toast({ title: "خطأ", description: "فشل تسجيل الدخول بـ Google", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "خطأ", description: "أدخل الاسم الأول واسم العائلة", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "خطأ", description: "أدخل البريد الإلكتروني", variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: "خطأ في البريد الإلكتروني",
        description: `"${emailError.typo}" خطأ، الصحيح "${emailError.correct}"`,
        variant: "destructive",
      });
      return;
    }
    if (!phone || phone.length < 8) {
      toast({ title: "خطأ", description: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "خطأ", description: "أدخل كلمة المرور", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone,
          role: "mentor",
        },
        emailRedirectTo: `${window.location.origin}/auth?resume=1`,
      },
    });
    setSubmitting(false);

    if (error) {
      const msg = /already registered|already exists|user_exists/i.test(error.message)
        ? "هذا البريد مسجل بالفعل. سجّل دخولك."
        : error.message;
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }
    // Supabase returns a user with empty identities array when the email is already registered
    // (to prevent email enumeration). Detect that case explicitly.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      toast({
        title: "البريد مسجل بالفعل",
        description: "هذا البريد الإلكتروني مسجل من قبل. سجّل دخولك أو استخدم بريداً آخر.",
        variant: "destructive",
      });
      return;
    }
    try {
      sessionStorage.setItem("mentor_resume_email", email);
    } catch {
      /* ignore */
    }
    setStep("otp");
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    if (resendCooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth?resume=1` },
    });
    setResending(false);
    if (error) {
      // Supabase returns a rate-limit error like "For security purposes, you can only request this after N seconds."
      const match = /after (\d+) seconds?/i.exec(error.message || "");
      const wait = match ? parseInt(match[1], 10) : 60;
      setResendCooldown(wait);
      const msg =
        (error as any)?.status === 429 || match
          ? `يرجى الانتظار ${wait} ثانية قبل طلب رمز جديد.`
          : /already.*confirmed|email_confirmed/i.test(error.message)
          ? "هذا البريد مؤكّد بالفعل. سجّل دخولك."
          : "تعذر إعادة إرسال رمز التأكيد. حاول مرة أخرى.";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }
    setOtp("");
    setResendCooldown(60);
    toast({ title: "تم الإرسال", description: "أرسلنا رمز تأكيد جديد إلى بريدك" });
  };

  const handleVerifyOtp = async (code?: string) => {
    const token = (code ?? otp).trim();
    if (!email || token.length !== 6) {
      toast({ title: "خطأ", description: "أدخل الرمز المكوّن من 6 أرقام", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("verify-mentor-email-code", {
      body: { email, code: token },
    });
    setVerifying(false);
    if (error || data?.error || !data?.session?.access_token || !data?.session?.refresh_token) {
      const msg = data?.error || "الرمز غير صحيح أو منتهي الصلاحية. اطلب رمزاً جديداً.";
      toast({ title: "فشل التحقق", description: msg, variant: "destructive" });
      setOtp("");
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) {
      toast({
        title: "فشل التحقق",
        description: "تم تأكيد البريد، لكن تعذر بدء الجلسة. سجّل الدخول للمتابعة.",
        variant: "destructive",
      });
      setOtp("");
      return;
    }
    try {
      sessionStorage.removeItem("mentor_resume_email");
    } catch {
      /* ignore */
    }
    toast({ title: "تم التأكيد", description: "أكمل بيانات صفحتك للمتابعة" });
    const verifiedUserId = data.session.user?.id;
    if (verifiedUserId) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, name, phone, specialty, first_name, last_name")
        .eq("owner_id", verifiedUserId)
        .maybeSingle();

      if (tenant) {
        setTenantId(tenant.id);
        setBrandName(tenant.name ?? "");
        setSpecialty(tenant.specialty ?? "");
        setSlug(tenant.slug ?? "");
        setFirstName(tenant.first_name ?? firstName);
        setLastName(tenant.last_name ?? lastName);
        setPhone(tenant.phone ?? phone);
      }
    }
    setStep("details");
  };

  const handleGooglePhoneNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!phone || phone.length < 8) {
      toast({ title: "خطأ", description: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "خطأ", description: "أدخل الاسم الأول واسم العائلة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("tenants")
      .update({ phone, first_name: firstName.trim(), last_name: lastName.trim() })
      .eq("owner_id", user.id);
    setSubmitting(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setStep("details");
  };

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanSlug = slugify(slug);
    if (cleanSlug.length < 3) {
      toast({ title: "خطأ", description: "اسم المستخدم قصير جداً", variant: "destructive" });
      return;
    }
    if (slugAvailable === false) {
      toast({ title: "خطأ", description: "اسم المستخدم محجوز، اختر غيره", variant: "destructive" });
      return;
    }
    if (!brandName.trim()) {
      toast({ title: "خطأ", description: "أدخل اسم صفحتك/براندك", variant: "destructive" });
      return;
    }
    if (!specialty) {
      toast({ title: "خطأ", description: "اختر تخصصك", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("tenants")
      .update({ slug: cleanSlug, name: brandName.trim(), specialty })
      .eq("owner_id", user.id);
    setSubmitting(false);
    if (error) {
      const msg = /duplicate key|unique/i.test(error.message) ? "اسم المستخدم محجوز، اختر غيره" : error.message;
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }
    setStep("done");
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  if (step === "otp") {
    return (
      <div className="space-y-5 text-center">
        {resume && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 text-center">
            {t("mentorSignup.otp.resumeBanner")}
          </div>
        )}
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">{t("mentorSignup.otp.title")}</h2>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {t("mentorSignup.otp.descriptionPrefix")} <strong className="text-foreground">{email}</strong>{t("mentorSignup.otp.descriptionSuffix")}
        </p>

        <div className="flex justify-center" dir="ltr">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (v.length === 6) handleVerifyOtp(v);
            }}
            disabled={verifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg font-bold"
          onClick={() => handleVerifyOtp()}
          disabled={verifying || otp.length !== 6}
        >
          {verifying ? t("mentorSignup.otp.verifying") : t("mentorSignup.otp.confirm")}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendConfirmation}
          disabled={resending || resendCooldown > 0}
        >
          {resending
            ? t("mentorSignup.otp.sending")
            : resendCooldown > 0
            ? t("mentorSignup.otp.resendIn", { seconds: resendCooldown })
            : t("mentorSignup.otp.resend")}
          {!resending && resendCooldown === 0 && <RefreshCw className="w-4 h-4 mr-2" />}
        </Button>
        <p className="text-muted-foreground text-xs">
          {t("mentorSignup.otp.spamHint")}
        </p>
        <Button variant="ghost" className="w-full" onClick={() => setStep("form")}>
          {t("mentorSignup.otp.editEmail")}
        </Button>
      </div>
    );
  }

  if (step === "google-phone") {
    return (
      <form onSubmit={handleGooglePhoneNext} className="space-y-4">
        {resume && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 text-center">
            {t("mentorSignup.googlePhone.resumeBanner")}
          </div>
        )}
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold mb-1">{t("mentorSignup.googlePhone.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("mentorSignup.googlePhone.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="fn">{t("mentorSignup.googlePhone.firstName")}</Label>
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ln">{t("mentorSignup.googlePhone.lastName")}</Label>
            <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("mentorSignup.googlePhone.phone")}</Label>
          <PhoneInputField value={phone} onChange={setPhone} />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg"
        >
          {submitting ? t("mentorSignup.googlePhone.saving") : t("mentorSignup.googlePhone.next")}
          {!submitting && <ArrowLeft className="w-5 h-5 mr-2" />}
        </Button>
      </form>
    );
  }

  if (step === "details") {
    return (
      <form onSubmit={handleDetails} className="space-y-5">
        {resume && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm p-3 text-center">
            {t("mentorSignup.details.resumeBanner")}
          </div>
        )}
        <div className="text-end">
          <h2 className="text-xl font-bold mb-1">{t("mentorSignup.details.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("mentorSignup.details.subtitle")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug" className="text-sm font-medium">
            {t("mentorSignup.details.username")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slug"
            dir="ltr"
            placeholder={t("mentorSignup.details.usernamePlaceholder")}
            value={slug}
            onChange={(e) => {
              const raw = e.target.value;
              const cleaned = slugify(raw);
              setSlug(cleaned);
              setSlugLangWarning(raw !== cleaned && raw.length > 0);
            }}
          />
          {slugLangWarning ? (
            <p className="text-amber-600 text-xs font-medium text-end">{t("mentorSignup.details.usernameLangWarning")}</p>
          ) : slug && slug.length >= 3 ? (
            <p className="text-xs flex items-center justify-between" dir="ltr">
              <span className="text-muted-foreground">{slug}.ebdaey.com</span>
              {slugChecking ? (
                <span className="text-muted-foreground text-[10px]">...</span>
              ) : slugAvailable === true ? (
                <span className="text-emerald-600 text-[10px] font-bold">{t("mentorSignup.details.available")}</span>
              ) : slugAvailable === false ? (
                <span className="text-destructive text-[10px] font-bold">{t("mentorSignup.details.taken")}</span>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs text-end leading-relaxed">
              {t("mentorSignup.details.usernameHint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brand" className="text-sm font-medium">
            {t("mentorSignup.details.brand")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="brand"
            placeholder={t("mentorSignup.details.brandPlaceholder")}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
          <p className="text-muted-foreground text-xs text-end">{t("mentorSignup.details.brandHint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="spec" className="text-sm font-medium">
            {t("mentorSignup.details.specialty")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="spec"
            placeholder={t("mentorSignup.details.specialtyPlaceholder")}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
          <p className="text-muted-foreground text-xs text-end">{t("mentorSignup.details.specialtyHint")}</p>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg"
        >
          {submitting ? t("mentorSignup.details.saving") : t("mentorSignup.details.next")}
        </Button>
      </form>
    );
  }

  if (step === "done") {
    const dashboard = urls.mentorAppUrl("/");
    return (
      <div className="text-center space-y-6 py-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-9 h-9 text-primary-foreground" strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{t("mentorSignup.done.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("mentorSignup.done.subtitle")}</p>
        </div>
        <div className="space-y-3 pt-2 text-end">
          <a
            href={`${dashboard}?tab=profile`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
          >
            <UserRound className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{t("mentorSignup.done.completeProfile")}</span>
          </a>
          <a
            href={`${dashboard}?tab=courses`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
          >
            <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{t("mentorSignup.done.addProduct")}</span>
          </a>
          <a
            href={dashboard}
            className="flex items-center   gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
          >
            <Home className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{t("mentorSignup.done.goToDashboard")}</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 text-sm font-medium gap-2"
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        {googleLoading ? (
          t("mentorSignup.form.loading")
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("mentorSignup.form.signupWithGoogle")}
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t("mentorSignup.form.or")}</span>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleStep1}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="firstName"
                placeholder={t("mentorSignup.form.firstName")}
                className="pr-10 h-10"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Input
              id="lastName"
              placeholder={t("mentorSignup.form.lastName")}
              className="h-10"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              placeholder={t("mentorSignup.form.email")}
              className={`pr-10 h-10 ${emailError.hasError ? "border-destructive focus:border-destructive" : ""}`}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value, setEmail)}
            />
          </div>
          {emailError.hasError && (
            <p className="text-destructive text-xs font-medium text-end">
              {t("mentorSignup.form.emailTypo", { typo: emailError.typo, correct: emailError.correct })}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <PhoneInputField value={phone} onChange={setPhone} compact />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <PasswordInput
                placeholder={t("mentorSignup.form.password")}
                className="pr-10 h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <PasswordInput
                placeholder={t("mentorSignup.form.confirmPassword")}
                className="pr-10 h-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="text-destructive text-xs font-medium text-end">{t("mentorSignup.form.passwordMismatch")}</p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full gradient-primary text-primary-foreground border-0 h-10 text-base"
        >
          {submitting ? t("mentorSignup.form.processing") : t("mentorSignup.form.next")}
          {!submitting && <ArrowLeft className="w-4 h-4 mr-2" />}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("mentorSignup.form.haveAccount")}{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
            {t("mentorSignup.form.signIn")}
          </button>
        </p>
      </form>
    </div>
  );
}
