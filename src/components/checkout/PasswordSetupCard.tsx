import { useState } from "react";
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import StudentForgotPasswordDialog from "@/components/auth/StudentForgotPasswordDialog";

interface Props {
  email: string;
  submitting: boolean;
  serverError?: string | null;
  needsExistingPassword?: boolean;
  onEmailChange?: (email: string) => void;
  onResetPassword?: () => Promise<void> | void;
  onSubmit: (password: string) => Promise<void> | void;
}


const PasswordSetupCard = ({ email, submitting, serverError, needsExistingPassword, onEmailChange, onResetPassword, onSubmit }: Props) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Floating-label focus state for each field.
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // When the checkout email is unknown (new device, cleared storage) the student
  // must be able to type it — otherwise the request goes out without an email.
  // Once the student starts typing, the field must stay editable.
  const [typedEmail, setTypedEmail] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const emailEditable = !!onEmailChange && (!email || typedEmail || editingEmail);
  const existingMode = !!needsExistingPassword;
  const mismatch = !existingMode && confirm.length > 0 && confirm !== password;
  const canSubmit =
    password.length > 0 &&
    (existingMode || password === confirm) &&
    (!emailEditable || /\S+@\S+\.\S+/.test(email)) &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(password);
  };

  const fieldInput =
    "w-full px-4 py-3.5 h-auto bg-card border border-border rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-transparent";

  const labelBase = "absolute z-10 transition-all duration-200 pointer-events-none origin-left rtl:origin-right";
  // Logical start/end so labels sit on the right in RTL and the left in LTR.
  const labelInside = "start-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground text-start";
  const labelFloating = "start-3 top-0 -translate-y-1/2 scale-[0.85] px-1.5 bg-card text-[10px] font-bold text-muted-foreground text-start";

  const emailFloating = emailFocused || email.length > 0;
  const passwordFloating = pwFocused || password.length > 0;
  const confirmFloating = confirmFocused || confirm.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5 mt-2"
    >
      {/* Email — editable via the pencil icon */}
      <div className="relative">
        <label className={`${labelBase} ${emailFloating ? labelFloating : labelInside}`}>
          {t("coursePage.checkout.password.email")}
        </label>
        <div className="relative">
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setTypedEmail(true);
              onEmailChange?.(e.target.value);
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            readOnly={!emailEditable}
            disabled={!emailEditable}
            dir="ltr"
            autoComplete="email"
            placeholder=" "
            className={`${fieldInput} ${onEmailChange ? "pe-11" : ""} ${emailEditable ? "" : "bg-muted/40 text-muted-foreground cursor-not-allowed"}`}
          />
          {onEmailChange && !emailEditable && (
            <button
              type="button"
              onClick={() => setEditingEmail(true)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("coursePage.checkout.password.editEmail")}
              title={t("coursePage.checkout.password.editEmail")}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="relative">
        <label className={`${labelBase} ${passwordFloating ? labelFloating : labelInside}`}>
          {existingMode
            ? t("coursePage.checkout.password.existingPassword")
            : t("coursePage.checkout.password.password")}
        </label>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            dir={isRtl ? "rtl" : "ltr"}
            autoComplete={existingMode ? "current-password" : "new-password"}
            className={`${fieldInput} pe-11 password-input`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={t("coursePage.checkout.password.toggle")}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm */}
      {!existingMode && (
      <div className="relative">
        <label className={`${labelBase} ${confirmFloating ? labelFloating : labelInside}`}>
          {t("coursePage.checkout.password.confirm")}
        </label>
        <Input
          type={showPw ? "text" : "password"}
          placeholder=" "
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onFocus={() => setConfirmFocused(true)}
          onBlur={() => setConfirmFocused(false)}
          dir={isRtl ? "rtl" : "ltr"}
          autoComplete="new-password"
          className={`${fieldInput} password-input`}
        />
        {mismatch && (
          <p className="mt-1.5 ms-1 text-[11px] text-destructive">
            {t("coursePage.checkout.password.mismatch")}
          </p>
        )}
      </div>
      )}

      {!existingMode && serverError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive text-start">
          <p>{serverError}</p>
        </div>
      )}


      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm shadow-xl shadow-foreground/10 active:scale-[0.98] transition-all gap-2"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span>
              {existingMode
                ? t("coursePage.checkout.password.signInSubmit")
                : t("coursePage.checkout.password.submit")}
            </span>
            <Arrow className="w-4 h-4" strokeWidth={2.5} />
          </>
        )}
      </Button>

      {existingMode && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-primary text-[13px] font-semibold hover:underline"
          >
            {t("auth.forgot.title")}
          </button>
        </div>
      )}

      <StudentForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultIdentifier={email}
      />
    </form>
  );
};

export default PasswordSetupCard;
