import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIdentifier?: string;
  mentorSlug?: string;
  onBackToLogin?: () => void;
}

const StudentForgotPasswordDialog = ({
  open,
  onOpenChange,
  defaultIdentifier,
  mentorSlug,
  onBackToLogin,
}: Props) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState(defaultIdentifier || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setIdentifier(defaultIdentifier || "");
  }, [open, defaultIdentifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-student-new-password", {
        body: { identifier: identifier.trim(), tenant_slug: mentorSlug },
      });
      if (error) throw error;
      toast({ title: t("auth.forgot.sentTitle"), description: t("auth.forgot.sentDesc") });
      onOpenChange(false);
    } catch {
      toast({ title: t("auth.forgot.errorTitle"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5 text-center">
          <h2 className="text-2xl font-extrabold">{t("auth.forgot.title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("auth.forgot.subtitle")}
          </p>

          <div className="relative text-start">
            <label className="absolute -top-2 start-3 px-1.5 bg-background text-[11px] font-medium text-muted-foreground z-10">
              {t("auth.forgot.fieldLabel")}
            </label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              dir="ltr"
              className="w-full px-4 py-6 h-auto rounded-2xl border-border focus:ring-4 focus:ring-primary/10 focus:border-primary"
            />
          </div>

          <p className="text-xs text-muted-foreground">{t("auth.forgot.hint")}</p>

          <Button
            type="submit"
            disabled={!identifier.trim() || submitting}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("auth.forgot.submit")}
          </Button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onBackToLogin?.();
            }}
            className="text-primary font-semibold text-sm hover:underline"
          >
            {t("auth.forgot.backToLogin")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentForgotPasswordDialog;
