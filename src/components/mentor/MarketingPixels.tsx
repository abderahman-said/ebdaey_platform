import { useState, useEffect, useMemo } from "react";
import {
  Unlink,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Video,
  Tag,
  Settings,
  Link2,
  Clock,
  ShieldCheck,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { AppsPlusIcon } from "@/components/common/AppsPlusIcon";

import logoMeta from "@/assets/logo-meta.png";
import logoTiktok from "@/assets/logo-tiktok.png";
import logoZoom from "@/assets/logo-zoom.webp";
import logoGoogleCalendar from "@/assets/google-calendar-icon.png.asset.json";
import logoGtm from "@/assets/gtm-logo.png.asset.json";
import logoGa from "@/assets/google-analytics-logo.png.asset.json";
import logoClarity from "@/assets/microsoft-clarity-logo.png.asset.json";
import logoSnap from "@/assets/snapchat-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface MarketingPixelsProps {
  tenantId: string;
}

const extractMetaPixelId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^\d{10,20}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]\s*\)/);
  return match ? match[1] : null;
};

const extractTiktokPixelId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^[A-Z0-9]{10,30}$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/ttq\.load\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
};

const extractClarityProjectId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^[a-z0-9]{6,20}$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/clarity\.ms\/tag\/([a-z0-9]+)/i)
    || trimmed.match(/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]+)["']/i);
  return match ? match[1] : null;
};

