import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe2,
  ExternalLink,
  Upload,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhoneInputField } from "@/components/ui/phone-input";
import SocialLinksCard from "@/components/mentor/SocialLinksCard";
import ThemeColorPicker from "@/components/mentor/ThemeColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { openExternal } from "@/lib/openExternal";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { setMentorPublicLanguage } from "@/i18n/mentorPublicLanguage";

interface ProfileTabProps {
  tenantId: string;
  tenantSlug: string;
  setTenantSlug: (slug: string) => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileBio: string;
  setProfileBio: (bio: string) => void;
  profileWhatsapp: string;
  setProfileWhatsapp: (wa: string) => void;
  profileSpecialty: string;
  setProfileSpecialty: (spec: string) => void;
  whatsappDefaultColor: boolean;
  profileImageUrl: string;
  coverImageUrl: string;
  primaryColor: string | null;
  setPrimaryColor: (color: string | null) => void;
  publicLanguage: "ar" | "en";
  setPublicLanguage: (lang: "ar" | "en") => void;
  uploadImage: (file: File, type: "profile" | "cover") => Promise<void>;
  uploadingProfile: boolean;
  uploadingCover: boolean;
}

export default function ProfileTab({
  tenantId,
  tenantSlug,
  setTenantSlug,
  profileName,
  setProfileName,
  profileBio,
  setProfileBio,
  profileWhatsapp,
  setProfileWhatsapp,
  profileSpecialty,
  setProfileSpecialty,
  whatsappDefaultColor,
  profileImageUrl,
  coverImageUrl,
  primaryColor,
  setPrimaryColor,
  publicLanguage,
  setPublicLanguage,
  uploadImage,
  uploadingProfile,
  uploadingCover,
}: ProfileTabProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [slugDialogOpen, setSlugDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editSlug, setEditSlug] = useState(tenantSlug);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPublicLanguage, setSavingPublicLanguage] = useState(false);

  const profileSnapshotRef = useRef<{ name: string; specialty: string; bio: string; whatsapp: string } | null>(null);
  const profileSavedRef = useRef(false);

  const closeProfileDialog = () => {
    if (!profileSavedRef.current && profileSnapshotRef.current) {
      const snap = profileSnapshotRef.current;
      setProfileName(snap.name);
      setProfileSpecialty(snap.specialty);
      setProfileBio(snap.bio);
      setProfileWhatsapp(snap.whatsapp);
      localStorage.removeItem("profile_name_temp");
      localStorage.removeItem("profile_specialty_temp");
      localStorage.removeItem("profile_bio_temp");
      localStorage.removeItem("profile_whatsapp_temp");
    }
    profileSnapshotRef.current = null;
    profileSavedRef.current = false;
    setProfileDialogOpen(false);
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setEditSlug(cleaned);
    setSlugAvailable(null);
  };

  const saveSlug = async () => {
    if (!tenantId || !editSlug || editSlug === tenantSlug) return;
    if (editSlug.length < 3) {
      toast({
        title: t("mentorDashboard.toast.slugMinLength"),
        variant: "destructive",
      });
      return;
    }
    if (/^-|-$/.test(editSlug)) {
      toast({
        title: t("mentorDashboard.toast.slugDash"),
        variant: "destructive",
      });
      return;
    }
    setSavingSlug(true);
    try {
      const { data: available } = await supabase.rpc("is_tenant_slug_available" as never, { _slug: editSlug } as never);
      if (available !== true) {
        setSlugAvailable(false);
        toast({
          title: t("mentorDashboard.toast.slugTaken"),
          variant: "destructive",
        });
        return;
      }
      setSlugAvailable(true);
      await supabase.from("tenants").update({ slug: editSlug }).eq("id", tenantId);
      setTenantSlug(editSlug);
      toast({ title: t("mentorDashboard.toast.slugUpdated") });
      setSlugAvailable(null);
    } catch {
      toast({ title: t("mentorDashboard.toast.genericError"), variant: "destructive" });
    } finally {
      setSavingSlug(false);
    }
  };

  const saveProfile = async () => {
    if (!tenantId) return;
    setSavingProfile(true);
    try {
      await supabase
        .from("tenants")
        .update({
          name: profileName,
          bio: profileBio,
          whatsapp_number: profileWhatsapp,
          whatsapp_default_color: whatsappDefaultColor,
          specialty: profileSpecialty || null,
        } as never)
        .eq("id", tenantId);
      toast({ title: t("mentorDashboard.toast.profileSaved") });
      // Clear temp localStorage after successful save
      localStorage.removeItem("profile_name_temp");
      localStorage.removeItem("profile_bio_temp");
      localStorage.removeItem("profile_whatsapp_temp");
      localStorage.removeItem("profile_specialty_temp");
    } catch (err) {
      toast({ title: t("mentorDashboard.toast.genericError"), variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePublicLanguage = async (lang: "ar" | "en") => {
    if (!tenantId || lang === publicLanguage) return;
    setSavingPublicLanguage(true);
    const prev = publicLanguage;
    setPublicLanguage(lang);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ public_language: lang } as never)
        .eq("id", tenantId);
      if (error) throw error;
      if (tenantSlug) setMentorPublicLanguage(tenantSlug, lang);
      toast({ title: t("mentorDashboard.toast.profileSaved") });
    } catch {
      setPublicLanguage(prev);
      toast({ title: t("mentorDashboard.toast.genericError"), variant: "destructive" });
    } finally {
      setSavingPublicLanguage(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-primary" />
            {t("profileTab.title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("profileTab.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl gap-2"
          onClick={() => openExternal(getMentorSiteUrl(tenantSlug || ""))}
        >
          <ExternalLink className="w-4 h-4" />
          {t("profileTab.previewSite")}
        </Button>
      </div>

      {/* Cover Image */}
      <div className="relative mb-8">
        <div className="h-48 rounded-xl gradient-primary overflow-hidden relative">
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt={t("profileTab.cover.alt")}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, "cover");
                }}
              />
              <div className="flex items-center gap-2 bg-card/90 rounded-lg px-4 py-2 text-sm font-medium">
                <Upload className="w-4 h-4" />
                {uploadingCover ? t("profileTab.cover.uploading") : t("profileTab.cover.change")}
              </div>
            </label>
          </div>
        </div>

        {/* Profile Image */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full gradient-primary border-4 border-card shadow-lg overflow-hidden relative group">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={t("profileTab.avatarAlt")} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-foreground text-3xl font-black">
                {profileName.charAt(0)}
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, "profile");
                }}
              />
              <Upload className="w-5 h-5 text-white" />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-14 space-y-6">
        {/* Subdomain display */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">{t("profileTab.username.title")}</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditSlug(tenantSlug);
                setSlugDialogOpen(true);
              }}
            >
              <Pencil className="w-4 h-4 ml-1" />
              {t("profileTab.username.edit")}
            </Button>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium" dir="ltr">
              {tenantSlug || (
                <span className="text-muted-foreground/60 italic">{t("profileTab.username.empty")}</span>
              )}
            </p>
            {tenantSlug && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {tenantSlug}.ebdaey.com
              </p>
            )}
          </div>
        </div>

        {/* Profile info display */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">{t("profileTab.info.title")}</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                profileSnapshotRef.current = {
                  name: profileName,
                  specialty: profileSpecialty,
                  bio: profileBio,
                  whatsapp: profileWhatsapp,
                };
                profileSavedRef.current = false;
                setProfileDialogOpen(true);
              }}
            >
              <Pencil className="w-4 h-4 ml-1" />
              {t("profileTab.info.edit")}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("profileTab.info.fields.name")}</Label>
              {profileName ? (
                <p className="text-sm font-medium">{profileName}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">{t("profileTab.info.empty")}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("profileTab.info.fields.specialty")}</Label>
              {profileSpecialty ? (
                <p className="text-sm font-medium">{profileSpecialty}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">{t("profileTab.info.empty")}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("profileTab.info.fields.bio")}</Label>
              {profileBio ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{profileBio}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">{t("profileTab.info.empty")}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("profileTab.info.fields.whatsapp")}</Label>
              {profileWhatsapp ? (
                <p className="text-sm font-medium text-end" dir="ltr">
                  {profileWhatsapp}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">{t("profileTab.info.empty")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Public site language */}
        <div className="glass-card rounded-xl p-6">
          <div className="mb-3">
            <h3 className="font-bold">{t("profileTab.publicLanguage.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("profileTab.publicLanguage.hint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["ar", "en"] as const).map((lang) => {
              const active = publicLanguage === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => savePublicLanguage(lang)}
                  disabled={savingPublicLanguage || active}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background dark:bg-input hover:border-primary/50"
                  } ${savingPublicLanguage ? "opacity-70" : ""}`}
                >
                  {t(`profileTab.publicLanguage.options.${lang}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subdomain edit dialog */}
        <Dialog open={slugDialogOpen} onOpenChange={setSlugDialogOpen}>
          <DialogContent dir={i18n.language?.startsWith("en") ? "ltr" : "rtl"} className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("profileTab.username.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">{t("profileTab.username.hint")}</p>
              <div
                className="flex flex-wrap items-center gap-x-0 gap-y-1 rounded-md border border-input bg-background dark:bg-input px-3 py-2 min-h-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                dir="ltr"
              >
                <input
                  value={editSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={t("profileTab.username.placeholder")}
                  dir="ltr"
                  size={Math.max(editSlug.length || 9, 1)}
                  className="bg-background dark:bg-input outline-none text-sm placeholder:text-muted-foreground max-w-full"
                />
                <span className="text-sm text-muted-foreground select-none whitespace-nowrap">.ebdaey.com</span>
              </div>

              {editSlug && editSlug !== tenantSlug && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {editSlug}.ebdaey.com
                  </p>
                  {slugAvailable === true && (
                    <span className="text-xs text-green-600">{t("profileTab.username.available")}</span>
                  )}
                  {slugAvailable === false && (
                    <span className="text-xs text-destructive">{t("profileTab.username.unavailable")}</span>
                  )}
                </div>
              )}
              {editSlug && editSlug.length < 3 && (
                <p className="text-xs text-destructive">{t("profileTab.username.minLength")}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setSlugDialogOpen(false)} disabled={savingSlug}>
                {t("profileTab.username.cancel")}
              </Button>
              <Button
                onClick={async () => {
                  await saveSlug();
                  setSlugDialogOpen(false);
                }}
                disabled={savingSlug || !editSlug || editSlug === tenantSlug || editSlug.length < 3}
                className="bg-primary text-primary-foreground border-0 hover:bg-primary/90"
              >
                <Check className="w-4 h-4 ml-1" />
                {savingSlug ? t("profileTab.username.saving") : t("profileTab.username.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Profile info edit dialog */}
        <Dialog
          open={profileDialogOpen}
          onOpenChange={(open) => {
            if (open) setProfileDialogOpen(true);
            else closeProfileDialog();
          }}
        >
          <DialogContent
            dir={i18n.language?.startsWith("en") ? "ltr" : "rtl"}
            className="max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>{t("profileTab.info.dialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1 block">{t("profileTab.info.fields.name")}</Label>
                <Input
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    localStorage.setItem("profile_name_temp", e.target.value);
                  }}
                  placeholder={t("profileTab.info.placeholders.name")}
                  className="bg-background dark:bg-input"
                />
              </div>
              <div>
                <Label className="mb-1 block">{t("profileTab.info.fields.specialty")}</Label>
                <Input
                  value={profileSpecialty}
                  onChange={(e) => {
                    setProfileSpecialty(e.target.value);
                    localStorage.setItem("profile_specialty_temp", e.target.value);
                  }}
                  placeholder={t("profileTab.info.placeholders.specialty")}
                  className="bg-background dark:bg-input"
                />
              </div>
              <div>
                <Label className="mb-1 block">{t("profileTab.info.fields.bio")}</Label>
                <Textarea
                  value={profileBio}
                  onChange={(e) => {
                    setProfileBio(e.target.value);
                    localStorage.setItem("profile_bio_temp", e.target.value);
                  }}
                  placeholder={t("profileTab.info.placeholders.bio")}
                  rows={4}
                  className="bg-background dark:bg-input"
                />
              </div>
              <div>
                <Label className="mb-1 block">{t("profileTab.info.fields.whatsapp")}</Label>
                <PhoneInputField
                  value={profileWhatsapp}
                  onChange={(value) => {
                    setProfileWhatsapp(value);
                    localStorage.setItem("profile_whatsapp_temp", value);
                  }}
                  placeholder={t("profileTab.info.placeholders.whatsapp")}
                  className="[&>div]:bg-background dark:[&>div]:bg-input"
                />
                <p className="text-xs text-muted-foreground mt-1">{t("profileTab.info.whatsappHint")}</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={closeProfileDialog} disabled={savingProfile}>
                {t("profileTab.info.cancel")}
              </Button>
              <Button
                onClick={async () => {
                  await saveProfile();
                  profileSavedRef.current = true;
                  setProfileDialogOpen(false);
                }}
                disabled={savingProfile}
                className="bg-primary text-primary-foreground border-0 hover:bg-primary/90"
              >
                <Check className="w-4 h-4 ml-2" />
                {savingProfile ? t("profileTab.info.saving") : t("profileTab.info.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Social Media Links */}
        {tenantId && <SocialLinksCard tenantId={tenantId} />}

        {/* Theme Color Picker */}
        {tenantId && (
          <ThemeColorPicker
            tenantId={tenantId}
            currentColor={primaryColor}
            onColorSaved={(color) => setPrimaryColor(color)}
          />
        )}
      </div>
    </div>
  );
}
