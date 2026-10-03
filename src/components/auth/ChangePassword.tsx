import { useState } from "react";
import { Lock, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ChangePassword = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const errTitle = t("changePassword.errors.genericTitle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: errTitle, description: t("changePassword.errors.fillAll"), variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: errTitle, description: t("changePassword.errors.mismatch"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInErr) {
        toast({ title: errTitle, description: t("changePassword.errors.wrongCurrent"), variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({ title: errTitle, description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("changePassword.success.title"), description: t("changePassword.success.description") });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast({ title: errTitle, description: t("changePassword.errors.unexpected"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sidePosClass = isRtl ? "right-3" : "left-3";
  const labelPosClass = isRtl ? "right-10" : "left-10";
  const inputPadClass = isRtl ? "pr-10" : "pl-10";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" />{t("changePassword.title")}</h1>
      <p className="text-muted-foreground text-sm  mb-6">{t("changePassword.subtitle")}</p>

      <div className="bg-card rounded-xl p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input value={user?.email || ""} disabled dir="ltr" className="bg-muted h-14 pt-5" id="email-display" />
            <Label htmlFor="email-display" className={`absolute ${isRtl ? "right-3" : "left-3"} top-2 text-xs text-muted-foreground pointer-events-none`}>
              {t("changePassword.email")}
            </Label>
          </div>

          <div className="relative">
            <PasswordInput
              id="current-pw"
              placeholder={t("changePassword.currentPlaceholder")}
              className={`${inputPadClass} h-14 pt-5`}
              dir="ltr"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Label htmlFor="current-pw" className={`absolute ${labelPosClass} top-2 text-xs text-muted-foreground pointer-events-none`}>
              {t("changePassword.current")} <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="relative">
            <PasswordInput
              id="new-pw"
              placeholder={t("changePassword.newPlaceholder")}
              className={`${inputPadClass} h-14 pt-5`}
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Label htmlFor="new-pw" className={`absolute ${labelPosClass} top-2 text-xs text-muted-foreground pointer-events-none`}>
              {t("changePassword.new")} <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="relative">
            <PasswordInput
              id="confirm-pw"
              placeholder={t("changePassword.confirmPlaceholder")}
              className={`${inputPadClass} h-14 pt-5`}
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Label htmlFor="confirm-pw" className={`absolute ${labelPosClass} top-2 text-xs text-muted-foreground pointer-events-none`}>
              {t("changePassword.confirm")} <span className="text-destructive">*</span>
            </Label>
          </div>


          <Button
            type="submit"
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground dark:text-black dark:bg-white border-0"
          >
            {loading ? t("changePassword.submitting") : t("changePassword.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
