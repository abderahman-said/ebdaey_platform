import { useState, useEffect, useRef } from "react";
import { Check, Pencil, User, Mail, Phone, MapPin, Globe, Facebook, Linkedin, Youtube, Instagram, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

interface Props {
  tenantId: string;
  onBack?: () => void;
  onPersonalNameChange?: (name: string) => void;
}

const EditMyDataTab = ({ tenantId, onBack, onPersonalNameChange }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dir: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const [draft, setDraft] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const dataLoaded = useRef(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("first_name, last_name, email, phone, country, city")
        .eq("id", tenantId)
        .single();

      if (data) {
        const d: any = data;
        setFirstName(d.first_name || "");
        setLastName(d.last_name || "");
        setEmail(d.email || "");
        setPhone(d.phone || "");
        setCountry(d.country || "");
        setCity(d.city || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => { dataLoaded.current = true; }, 100);
    }
  };

  const openEdit = () => {
    setDraft({ firstName, lastName, email, phone, country, city });
    setIsDirty(false);
    setEditOpen(true);
  };

  const updateDraft = (key: string, value: string) => {
    setDraft((prev: any) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        first_name: draft.firstName || null,
        last_name: draft.lastName || null,
        email: draft.email || null,
        phone: draft.phone || null,
        country: draft.country || null,
        city: draft.city || null,
      } as any)
      .eq("id", tenantId);

    if (error) {
      toast({ title: t("editMyData.toast.saveError"), variant: "destructive" });
    } else {
      toast({ title: t("editMyData.toast.saved") });
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setEmail(draft.email);
      setPhone(draft.phone);
      setCountry(draft.country);
      setCity(draft.city);
      setIsDirty(false);
      setEditOpen(false);
      const newPersonalName = [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim();
      onPersonalNameChange?.(newPersonalName);
      // Keep the certificate preview (mentor signature name) in sync instantly.
      queryClient.setQueryData(["cert-tenant-settings", tenantId], (prev: any) =>
        prev
          ? {
              ...prev,
              personalName: newPersonalName || null,
            }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ["cert-tenant-settings", tenantId] });
    }
    setSaving(false);
  };

  const requestClose = () => {
    if (isDirty) setShowUnsavedDialog(true);
    else setEditOpen(false);
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground p-8">{t("editMyData.loading")}</div>;
  }

  const displayFields: { label: string; value: string; Icon: any; dir?: "ltr" }[] = [
    { label: t("editMyData.fields.firstName"), value: firstName, Icon: User },
    { label: t("editMyData.fields.lastName"), value: lastName, Icon: User },
    { label: t("editMyData.fields.email"), value: email, Icon: Mail, dir: "ltr" },
    { label: t("editMyData.fields.phone"), value: phone, Icon: Phone, dir: "ltr" },
    { label: t("editMyData.fields.country"), value: country, Icon: Globe },
    { label: t("editMyData.fields.city"), value: city, Icon: MapPin },
  ];

  const alignClass = isRtl ? "text-right" : "text-left";

  const renderValue = (val: string, valDir?: "ltr") => (
    val
      ? <p className={`text-sm font-medium break-words ${alignClass}`} dir={valDir} style={valDir === "ltr" ? { unicodeBidi: "plaintext" } : undefined}>{val}</p>
      : <p className={`text-sm text-muted-foreground/60 italic ${alignClass}`}>{t("editMyData.notAdded")}</p>
  );


  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 max-w-2xl mx-auto">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-lg font-bold truncate">{t("editMyData.title")}</h1>
        </div>
        <Button onClick={openEdit} variant="outline" size="sm" className="rounded-lg shrink-0">
          <Pencil className={`w-3.5 h-3.5 ${isRtl ? "ml-1.5" : "mr-1.5"}`} />
          {t("editMyData.editButton")}
        </Button>
      </div>

      <div dir={dir} className="bg-card rounded-xl shadow-card p-6 max-w-2xl space-y-6 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {displayFields.map(({ label, value, Icon, dir: valDir }) => (
            <div key={label} className={`space-y-1.5 ${alignClass}`}>
              <Label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isRtl ? "flex-row" : "flex-row"} ${alignClass}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Label>

              {renderValue(value, valDir)}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) requestClose(); else setEditOpen(true); }}>
        <DialogContent dir={dir} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editMyData.dialog.title")}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><User className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.firstName")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground" value={draft.firstName} onChange={e => updateDraft("firstName", e.target.value)} placeholder={t("editMyData.dialog.firstNamePlaceholder")} />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><User className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.lastName")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground" value={draft.lastName} onChange={e => updateDraft("lastName", e.target.value)} placeholder={t("editMyData.dialog.lastNamePlaceholder")} />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.email")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground cursor-not-allowed opacity-70" value={draft.email} readOnly disabled placeholder="example@email.com" dir="ltr" />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.phone")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground" value={draft.phone} onChange={e => updateDraft("phone", e.target.value)} placeholder={t("editMyData.dialog.phonePlaceholder")} dir="ltr" />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><Globe className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.country")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground" value={draft.country} onChange={e => updateDraft("country", e.target.value)} placeholder={t("editMyData.dialog.countryPlaceholder")} />
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{t("editMyData.fields.city")}</Label>
                  <Input className="bg-background dark:bg-input text-foreground" value={draft.city} onChange={e => updateDraft("city", e.target.value)} placeholder={t("editMyData.dialog.cityPlaceholder")} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={requestClose} disabled={saving}>{t("editMyData.dialog.cancel")}</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 border-0"
            >
              <Check className={`w-4 h-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {saving ? t("editMyData.dialog.saving") : t("editMyData.dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSave={async () => {
          await handleSave();
          setShowUnsavedDialog(false);
        }}
        onDiscard={() => {
          setShowUnsavedDialog(false);
          setIsDirty(false);
          setEditOpen(false);
        }}
        onCancel={() => setShowUnsavedDialog(false)}
        saving={saving}
      />
    </div>
  );
};

export default EditMyDataTab;