const extractSnapPixelId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^[a-z0-9-]{8,64}$/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/snaptr\s*\(\s*['"]init['"]\s*,\s*['"]([a-z0-9-]+)['"]/i);
  return match ? match[1] : null;
};
const extractGtmContainerId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^GTM-[a-z0-9]{4,20}$/i.test(trimmed)) return trimmed.toUpperCase();
  const match = trimmed.match(/gtm\.js\?id=(GTM-[a-z0-9]+)/i)
    || trimmed.match(/ns\.html\?id=(GTM-[a-z0-9]+)/i)
    || trimmed.match(/['"](GTM-[a-z0-9]+)['"]/i);
  return match ? match[1].toUpperCase() : null;
};

const extractGaMeasurementId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^(G|UA|AW|GT)-[a-z0-9-]{4,30}$/i.test(trimmed)) return trimmed.toUpperCase();
  const match = trimmed.match(/gtag\/js\?id=((?:G|UA|AW|GT)-[a-z0-9-]+)/i)
    || trimmed.match(/['"]config['"]\s*,\s*['"]((?:G|UA|AW|GT)-[a-z0-9-]+)['"]/i);
  return match ? match[1].toUpperCase() : null;
};



type Status = "connected" | "disconnected" | "coming_soon";

const MarketingPixels = ({ tenantId }: MarketingPixelsProps) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [metaPixelId, setMetaPixelId] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [tiktokPixelId, setTiktokPixelId] = useState<string | null>(null);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [clarityProjectId, setClarityProjectId] = useState<string | null>(null);
  const [clarityConnected, setClarityConnected] = useState(false);
  const [snapPixelId, setSnapPixelId] = useState<string | null>(null);
  const [snapConnected, setSnapConnected] = useState(false);
  const [gaMeasurementId, setGaMeasurementId] = useState<string | null>(null);
  const [gaConnected, setGaConnected] = useState(false);
  const [gaConnectOpen, setGaConnectOpen] = useState(false);
  const [gaManageOpen, setGaManageOpen] = useState(false);
  const [gaScript, setGaScript] = useState("");
  const [gaError, setGaError] = useState("");
  const [gtmContainerId, setGtmContainerId] = useState<string | null>(null);
  const [gtmConnected, setGtmConnected] = useState(false);
  const [gtmConnectOpen, setGtmConnectOpen] = useState(false);
  const [gtmManageOpen, setGtmManageOpen] = useState(false);
  const [gtmScript, setGtmScript] = useState("");
  const [gtmError, setGtmError] = useState("");


  // Zoom state
  const [zoomAccount, setZoomAccount] = useState<{ email: string; name: string | null } | null>(null);
  const [zoomManageOpen, setZoomManageOpen] = useState(false);
  const [zoomConnecting, setZoomConnecting] = useState(false);

  // Google Calendar state
  const [gcalAccount, setGcalAccount] = useState<{ email: string; busy_sync_enabled: boolean } | null>(null);
  const [gcalManageOpen, setGcalManageOpen] = useState(false);
  const [gcalConnecting, setGcalConnecting] = useState(false);

  // Dialog states
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);
  const [metaManageOpen, setMetaManageOpen] = useState(false);
  const [tiktokConnectOpen, setTiktokConnectOpen] = useState(false);
  const [tiktokManageOpen, setTiktokManageOpen] = useState(false);
  const [clarityConnectOpen, setClarityConnectOpen] = useState(false);
  const [clarityManageOpen, setClarityManageOpen] = useState(false);
  const [snapConnectOpen, setSnapConnectOpen] = useState(false);
  const [snapManageOpen, setSnapManageOpen] = useState(false);

  const [guideOpen, setGuideOpen] = useState(false);

  const [metaScript, setMetaScript] = useState("");
  const [metaError, setMetaError] = useState("");
  const [tiktokScript, setTiktokScript] = useState("");
  const [tiktokError, setTiktokError] = useState("");
  const [clarityScript, setClarityScript] = useState("");
  const [clarityError, setClarityError] = useState("");
  const [snapScript, setSnapScript] = useState("");
  const [snapError, setSnapError] = useState("");


  useEffect(() => {
    loadPixels();
    loadZoom();
    loadGcal();
    // OAuth return handling
    const params = new URLSearchParams(window.location.search);
    let mutated = false;
    if (params.get("zoom_connected") === "1") {
      toast({ title: t("marketingPixels.toasts.zoomConnected") });
      params.delete("zoom_connected");
      mutated = true;
    }
    if (params.get("gcal_connected") === "1") {
      toast({ title: t("marketingPixels.toasts.gcalConnected") });
      params.delete("gcal_connected");
      loadGcal();
      mutated = true;
    }
    if (mutated) {
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? "?" + newSearch : ""));
    }
  }, [tenantId]);

  const loadZoom = async () => {
    const { data } = await supabase
      .from("mentor_zoom_accounts" as any)
      .select("zoom_email, zoom_account_name")
      .eq("tenant_id", tenantId)
      .maybeSingle() as { data: { zoom_email: string; zoom_account_name: string | null } | null };
    if (data) setZoomAccount({ email: data.zoom_email, name: data.zoom_account_name });
    else setZoomAccount(null);
  };

  const connectZoom = async () => {
    setZoomConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("zoom-oauth-start", {
        body: { returnUrl: window.location.href },
      });
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(t("marketingPixels.toasts.noAuthUrl"));
      }
    } catch (err: any) {
      toast({ title: t("marketingPixels.toasts.connectFailed"), description: err.message, variant: "destructive" });
      setZoomConnecting(false);
    }
  };

  const disconnectZoom = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("zoom-disconnect");
      if (error) throw error;
      setZoomAccount(null);
      setZoomManageOpen(false);
      toast({ title: t("marketingPixels.toasts.zoomDisconnected") });
    } catch (err: any) {
      toast({ title: t("marketingPixels.toasts.disconnectFailed"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const loadGcal = async () => {
    const { data } = await (supabase as any).rpc("get_my_gcal_account");
    const row = Array.isArray(data) && data[0] ? data[0] : null;
    if (row) setGcalAccount({ email: row.google_email, busy_sync_enabled: row.busy_sync_enabled });
    else setGcalAccount(null);
  };

  const connectGcal = async () => {
    setGcalConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-oauth-start", {
        body: { returnUrl: window.location.href },
      });
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(t("marketingPixels.toasts.noAuthUrl"));
      }
    } catch (err: any) {
      toast({ title: t("marketingPixels.toasts.connectFailed"), description: err.message, variant: "destructive" });
      setGcalConnecting(false);
    }
  };

  const disconnectGcal = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("google-calendar-disconnect");
      if (error) throw error;
      setGcalAccount(null);
      setGcalManageOpen(false);
      toast({ title: t("marketingPixels.toasts.gcalDisconnected") });
    } catch (err: any) {
      toast({ title: t("marketingPixels.toasts.disconnectFailed"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleGcalBusySync = async (enabled: boolean) => {
    const { error } = await (supabase as any).rpc("set_my_gcal_busy_sync", { _enabled: enabled });
    if (error) {
      toast({ title: t("marketingPixels.toasts.saveFailed"), description: error.message, variant: "destructive" });
      return;
    }
    setGcalAccount((prev) => prev ? { ...prev, busy_sync_enabled: enabled } : prev);
  };


  const loadPixels = async () => {
    const { data } = await supabase.from("mentor_pixels").select("*").eq("tenant_id", tenantId).maybeSingle();

    if (data) {
      setMetaPixelId(data.meta_pixel_id);
      setMetaConnected(data.meta_connected);
      setTiktokPixelId(data.tiktok_pixel_id);
      setTiktokConnected(data.tiktok_connected);
      setClarityProjectId((data as any).clarity_project_id ?? null);
      setClarityConnected((data as any).clarity_connected ?? false);
      setSnapPixelId((data as any).snap_pixel_id ?? null);
      setSnapConnected((data as any).snap_connected ?? false);
      setGaMeasurementId((data as any).ga_measurement_id ?? null);
      setGaConnected((data as any).ga_connected ?? false);
      setGtmContainerId((data as any).gtm_container_id ?? null);
      setGtmConnected((data as any).gtm_connected ?? false);
    }
    setLoading(false);
  };

  const connectGtm = async () => {
    setGtmError("");
    const id = extractGtmContainerId(gtmScript);
    if (!id) {
      setGtmError(t("marketingPixels.toasts.invalidGtm"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, gtm_container_id: id, gtm_connected: true } as any, { onConflict: "tenant_id" });
    setGtmContainerId(id);
    setGtmConnected(true);
    setGtmScript("");
    setSaving(false);
    setGtmConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.gtmConnected") });
  };

  const disconnectGtm = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, gtm_container_id: null, gtm_connected: false } as any, { onConflict: "tenant_id" });
    setGtmContainerId(null);
    setGtmConnected(false);
    setSaving(false);
    setGtmManageOpen(false);
    toast({ title: t("marketingPixels.toasts.gtmDisconnected") });
  };

  const connectGa = async () => {
    setGaError("");
    const id = extractGaMeasurementId(gaScript);
    if (!id) {
      setGaError(t("marketingPixels.toasts.invalidGa"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, ga_measurement_id: id, ga_connected: true } as any, { onConflict: "tenant_id" });
    setGaMeasurementId(id);
    setGaConnected(true);
    setGaScript("");
    setSaving(false);
    setGaConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.gaConnected") });
  };

  const disconnectGa = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, ga_measurement_id: null, ga_connected: false } as any, { onConflict: "tenant_id" });
    setGaMeasurementId(null);
    setGaConnected(false);
    setSaving(false);
    setGaManageOpen(false);
    toast({ title: t("marketingPixels.toasts.gaDisconnected") });
  };



  const connectClarity = async () => {
    setClarityError("");
    const id = extractClarityProjectId(clarityScript);
    if (!id) {
      setClarityError(t("marketingPixels.toasts.invalidClarity"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, clarity_project_id: id, clarity_connected: true } as any, { onConflict: "tenant_id" });
    setClarityProjectId(id);
    setClarityConnected(true);
    setClarityScript("");
    setSaving(false);
    setClarityConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.clarityConnected") });
  };

  const disconnectClarity = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, clarity_project_id: null, clarity_connected: false } as any, { onConflict: "tenant_id" });
    setClarityProjectId(null);
    setClarityConnected(false);
    setSaving(false);
    setClarityManageOpen(false);
    toast({ title: t("marketingPixels.toasts.clarityDisconnected") });
  };

  const connectSnap = async () => {
    setSnapError("");
    const id = extractSnapPixelId(snapScript);
    if (!id) {
      setSnapError(t("marketingPixels.toasts.invalidSnap"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, snap_pixel_id: id, snap_connected: true } as any, { onConflict: "tenant_id" });
    setSnapPixelId(id);
    setSnapConnected(true);
    setSnapScript("");
    setSaving(false);
    setSnapConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.snapConnected") });
  };

  const disconnectSnap = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, snap_pixel_id: null, snap_connected: false } as any, { onConflict: "tenant_id" });
    setSnapPixelId(null);
    setSnapConnected(false);
    setSaving(false);
    setSnapManageOpen(false);
    toast({ title: t("marketingPixels.toasts.snapDisconnected") });
  };


  const connectMeta = async () => {
    setMetaError("");
    const id = extractMetaPixelId(metaScript);
    if (!id) {
      setMetaError(t("marketingPixels.toasts.invalidMeta"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, meta_pixel_id: id, meta_connected: true }, { onConflict: "tenant_id" });
    setMetaPixelId(id);
    setMetaConnected(true);
    setMetaScript("");
    setSaving(false);
    setMetaConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.metaConnected") });
  };

  const disconnectMeta = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, meta_pixel_id: null, meta_connected: false }, { onConflict: "tenant_id" });
    setMetaPixelId(null);
    setMetaConnected(false);
    setSaving(false);
    setMetaManageOpen(false);
    toast({ title: t("marketingPixels.toasts.metaDisconnected") });
  };

  const connectTiktok = async () => {
    setTiktokError("");
    const id = extractTiktokPixelId(tiktokScript);
    if (!id) {
      setTiktokError(t("marketingPixels.toasts.invalidTiktok"));
      return;
    }
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, tiktok_pixel_id: id, tiktok_connected: true }, { onConflict: "tenant_id" });
    setTiktokPixelId(id);
    setTiktokConnected(true);
    setTiktokScript("");
    setSaving(false);
    setTiktokConnectOpen(false);
    toast({ title: t("marketingPixels.toasts.tiktokConnected") });
  };

  const disconnectTiktok = async () => {
    setSaving(true);
    await supabase
      .from("mentor_pixels")
      .upsert({ tenant_id: tenantId, tiktok_pixel_id: null, tiktok_connected: false }, { onConflict: "tenant_id" });
    setTiktokPixelId(null);
    setTiktokConnected(false);
    setSaving(false);
    setTiktokManageOpen(false);
    toast({ title: t("marketingPixels.toasts.tiktokDisconnected") });
  };

  // Flat list for table view
  const allIntegrations = useMemo(() => {
    return [
      {
        name: "Meta Pixel",
        brand: "Meta Pixel",
        description: t("marketingPixels.apps.meta.desc"),
        icon: <img src={logoMeta} alt="Meta" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "bg-white dark:bg-muted border border-border/40 overflow-hidden",
        status: (metaConnected ? "connected" : "disconnected") as Status,
        pixelId: metaConnected ? metaPixelId : null,
        onConnect: () => setMetaConnectOpen(true),
        onManage: () => setMetaManageOpen(true),
      },
      {
        name: "TikTok Pixel",
        brand: "TikTok Pixel",
        description: t("marketingPixels.apps.tiktok.desc"),
        icon: <img src={logoTiktok} alt="TikTok" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "bg-white dark:bg-muted border border-border/40 overflow-hidden",
        status: (tiktokConnected ? "connected" : "disconnected") as Status,
        pixelId: tiktokConnected ? tiktokPixelId : null,
        onConnect: () => setTiktokConnectOpen(true),
        onManage: () => setTiktokManageOpen(true),
      },
      {
        name: "Zoom",
        brand: "Zoom",
        description: t("marketingPixels.apps.zoom.desc"),
        icon: <img src={logoZoom} alt="Zoom" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "",
        status: (zoomAccount ? "connected" : "disconnected") as Status,
        pixelId: zoomAccount?.email || null,
        connecting: zoomConnecting,
        onConnect: connectZoom,
        onManage: () => setZoomManageOpen(true),
      },
      {
        name: "Google Calendar",
        brand: "Google Calendar",
        description: t("marketingPixels.apps.gcal.desc"),
        icon: <img src={logoGoogleCalendar.url} alt="Google Calendar" className="w-full h-full object-cover" />,
        iconBg: "bg-white overflow-hidden",
        status: (gcalAccount ? "connected" : "disconnected") as Status,
        pixelId: gcalAccount?.email || null,
        connecting: gcalConnecting,
        onConnect: connectGcal,
        onManage: () => setGcalManageOpen(true),
      },
      {
        name: "Google Tag Manager",
        brand: "Google Tag Manager",
        description: t("marketingPixels.apps.gtm.desc"),
        icon: <img src={logoGtm.url} alt="Google Tag Manager" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "bg-white dark:bg-muted border border-border/40 overflow-hidden",
        status: (gtmConnected ? "connected" : "disconnected") as Status,
        pixelId: gtmConnected ? gtmContainerId : null,
        onConnect: () => setGtmConnectOpen(true),
        onManage: () => setGtmManageOpen(true),
      },
      {
        name: "Google Analytics",
        brand: "Google Analytics",
        description: t("marketingPixels.apps.ga.desc"),
        icon: <img src={logoGa.url} alt="Google Analytics" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "bg-white dark:bg-muted border border-border/40 overflow-hidden",
        status: (gaConnected ? "connected" : "disconnected") as Status,
        pixelId: gaConnected ? gaMeasurementId : null,
        onConnect: () => setGaConnectOpen(true),
        onManage: () => setGaManageOpen(true),
      },
      {
        name: "Microsoft Clarity",
        brand: "Microsoft Clarity",
        description: t("marketingPixels.apps.clarity.desc"),
        icon: <img src={logoClarity.url} alt="Microsoft Clarity" className="w-full h-full object-cover rounded-lg" />,
        iconBg: "bg-white dark:bg-muted border border-border/40 overflow-hidden",
        status: (clarityConnected ? "connected" : "disconnected") as Status,
        pixelId: clarityConnected ? clarityProjectId : null,
        onConnect: () => setClarityConnectOpen(true),
        onManage: () => setClarityManageOpen(true),
      },
      {
        name: "Snap Pixel",
        brand: "Snap Pixel",
        description: t("marketingPixels.apps.snap.desc"),
        icon: <img src={logoSnap.url} alt="Snap Pixel" className="w-full h-full object-cover" />,
        iconBg: "bg-white overflow-hidden",
        status: (snapConnected ? "connected" : "disconnected") as Status,
        pixelId: snapConnected ? snapPixelId : null,
        onConnect: () => setSnapConnectOpen(true),
        onManage: () => setSnapManageOpen(true),
      },
    ];
  }, [metaConnected, metaPixelId, tiktokConnected, tiktokPixelId, clarityConnected, clarityProjectId, snapConnected, snapPixelId, gaConnected, gaMeasurementId, gtmConnected, gtmContainerId, zoomAccount, gcalAccount, zoomConnecting, gcalConnecting, t]);


  if (loading) {
    return <div className="text-muted-foreground text-center py-12">{t("marketingPixels.loading")}</div>;
  }

  const textAlign = dir === "rtl" ? "text-end" : "text-start";

  return (
    <div className="space-y-6" dir={dir}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AppsPlusIcon className="w-6 h-6 text-primary" />
            {t("marketingPixels.header.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {t("marketingPixels.header.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setGuideOpen(true)} className="gap-2">
            <HelpCircle className="w-4 h-4" />
            {t("marketingPixels.header.guide")}
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={textAlign}>{t("marketingPixels.table.app")}</TableHead>
              <TableHead className={textAlign}>{t("marketingPixels.table.description")}</TableHead>
              <TableHead className={textAlign}>{t("marketingPixels.table.status")}</TableHead>
              <TableHead className={textAlign}>{t("marketingPixels.table.accountId")}</TableHead>
              <TableHead className={textAlign}>{t("marketingPixels.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allIntegrations.map((it) => (
              <TableRow
                key={it.name}
                id={it.name === "Zoom" ? "zoom-integration" : undefined}
                className="hover:bg-muted/20 scroll-mt-6"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${it.iconBg}`}>
                      {it.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm leading-tight">{it.name}</div>
                    </div>

                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{it.description}</p>
                </TableCell>
                <TableCell>
                  {it.status === "connected" && (
                    <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/20 gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> {t("marketingPixels.table.connected")}
                    </Badge>
                  )}
                  {it.status === "disconnected" && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border">
                      {t("marketingPixels.table.disconnected")}
                    </Badge>
                  )}
                  {it.status === "coming_soon" && (
                    <Badge className="bg-warning/15 text-warning border border-warning/30 hover:bg-warning/20 gap-1.5">
                      <Clock className="w-3 h-3" /> {t("marketingPixels.table.comingSoon")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {it.pixelId ? (
                    <span className="font-mono text-xs" dir="ltr">
                      {it.pixelId}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {it.status === "connected" && (
                    <Button size="sm" variant="outline" onClick={it.onManage} className="gap-1.5 h-8">
                      <Settings className="w-3.5 h-3.5" /> {t("marketingPixels.table.manage")}
                    </Button>
                  )}
                  {it.status === "disconnected" && (
                    <Button
                      size="sm"
                      onClick={it.onConnect}
                      disabled={(it as { connecting?: boolean }).connecting}
                      className="gap-1.5 h-8"
                    >
                      {(it as { connecting?: boolean }).connecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                      {t("marketingPixels.table.connect")}
                    </Button>
                  )}
                  {it.status === "coming_soon" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="gap-1.5 h-8 text-warning border-warning/30"
                    >
                      {t("marketingPixels.table.comingSoon")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Security Footer ── */}
      <div className="rounded-2xl border border-success/20 bg-success/5 backdrop-blur-sm p-4 flex items-center justify-center gap-2 text-sm">
        <ShieldCheck className="w-5 h-5 text-success shrink-0" />
        <span className="text-foreground/80">{t("marketingPixels.security")}</span>
      </div>

      {/* ── Meta Connect Dialog ── */}
      <Dialog open={metaConnectOpen} onOpenChange={setMetaConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.meta.connectTitle")}</DialogTitle>
            <DialogDescription>
              {t("marketingPixels.meta.connectDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.meta.pixelId")}</Label>
            <Input
              value={metaScript}
              onChange={(e) => {
                setMetaScript(e.target.value);
                setMetaError("");
              }}
              placeholder={t("marketingPixels.meta.metaPlaceholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {metaError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {metaError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectMeta} disabled={saving || !metaScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Meta Manage Dialog ── */}
      <Dialog open={metaManageOpen} onOpenChange={setMetaManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.meta.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.meta.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.meta.pixelId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">
                {metaPixelId}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.meta.capiEnabled")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectMeta} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TikTok Connect Dialog ── */}
      <Dialog open={tiktokConnectOpen} onOpenChange={setTiktokConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.tiktok.connectTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.tiktok.connectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.meta.pixelId")}</Label>
            <Input
              value={tiktokScript}
              onChange={(e) => {
                setTiktokScript(e.target.value);
                setTiktokError("");
              }}
              placeholder={t("marketingPixels.tiktok.placeholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {tiktokError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {tiktokError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTiktokConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectTiktok} disabled={saving || !tiktokScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TikTok Manage Dialog ── */}
      <Dialog open={tiktokManageOpen} onOpenChange={setTiktokManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.tiktok.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.tiktok.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.meta.pixelId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">
                {tiktokPixelId}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTiktokManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectTiktok} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clarity Connect Dialog ── */}
      <Dialog open={clarityConnectOpen} onOpenChange={setClarityConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.clarityDlg.connectTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.clarityDlg.connectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.clarityDlg.projectId")}</Label>
            <Input
              value={clarityScript}
              onChange={(e) => {
                setClarityScript(e.target.value);
                setClarityError("");
              }}
              placeholder={t("marketingPixels.clarityDlg.placeholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {clarityError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {clarityError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClarityConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectClarity} disabled={saving || !clarityScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clarity Manage Dialog ── */}
      <Dialog open={clarityManageOpen} onOpenChange={setClarityManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.clarityDlg.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.clarityDlg.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.clarityDlg.projectId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">{clarityProjectId}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.clarityDlg.auto")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClarityManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectClarity} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Snap Connect Dialog ── */}
      <Dialog open={snapConnectOpen} onOpenChange={setSnapConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.snapDlg.connectTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.snapDlg.connectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.snapDlg.pixelId")}</Label>
            <Input
              value={snapScript}
              onChange={(e) => {
                setSnapScript(e.target.value);
                setSnapError("");
              }}
              placeholder={t("marketingPixels.snapDlg.placeholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {snapError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {snapError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectSnap} disabled={saving || !snapScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Snap Manage Dialog ── */}
      <Dialog open={snapManageOpen} onOpenChange={setSnapManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.snapDlg.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.snapDlg.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.snapDlg.pixelId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">{snapPixelId}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.snapDlg.auto")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectSnap} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* ── Google Tag Manager Connect Dialog ── */}
      <Dialog open={gtmConnectOpen} onOpenChange={setGtmConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.gtmDlg.connectTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.gtmDlg.connectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.gtmDlg.containerId")}</Label>
            <Input
              value={gtmScript}
              onChange={(e) => {
                setGtmScript(e.target.value);
                setGtmError("");
              }}
              placeholder={t("marketingPixels.gtmDlg.placeholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {gtmError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {gtmError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGtmConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectGtm} disabled={saving || !gtmScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Google Tag Manager Manage Dialog ── */}
      <Dialog open={gtmManageOpen} onOpenChange={setGtmManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.gtmDlg.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.gtmDlg.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.gtmDlg.containerId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">{gtmContainerId}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.gtmDlg.auto")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGtmManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectGtm} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Google Analytics Connect Dialog ── */}
      <Dialog open={gaConnectOpen} onOpenChange={setGaConnectOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.gaDlg.connectTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.gaDlg.connectDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">{t("marketingPixels.gaDlg.measurementId")}</Label>
            <Input
              value={gaScript}
              onChange={(e) => {
                setGaScript(e.target.value);
                setGaError("");
              }}
              placeholder={t("marketingPixels.gaDlg.placeholder")}
              dir="ltr"
              className="font-mono text-xs"
            />
            {gaError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {gaError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGaConnectOpen(false)}>
              {t("marketingPixels.meta.cancel")}
            </Button>
            <Button onClick={connectGa} disabled={saving || !gaScript.trim()}>
              {t("marketingPixels.meta.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Google Analytics Manage Dialog ── */}
      <Dialog open={gaManageOpen} onOpenChange={setGaManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.gaDlg.manageTitle")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.gaDlg.manageDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.gaDlg.measurementId")}</Label>
              <p className="font-mono text-sm mt-1" dir="ltr">{gaMeasurementId}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.gaDlg.auto")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGaManageOpen(false)}>
              {t("marketingPixels.meta.close")}
            </Button>
            <Button variant="destructive" onClick={disconnectGa} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" />
              {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Zoom Manage Dialog ── */}
      <Dialog open={zoomManageOpen} onOpenChange={setZoomManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.zoomDlg.title")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.zoomDlg.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.zoomDlg.email")}</Label>
              <p className="text-sm mt-1" dir="ltr">{zoomAccount?.email}</p>
            </div>
            {zoomAccount?.name && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <Label className="text-xs text-muted-foreground">{t("marketingPixels.zoomDlg.accountName")}</Label>
                <p className="text-sm mt-1">{zoomAccount.name}</p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.zoomDlg.auto")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoomManageOpen(false)}>{t("marketingPixels.meta.close")}</Button>
            <Button variant="destructive" onClick={disconnectZoom} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" /> {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Google Calendar Manage Dialog ── */}
      <Dialog open={gcalManageOpen} onOpenChange={setGcalManageOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.gcalDlg.title")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.gcalDlg.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-xs text-muted-foreground">{t("marketingPixels.gcalDlg.email")}</Label>
              <p className="text-sm mt-1" dir="ltr">{gcalAccount?.email}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm">{t("marketingPixels.gcalDlg.auto")}</span>
            </div>
            <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">{t("marketingPixels.gcalDlg.busyTitle")}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{t("marketingPixels.gcalDlg.busyDesc")}</p>
              </div>
              <input
                type="checkbox"
                checked={!!gcalAccount?.busy_sync_enabled}
                onChange={(e) => toggleGcalBusySync(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGcalManageOpen(false)}>{t("marketingPixels.meta.close")}</Button>
            <Button variant="destructive" onClick={disconnectGcal} disabled={saving} className="gap-1.5">
              <Unlink className="w-4 h-4" /> {t("marketingPixels.meta.disconnect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Guide Dialog ── */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("marketingPixels.guide.title")}</DialogTitle>
            <DialogDescription>{t("marketingPixels.guide.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto text-sm">
            <div className="p-3 rounded-lg border border-border bg-card/50">
              <div className="font-semibold mb-1">{t("marketingPixels.guide.pixels")}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("marketingPixels.guide.pixelsDesc")}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/50">
              <div className="font-semibold mb-1">{t("marketingPixels.guide.meet")}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("marketingPixels.guide.meetDesc")}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/50">
              <div className="font-semibold mb-1">{t("marketingPixels.guide.cal")}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("marketingPixels.guide.calDesc")}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/50">
              <div className="font-semibold mb-1">{t("marketingPixels.guide.analytics")}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("marketingPixels.guide.analyticsDesc")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setGuideOpen(false)}>{t("marketingPixels.guide.done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingPixels;
