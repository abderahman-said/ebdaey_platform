import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import { supabase } from "@/integrations/supabase/client";
import StudentForgotPasswordDialog from "@/components/auth/StudentForgotPasswordDialog";
import poweredByArabic from "@/assets/powered-by-arabic.png.asset.json";
import poweredByEnglish from "@/assets/powered-by-english.png.asset.json";

interface SessionExpiredGateProps {
  /** Academy / mentor display name */
  mentorName?: string | null;
  /** Mentor logo or avatar url */
  mentorImage?: string | null;
  /** Mentor slug for tenant-scoped student validation */
  mentorSlug?: string;
  onBackHome?: () => void;
}

/**
 * Mentor-branded screen shown to students whose session ended or was lost.
 * Accent colors come from the tenant's injected `--primary` token.
 */
const SessionExpiredGate = ({
  mentorName,
  mentorImage,
  mentorSlug,
  onBackHome,
}: SessionExpiredGateProps) => {
  const { t } = useTranslation();
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const { emailError, handleEmailChange } = useEmailTypoCheck();
  const initial = (mentorName || "").trim().charAt(0);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t("auth.toast.errorTitle"),
        description: t("auth.toast.fillAllFields"),
        variant: "destructive",
      });
      return;
    }
    if (emailError.hasError) {
      toast({
        title: t("auth.toast.emailTypoTitle"),
        description: t("auth.toast.emailTypoDescription", {
          typo: emailError.typo,
          correct: emailError.correct,
        }),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: t("auth.toast.loginErrorTitle"),
          description: /invalid login credentials/i.test(error.message)
            ? t("auth.toast.invalidCredentials")
            : error.message,
          variant: "destructive",
        });
      } else {
        if (mentorSlug) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();
          const authenticatedUser = userData?.user;
          if (userError || !authenticatedUser) {
            await signOut();
            toast({
              title: t("auth.toast.loginErrorTitle"),
              description: t("auth.toast.unexpectedError"),
              variant: "destructive",
            });
            return;
          }

          const { data: tenant } = await supabase
            .from("public_tenants")
            .select("id")
            .eq("slug", mentorSlug)
            .maybeSingle();

          const { data: student } = tenant
            ? await supabase
                .from("students")
                .select("id")
                .eq("tenant_id", tenant.id)
                .eq("user_id", authenticatedUser.id)
                .maybeSingle()
            : { data: null };

          if (!student) {
            await signOut();
            toast({
              title: t("miscPublic.studentDashboard.accessDeniedTitle"),
              description: t("miscPublic.studentDashboard.accessDeniedDesc"),
              variant: "destructive",
            });
            return;
          }
        }

        toast({
          title: t("auth.toast.welcomeTitle"),
          description: t("auth.toast.signedInSuccess"),
        });
        window.location.reload();
      }
    } catch {
      toast({
        title: t("auth.toast.errorTitle"),
        description: t("auth.toast.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center flex-grow justify-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-card shadow-sm mb-6 flex items-center justify-center border border-border/60">
          {mentorImage ? (
            <img
              src={mentorImage}
              alt={mentorName || ""}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-black text-primary">{initial}</span>
          )}
        </div>

        {mentorName && (
          <span className="text-primary font-bold text-sm mb-2 rtl:tracking-normal tracking-wide">
            {mentorName}
          </span>
        )}

        <p className="text-muted-foreground mb-8 leading-relaxed max-w-[320px]">
          {t("miscPublic.sessionGate.subtitle")}
        </p>

        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full max-w-[280px] h-12 rounded-lg text-base font-semibold active:scale-[0.98] transition-colors"
          >
            {t("miscPublic.sessionGate.signIn")}
          </Button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[320px] text-start space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="session-gate-email">
                {t("auth.fields.email")}
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="session-gate-email"
                  type="email"
                  placeholder="example@email.com"
                  dir="ltr"
                  className={`pr-10 ${
                    emailError.hasError
                      ? "border-destructive focus:border-destructive"
                      : ""
                  }`}
                  value={email}
                  onChange={(e) =>
                    handleEmailChange(e.target.value, setEmail)
                  }
                  disabled={isSubmitting}
                />
              </div>
              {emailError.hasError && (
                <p className="text-destructive text-xs font-medium text-end">
                  {t("auth.dialog.emailTypo", {
                    typo: emailError.typo,
                    correct: emailError.correct,
                  })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-gate-password">
                {t("auth.fields.password")}
              </Label>
              <div className="relative">
                <PasswordInput
                  id="session-gate-password"
                  placeholder={t("auth.fields.passwordPlaceholder")}
                  className="pl-3 pr-10"
                  toggleClassName="left-auto right-3"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline font-medium"
              >
                {t("auth.fields.forgotPassword")}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-lg text-base font-semibold active:scale-[0.98] transition-colors"
            >
              {isSubmitting
                ? t("auth.actions.processing")
                : t("auth.actions.login")}
            </Button>
          </form>
        )}

        {onBackHome && (
          <button
            type="button"
            onClick={onBackHome}
            className="mt-8 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            {t("miscPublic.sessionGate.backHome")}
          </button>
        )}
      </div>

      <div className="mt-auto pt-8 pb-4">
        <PoweredByFooter />
      </div>

      <StudentForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultIdentifier={email}
        mentorSlug={mentorSlug}
      />
    </div>
  );
};

const PoweredByFooter = () => {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState(false);
  const isEn = i18n.language?.startsWith("en");
  const badge = isEn ? poweredByEnglish.url : poweredByArabic.url;

  if (error) {
    return (
      <p className="text-muted-foreground/50 text-sm tracking-wider">
        {t("miscPublic.sessionGate.poweredBy")}{" "}
        <span className="font-semibold text-muted-foreground/70">ebdaey</span>
      </p>
    );
  }

  return (
    <div className="flex items-center justify-center h-8">
      <img
        src={badge}
        alt={t("miscPublic.sessionGate.poweredBy")}
        className="h-8 w-auto max-w-[200px] opacity-70"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default SessionExpiredGate;
