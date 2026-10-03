import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Facebook, Send } from "lucide-react";
import { toast } from "sonner";
import { openExternal } from "@/lib/openExternal";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.692 5.55l-.999 3.648 3.796-.897zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const ShareProductDialog = ({ open, onOpenChange, url }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const shareUrl = url || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("shareDialog.copied"));
    } catch {
      toast.error(t("shareDialog.copyError"));
    }
  };

  const handlePreview = () => openExternal(url);

  const encoded = encodeURIComponent(shareUrl);
  const socials = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encoded}`, Icon: WhatsAppIcon, color: "bg-[#25D366] hover:bg-[#1ebe5d]" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`, Icon: Facebook, color: "bg-[#1877F2] hover:bg-[#1466d3]" },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encoded}`, Icon: XIcon, color: "bg-foreground hover:bg-foreground/90 text-background" },
    { label: "Telegram", href: `https://t.me/share/url?url=${encoded}`, Icon: Send, color: "bg-[#229ED9] hover:bg-[#1d8bbf]" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-end">{t("shareDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <Input value={shareUrl} readOnly dir="ltr" className="text-start font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" /> {t("shareDialog.copy")}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview} className="gap-2">
              <ExternalLink className="h-4 w-4" /> {t("shareDialog.preview")}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/40">
            {socials.map(({ label, href, Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${label}`}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 ${color}`}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProductDialog;
