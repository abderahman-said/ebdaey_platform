import React from "react";
import { useTranslation } from "react-i18next";
import { Link2, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { openExternal } from "@/lib/openExternal";
import { mentorCanonical } from "@/lib/seo";

interface MentorSitePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug?: string;
}

export const MentorSitePreviewDialog: React.FC<MentorSitePreviewDialogProps> = ({
  open,
  onOpenChange,
  tenantSlug,
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const mentorSiteUrl = mentorCanonical(tenantSlug || undefined);

  const copyMentorSiteUrl = async () => {
    try {
      await navigator.clipboard.writeText(mentorSiteUrl);
      toast({ title: t("shareDialog.copied") });
    } catch {
      toast({ title: t("shareDialog.copyError"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={i18n.dir()} className="w-[calc(100%-2rem)] max-w-md gap-4 overflow-hidden rounded-xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-start text-xl font-bold">
            {t("mentorSidebar.shareLink")}
          </DialogTitle>
        </DialogHeader>
        <div className="relative min-w-0">
          <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={mentorSiteUrl}
            readOnly
            dir="ltr"
            className="h-11 min-w-0 rounded-lg bg-background pe-3 ps-10 text-start text-sm"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={copyMentorSiteUrl} className="gap-2">
            <Copy className="h-4 w-4" />
            {t("shareDialog.copy")}
          </Button>
          <Button variant="secondary" onClick={() => openExternal(mentorSiteUrl)} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {t("shareDialog.preview")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
