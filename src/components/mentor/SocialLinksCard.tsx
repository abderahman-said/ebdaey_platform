import { useState, useEffect } from "react";
import { Check, Pencil, Globe, Facebook, Linkedin, Youtube, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tenantId: string;
}

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4 text-muted-foreground"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4 text-muted-foreground"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.79a4.83 4.83 0 01-1-.1z"/>
  </svg>
);

const SocialLinksCard = ({ tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [x, setX] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("social_facebook, social_instagram, social_youtube, social_x, social_tiktok, social_linkedin")
        .eq("id", tenantId)
        .single();
      if (data) {
        const d: any = data;
        setFacebook(d.social_facebook || "");
        setInstagram(d.social_instagram || "");
        setYoutube(d.social_youtube || "");
        setX(d.social_x || "");
        setTiktok(d.social_tiktok || "");
        setLinkedin(d.social_linkedin || "");
      }
      setLoading(false);
    })();
  }, [tenantId]);

  const openEdit = () => {
    setDraft({ facebook, instagram, youtube, x, tiktok, linkedin });
    setOpen(true);
  };

  const update = (k: string, v: string) => setDraft((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        social_facebook: draft.facebook || null,
        social_instagram: draft.instagram || null,
        social_youtube: draft.youtube || null,
        social_x: draft.x || null,
        social_tiktok: draft.tiktok || null,
        social_linkedin: draft.linkedin || null,
      } as any)
      .eq("id", tenantId);

    if (error) {
      toast({ title: t("socialLinks.saveError"), variant: "destructive" });
    } else {
      toast({ title: t("socialLinks.saved") });
      setFacebook(draft.facebook);
      setInstagram(draft.instagram);
      setYoutube(draft.youtube);
      setX(draft.x);
      setTiktok(draft.tiktok);
      setLinkedin(draft.linkedin);
      setOpen(false);
    }
    setSaving(false);
  };

  const items = [
    { label: t("socialLinks.labels.facebook"), value: facebook, Icon: Facebook, key: "facebook" },
    { label: t("socialLinks.labels.instagram"), value: instagram, Icon: Instagram, key: "instagram" },
    { label: t("socialLinks.labels.youtube"), value: youtube, Icon: Youtube, key: "youtube" },
    { label: t("socialLinks.labels.x"), value: x, Icon: XIcon, key: "x" },
    { label: t("socialLinks.labels.tiktok"), value: tiktok, Icon: TiktokIcon, key: "tiktok" },
    { label: t("socialLinks.labels.linkedin"), value: linkedin, Icon: Linkedin, key: "linkedin" },
  ];

  if (loading) {
    return <div className="glass-card rounded-xl p-6 animate-pulse text-muted-foreground text-sm">{t("socialLinks.loading")}</div>;
  }

  const mx = isRtl ? "ml-1" : "mr-1";
  const mx2 = isRtl ? "ml-2" : "mr-2";

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {t("socialLinks.title")}
        </h3>
        <Button size="sm" variant="outline" onClick={openEdit}>
          <Pencil className={`w-4 h-4 ${mx}`} />
          {t("socialLinks.edit")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map(({ label, value, Icon, key }) => (
          <div key={key} className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="w-4 h-4" />
              {label}
            </Label>
            {value
              ? <p className="text-sm font-medium break-all" dir="ltr">{value}</p>
              : <p className="text-sm text-muted-foreground/60 italic">{t("socialLinks.notAdded")}</p>}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("socialLinks.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-2">
              {items.map(({ label, Icon, key }) => (
                <div key={key}>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {label}
                  </Label>
                  <Input
                    value={draft[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={`https://${key === "x" ? "x" : key}.com/...`}
                    dir="ltr"
                    className="bg-background dark:bg-input"
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t("socialLinks.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground border-0 hover:bg-primary/90">
              <Check className={`w-4 h-4 ${mx2}`} />
              {saving ? t("socialLinks.saving") : t("socialLinks.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialLinksCard;
