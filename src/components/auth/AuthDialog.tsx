import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PhoneInputField } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmailTypoCheck } from "@/hooks/useEmailTypoCheck";
import StudentForgotPasswordDialog from "@/components/auth/StudentForgotPasswordDialog";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mentorSlug?: string;
  mode?: "mentor" | "student" | "admin";
}

const modeConfig = {
  mentor: { showRegister: true, showSlug: true },
  student: { showRegister: false, showSlug: false },
  admin: { showRegister: false, showSlug: false },
} as const;


const AuthDialog = ({ open, onOpenChange, mentorSlug, mode = "student" }: AuthDialogProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const config = modeConfig[mode];
  const { signUp, signIn, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const urls = useMentorUrls(mentorSlug);
  const { emailError, handleEmailChange } = useEmailTypoCheck();

  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t("auth.toast.errorTitle"), description: t("auth.toast.fillAllFields"), variant: "destructive" });
      return;
    }
    if (emailError.hasError) {
      toast({ title: t("auth.toast.emailTypoTitle"), description: t("auth.toast.emailTypoDescription", { typo: emailError.typo, correct: emailError.correct }), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: t("auth.toast.loginErrorTitle"), description: /invalid login credentials/i.test(error.message) ? t("auth.toast.invalidCredentials") : error.message, variant: "destructive" });
        } else {
          if (mode === "student" && mentorSlug) {
            // Password authentication can succeed for a mentor/admin account or
            // for a student belonging to another academy. Verify the current
            // academy membership before announcing success or navigating.
            const { data: userData, error: userError } = await supabase.auth.getUser();
            const authenticatedUser = userData.user;
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

          toast({ title: t("auth.toast.welcomeTitle"), description: t("auth.toast.signedInSuccess") });
          onOpenChange(false);
          if (mode === "student" && mentorSlug) navigate(urls.studentDashboardUrl());
          else if (mode === "admin") navigate(urls.adminUrl());
        }
      } else {
        if (!fullName) {
          toast({ title: t("auth.toast.errorTitle"), description: t("auth.toast.enterName"), variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        const metadata: Record<string, string> = {
          full_name: fullName,
          role: "student",
          ...(phone && { phone }),
        };

        if (mentorSlug) {
          metadata.tenant_slug = mentorSlug;
        }

        const { error } = await signUp(email, password, metadata);
        if (error) {
          toast({ title: t("auth.toast.signupErrorTitle"), description: /invalid login credentials/i.test(error.message) ? t("auth.toast.invalidCredentials") : error.message, variant: "destructive" });
        } else {
          toast({ title: t("auth.toast.accountCreatedTitle"), description: t("auth.toast.accountCreatedDesc") });
          onOpenChange(false);
          if (mentorSlug) navigate(urls.studentDashboardUrl());
        }
      }
    } catch {
      toast({ title: t("auth.toast.errorTitle"), description: t("auth.toast.unexpectedError"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">{t(`auth.dialog.modes.${mode}.title`)}</h2>
            <p className="text-muted-foreground text-sm">{t(`auth.dialog.modes.${mode}.subtitle`)}</p>
          </div>

          {config.showRegister && (
            <div className="flex rounded-lg bg-muted p-1 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("auth.dialog.tabs.login")}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                {t("auth.dialog.tabs.signup")}
              </button>
            </div>
          )}


          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="dialog-name">{t("auth.dialog.fields.fullName")}</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dialog-name"
                    placeholder={t("auth.dialog.fields.fullNamePlaceholder")}
                    className="pr-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!isLogin && mode === "student" && (
              <div className="space-y-2">
                <Label htmlFor="dialog-phone">{t("auth.dialog.fields.phone")}</Label>
                <PhoneInputField
                  value={phone}
                  onChange={setPhone}
                  placeholder="01xxxxxxxxx"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dialog-email">{t("auth.dialog.fields.email")}</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="dialog-email"
                  type="email"
                  placeholder="example@email.com"
                  className={`pr-10 ${emailError.hasError ? "border-destructive focus:border-destructive" : ""}`}
                  dir="ltr"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value, setEmail)}
                />
              </div>
              {emailError.hasError && (
                <p className="text-destructive text-xs font-medium text-end">{t("auth.dialog.emailTypo", { typo: emailError.typo, correct: emailError.correct })}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-password">{t("auth.dialog.fields.password")}</Label>
              <div className="relative">
                <PasswordInput
                  id="dialog-password"
                  placeholder={t("auth.dialog.fields.passwordPlaceholder")}
                  className="pl-3 pr-10"
                  toggleClassName="left-auto right-3"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>


            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dialog-rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                  />
                  <Label htmlFor="dialog-rememberMe" className="text-sm cursor-pointer">{t("auth.dialog.fields.rememberMe")}</Label>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  {t("auth.dialog.fields.forgotPassword")}
                </button>

              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-primary text-primary-foreground border-0 h-12 text-lg font-bold"
            >
              {isSubmitting ? t("auth.dialog.actions.processing") : isLogin ? t("auth.dialog.actions.login") : t("auth.dialog.actions.signup")}
              {!isSubmitting && <ArrowLeft className="w-5 h-5 mr-2" />}
            </Button>
          </form>
        </div>
      </DialogContent>
      <StudentForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultIdentifier={email}
        mentorSlug={mentorSlug}
      />
    </Dialog>
  );
};

export default AuthDialog;
