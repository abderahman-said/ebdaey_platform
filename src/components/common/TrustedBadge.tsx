import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import trustedBadgeAsset from "@/assets/trusted-badge-new.png.asset.json";
import trustedBadgeEnAsset from "@/assets/trusted-badge-english.png.asset.json";

const TrustedBadge = () => {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const trustedBadge = i18n.language?.startsWith("en") ? trustedBadgeEnAsset.url : trustedBadgeAsset.url;

  return (
    <>
      <div className="w-full py-6 flex items-center justify-center gap-3">
        <a href="https://ebdaey.com" target="_blank" rel="noopener noreferrer" aria-label={t("miscPublic.trustedBadge.visit")}>
          <img
            src={trustedBadge}
            alt={t("miscPublic.trustedBadge.alt")}
            className="h-6 sm:h-7 object-contain hover:opacity-80 transition-opacity"
          />
        </a>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-[length:40px_40px] bg-[image:linear-gradient(to_right,hsl(var(--border)/0.6)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.6)_1px,transparent_1px)]">
          <DialogHeader className="text-center sm:text-center">
            <div className="flex justify-center mb-3">
              <img
                src={trustedBadge}
                alt={t("miscPublic.trustedBadge.alt")}
                className="h-10 object-contain"
              />
            </div>
            <DialogTitle className="sr-only">{t("miscPublic.trustedBadge.dialogTitle")}</DialogTitle>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm text-primary">{t("miscPublic.trustedBadge.startNow")}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/70">
              {t("miscPublic.trustedBadge.startNowDesc")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrustedBadge;
