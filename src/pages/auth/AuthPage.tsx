import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MailCheck, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, ArrowLeft, Link2, Sparkles } from "lucide-react";
import { PhoneInputField } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import { lovable } from "@/integrations/lovable/index";
import authLogo from "@/assets/logo-auth-black.png.asset.json";
import authLogoEnglish from "@/assets/logo-ebdaey-english-black.png.asset.json";
import { SeoHead } from "@/components/common/SeoHead";
import MentorSignupFlow from "@/components/auth/MentorSignupFlow";
import {
  ADMIN_MFA_ENABLED,
  isDeviceVerified,
  lockoutMessage,
  precheckAdminLogin,
  recordAdminLoginFailure,
  sendAdminLoginCode,
  storeDeviceToken,
  verifyAdminLoginCode,
} from "@/lib/adminMfa";

interface AuthPageProps {
  mode: "mentor" | "student" | "admin";
}

const modeConfig = {
  mentor: { title: "دخول المدربين", subtitle: "سجّل دخولك أو أنشئ حسابك كمدرب", showRegister: true, showSlug: true },
  student: { title: "تسجيل الدخول", subtitle: "سجّل دخولك للوصول لحسابك\u00a0", showRegister: true, showSlug: false },
  admin: { title: "لوحة الإدارة", subtitle: "دخول المسؤولين فقط", showRegister: false, showSlug: false },
};

const AuthPage = ({ mode }: AuthPageProps) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const logoSrc = isEn ? authLogoEnglish.url : authLogo.url;
  const [searchParams] = useSearchParams();
  const resumeMode = mode === "mentor" && searchParams.get("resume") === "1";
  const signupMode = searchParams.get("signup") === "1";
  const [isLogin, setIsLogin] = useState(!resumeMode && !signupMode);
  const [showVerification, setShowVerification] = useState(false);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugLangWarning, setSlugLangWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminCodeStep, setAdminCodeStep] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const config = modeConfig[mode];
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const { emailError, handleEmailChange } = useEmailTypoCheck();

  // Helper: check if a mentor's tenant onboarding is complete
  const isTenantIncomplete = (t: { phone?: string | null; specialty?: string | null; name?: string | null } | null) => {
    if (!t) return true;
    return !t.phone?.trim() || !t.specialty?.trim() || !t.name?.trim();
  };

  const goTo = (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      window.location.href = url;
    } else {
      navigate(url);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast({ title: "خطأ", description: "فشل تسجيل الدخول بـ Google", variant: "destructive" });
        setGoogleLoading(false);
        return;
      }

      if (result.redirected) {
        return; // Browser will redirect
      }

      // Session set successfully — navigate
      if (mode === "mentor") {
        // Check tenant completeness before dashboard
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        if (uid) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("phone, specialty, name")
            .eq("owner_id", uid)
            .maybeSingle();
          if (isTenantIncomplete(tenant as any)) {
            toast({ title: "أكمل بياناتك", description: "لديك حساب غير مكتمل، أكمل خطواتك للمتابعة" });
            navigate({ pathname: window.location.pathname, search: "?resume=1" }, { replace: true });
            return;
          }
        }
      }
      toast({ title: t("auth.toast.welcomeTitle"), description: t("auth.toast.signedInSuccess") });
      if (mode === "mentor") goTo(urls.mentorAppUrl("/"));
      else if (mode === "student") goTo(urls.studentDashboardUrl());
      else goTo(urls.adminUrl());
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "خطأ", description: "يرجى إدخال بريدك الإلكتروني أولاً", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({
        title: "خطأ",
        description: /invalid login credentials/i.test(error.message)
          ? "البريد الإلكتروني أو كلمة السر غير صحيحة"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "تم!", description: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: "خطأ في البريد الإلكتروني",
        description: `"${emailError.typo}" خطأ، يجب تصحيحها إلى "${emailError.correct}"`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        if (mode === "admin") {
          const lock = await precheckAdminLogin(email);
          if (lock?.locked) {
            toast({
              title: "الدخول موقوف مؤقتًا",
              description: lockoutMessage(lock.retry_after_seconds),
              variant: "destructive",
            });
            return;
          }
        }
        const { error } = await signIn(email, password);
        if (error) {
          if (mode === "admin") await recordAdminLoginFailure(email);
          if (mode === "mentor" && /email.*not.*confirmed|email_not_confirmed/i.test(error.message)) {
            supabase.auth.resend({ type: "signup", email }).catch(() => {});
            try {
              sessionStorage.setItem("mentor_resume_email", email);
            } catch {
              /* ignore */
            }
            toast({ title: "بريدك غير مؤكَّد", description: "أرسلنا لك رمز التحقق، أكمل التأكيد للمتابعة" });
            navigate({ pathname: window.location.pathname, search: "?resume=1" }, { replace: true });
            return;
          }
          toast({
            title: "خطأ في تسجيل الدخول",
            description: /invalid login credentials/i.test(error.message)
              ? "البريد الإلكتروني أو كلمة السر غير صحيحة"
              : error.message,
            variant: "destructive",
          });
        } else {
          // Enforce role isolation for the entry point being used
          const { data: authData } = await supabase.auth.getUser();
          const uid = authData.user?.id;
          if (!uid) {
            toast({ title: "خطأ", description: "تعذر التحقق من الحساب", variant: "destructive" });
            return;
          }
          const requiredRole = mode; // 'mentor' | 'student' | 'admin'
          const { data: roleRow } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid)
            .eq("role", requiredRole as any)
            .maybeSingle();

          if (!roleRow) {
            await supabase.auth.signOut();
            const notAllowed: Record<string, string> = {
              mentor: "هذا الحساب ليس لديه صلاحية دخول لوحة المدربين",
              student: "هذا الحساب ليس حساب طالب",
              admin: "هذا الحساب ليس لديه صلاحية إدارية",
            };
            toast({ title: "غير مسموح", description: notAllowed[mode], variant: "destructive" });
            return;
          }

          // Student login must be scoped to the current mentor tenant (subdomain)
          if (mode === "student" && mentorSlug) {
            const { data: tenant } = await supabase.from("public_tenants").select("id").eq("slug", mentorSlug).maybeSingle();
            if (tenant) {
              const { data: studentRow } = await supabase
                .from("students")
                .select("id")
                .eq("user_id", uid)
                .eq("tenant_id", tenant.id)
                .maybeSingle();
              if (!studentRow) {
                await supabase.auth.signOut();
                toast({
                  title: "غير مسموح",
                  description: "هذا الحساب غير مسجّل لدى هذا المدرب. سجّل دخولك من موقع المدرب الذي اشتريت منه.",
                  variant: "destructive",
                });
                return;
              }
            }
          }

          if (mode === "mentor") {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("phone, specialty, name")
              .eq("owner_id", uid)
              .maybeSingle();
            if (isTenantIncomplete(tenant as any)) {
              toast({ title: "أكمل بياناتك", description: "لديك حساب غير مكتمل، أكمل خطواتك للمتابعة" });
              navigate({ pathname: window.location.pathname, search: "?resume=1" }, { replace: true });
              return;
            }
          }

          // Admin accounts require a second step unless this device is trusted.
          if (mode === "admin" && ADMIN_MFA_ENABLED) {
            const alreadyVerified = await isDeviceVerified();
            if (!alreadyVerified) {
              const { error: codeErr } = await sendAdminLoginCode();
              if (codeErr) {
                toast({ title: "خطأ", description: "تعذر إرسال رمز التحقق، حاول مرة أخرى", variant: "destructive" });
                return;
              }
              setAdminCode("");
              setAdminCodeStep(true);
              toast({ title: "تحقق من بريدك", description: "أرسلنا رمزًا من ٦ أرقام لإكمال الدخول" });
              return;
            }
          }

          toast({ title: t("auth.toast.welcomeTitle"), description: t("auth.toast.signedInSuccess") });
          if (mode === "mentor") goTo(urls.mentorAppUrl("/"));
          else if (mode === "student") goTo(urls.studentDashboardUrl());
          else goTo(urls.adminUrl());
        }
      } else {
        if (!fullName) {
          toast({ title: "خطأ", description: "يرجى إدخال الاسم", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        const metadata: Record<string, string> = {
          full_name: fullName,
          role: mode === "student" ? "student" : "mentor",
          ...(phone && { phone }),
        };

        if (mode === "mentor") {
          if (!slug) {
            toast({ title: "خطأ", description: "يرجى إدخال اسم المستخدم", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          metadata.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        }

        if (mode === "student" && mentorSlug) {
          metadata.tenant_slug = mentorSlug;
        }

        const { error } = await signUp(email, password, metadata);
        if (error) {
          toast({
            title: "خطأ في إنشاء الحساب",
            description: /invalid login credentials/i.test(error.message)
              ? "البريد الإلكتروني أو كلمة السر غير صحيحة"
              : error.message,
            variant: "destructive",
          });
        } else {
          if (mode === "mentor") {
            setShowVerification(true);
            return;
          }
          toast({ title: "تم إنشاء الحساب!", description: "مرحباً بك!" });
          if (mode === "student" && mentorSlug) {
            goTo(urls.studentDashboardUrl());
          }
        }
      }
    } catch (err) {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendingVerification(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth?resume=1` },
    });
    setResendingVerification(false);
    if (error) {
      toast({ title: "خطأ", description: "تعذر إعادة إرسال رابط التأكيد", variant: "destructive" });
      return;
    }
    toast({ title: "تم الإرسال", description: "أرسلنا رابط تأكيد جديد إلى بريدك" });
  };

  const handleVerifyAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(adminCode.trim())) {
      toast({ title: "رمز غير صحيح", description: "أدخل الرمز المكوّن من ٦ أرقام", variant: "destructive" });
      return;
    }
    setCodeSubmitting(true);
    try {
      const { data, error } = await verifyAdminLoginCode(adminCode.trim(), trustDevice);
      const payload = data as { ok?: boolean; device_token?: string; error?: string; attempts_left?: number } | null;
      if (error || !payload?.ok || !payload.device_token) {
        const reason = payload?.error;
        const description =
          reason === "code_expired" ? "انتهت صلاحية الرمز، اطلب رمزًا جديدًا"
          : reason === "no_active_code" ? "لا يوجد رمز صالح، اطلب رمزًا جديدًا"
          : reason === "too_many_code_attempts" ? "تجاوزت عدد المحاولات، اطلب رمزًا جديدًا"
          : typeof payload?.attempts_left === "number" ? `الرمز غير صحيح، المحاولات المتبقية: ${payload.attempts_left}`
          : "تعذر التحقق من الرمز";
        toast({ title: "فشل التحقق", description, variant: "destructive" });
        return;
      }
      storeDeviceToken(payload.device_token, trustDevice);
      toast({ title: t("auth.toast.welcomeTitle"), description: t("auth.toast.signedInSuccess") });
      goTo(urls.adminUrl());
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleResendAdminCode = async () => {
    setResendingCode(true);
    const { error } = await sendAdminLoginCode();
    setResendingCode(false);
    toast(
      error
        ? { title: "خطأ", description: "تعذر إرسال رمز جديد", variant: "destructive" }
        : { title: "تم الإرسال", description: "أرسلنا رمزًا جديدًا إلى بريدك" },
    );
  };

  if (adminCodeStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <img src={logoSrc} alt="ebdaey" className="h-14 mx-auto mb-6 dark:invert" />
          <form onSubmit={handleVerifyAdminCode} className="bg-card rounded-xl p-8 shadow-card space-y-5">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">التحقق بخطوتين</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              أدخل الرمز المكوّن من ٦ أرقام الذي أرسلناه إلى بريدك الإلكتروني.
            </p>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-14 text-center text-2xl tracking-[0.5em]"
              dir="ltr"
              placeholder="000000"
            />
            <div className="flex items-center gap-2 justify-center">
              <Checkbox
                id="trustDevice"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(!!checked)}
              />
              <Label htmlFor="trustDevice" className="text-sm cursor-pointer">
                الوثوق بهذا الجهاز لمدة ٣٠ يومًا
              </Label>
            </div>
            <Button
              type="submit"
              disabled={codeSubmitting}
              className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg font-bold"
            >
              {codeSubmitting ? "جارٍ التحقق..." : "تأكيد الدخول"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={handleResendAdminCode} disabled={resendingCode}>
              {resendingCode ? "جارٍ الإرسال..." : "إرسال رمز جديد"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={async () => {
                setAdminCodeStep(false);
                await supabase.auth.signOut();
              }}
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showVerification) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center p-4"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          animation: "grid-move 20s linear infinite",
        }}
      >
        <div className="w-full max-w-md text-center">
          <a href={urls.mainUrl("/")} className="inline-block mb-6">
            <img src={logoSrc} alt="ebdaey" className="h-16 mx-auto dark:invert" />
          </a>
          <div className="bg-card rounded-xl p-8 shadow-card space-y-5">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{t("auth.verification.title")}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("auth.verification.descriptionPrefix")} <strong className="text-foreground">{email}</strong>{t("auth.verification.descriptionSuffix")}
            </p>
            <Button
              className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg font-bold"
              onClick={handleResendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification ? t("auth.verification.resending") : t("auth.verification.resend")}
            </Button>
            <p className="text-muted-foreground text-xs">
              {t("auth.verification.spamHint")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowVerification(false);
                setIsLogin(true);
              }}
            >
              {t("auth.verification.backToLogin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        animation: "grid-move 20s linear infinite",
      }}
    >
      <SeoHead
        title={
          mode === "mentor"
            ? "تسجيل الدخول للمنتور | إبداعي"
            : mode === "admin"
              ? "تسجيل دخول الأدمن | إبداعي"
              : "تسجيل الدخول | إبداعي"
        }
        description={
          mode === "mentor"
            ? "سجّل دخولك أو أنشئ حساب منتور جديد على منصة إبداعي وابدأ ببيع كورساتك ومنتجاتك الرقمية."
            : "الوصول إلى حسابك على منصة إبداعي."
        }
        path={mode === "mentor" ? "/login" : mode === "admin" ? "/admin-login" : "/account"}
        noindex={mode !== "mentor"}
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <a href={urls.mainUrl("/")} className="inline-block mb-2">
            <img src={logoSrc} alt="ebdaey" className="h-10 mx-auto dark:invert" />
          </a>
          <h1 className="text-lg mb-0">{t("auth.welcomeBack")}</h1>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-card">
          {config.showRegister && (
            <div className="flex rounded-lg bg-muted p-1 mb-4">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("auth.tabs.login")}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${!isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("auth.tabs.signup")}
              </button>
            </div>
          )}

          {mode === "mentor" && !isLogin ? (
            <MentorSignupFlow onSwitchToLogin={() => setIsLogin(true)} resume={resumeMode} />
          ) : (
            <>
              {/* Google Sign-In for mentor mode (login) */}
              {mode === "mentor" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base font-medium mb-4 gap-3"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      t("auth.google.loading")
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                        {t("auth.google.signIn")}
                      </>
                    )}
                  </Button>

                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
                    </div>
                  </div>
                </>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("auth.fields.fullName")}</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="name"
                        placeholder={t("auth.fields.fullNamePlaceholder")}
                        className="pr-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!isLogin && mode === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("auth.fields.phone")}</Label>
                    <PhoneInputField value={phone} onChange={setPhone} placeholder="01xxxxxxxxx" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.fields.email")}
                      className={`pr-10 ${emailError.hasError ? "border-destructive focus:border-destructive" : ""}`}
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value, setEmail)}
                    />
                  </div>
                  {emailError.hasError && (
                    <p className="text-destructive text-xs font-medium text-end">
                      "{emailError.typo}" خطأ، يجب تصحيحها إلى "{emailError.correct}"
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <PasswordInput
                      id="password"
                      placeholder={t("auth.fields.password")}
                      className="pl-3 pr-10 text-start placeholder:text-start"
                      toggleClassName="left-auto right-3"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(!!checked)}
                      />
                      <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
                        {t("auth.fields.rememberMe")}
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-primary hover:underline"
                    >
                      {t("auth.fields.forgotPassword")}
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg"
                >
                  {isSubmitting ? t("auth.actions.processing") : isLogin ? t("auth.actions.login") : t("auth.actions.signup")}
                  {!isSubmitting && <ArrowLeft className="w-5 h-5 mr-2" />}
                </Button>
              </form>

              {isLogin && config.showRegister && (
                <div className="mt-5 pt-4 border-t border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("auth.noAccountPrompt")}{" "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="text-primary hover:underline"
                    >
                      {t("auth.noAccountCta")}
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>


        <div className="text-center mt-6">
          <a href={urls.mainUrl("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("auth.actions.backHome")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
