import PriceListEditor from "@/components/mentor/PriceListEditor";
import DOMPurify from "dompurify";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { openExternal } from "@/lib/openExternal";
import { toAr } from "@/lib/utils";
import { isBunnyUrl, deleteBunnyVideo } from "@/lib/bunny";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RichTextEditor from "./RichTextEditor";
import LandingSettingsEditor from "./LandingSettingsEditor";
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import BunnyVideoThumbnail from "./BunnyVideoThumbnail";
import { Progress } from "@/components/ui/progress";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import DigitalProductOrderBumpEditor from "./DigitalProductOrderBumpEditor";
import SalesOffersBlock from "./SalesOffersBlock";
import {
  ArrowRight,
  Check,
  Upload,
  Trash2,
  Plus,
  Minus,
  FileText,
  GripVertical,
  Tag,
  Monitor,
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  Users,
  Award,
  Loader2,
  Image as ImageIcon,
  Play,
  ExternalLink,
  Package,
  Gift,
  Lock,
  BookOpen,
  Edit3,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InlineEdit,
  InlineEditContent,
  InlineEditHeader,
  InlineEditTitle,
  InlineEditDescription,
  InlineEditFooter,
} from "./InlineEditPanel";
import GiftPicker from "./GiftPicker";
import {
  GiftItem,
  loadDigitalProductGifts,
  saveDigitalProductGifts,
} from "@/lib/giftItems";
import { EditorSkeleton } from "./EditorSkeleton";

interface DigitalProductEditorProps {
  productId: string;
  tenantId: string;
  tenantSlug: string;
  onBack: () => void;
  initialTab?: string;
}

interface ProductFile {
  id: string;
  title: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
  sort_order: number;
  is_sample?: boolean;
}

const DigitalProductEditor = ({
  productId,
  tenantId,
  tenantSlug,
  onBack,
  initialTab,
}: DigitalProductEditorProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSample, setUploadingSample] = useState(false);
  const dataLoaded = useRef(false);

  // Core
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [adjectives, setAdjectives] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [price, setPrice] = useState(0);
  const [priceBeforeDiscount, setPriceBeforeDiscount] = useState<number | null>(
    null,
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBannerVideo, setUploadingBannerVideo] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [buyButtonText, setBuyButtonText] = useState("");
  const [cardButtonText, setCardButtonText] = useState("");

  // Files
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [dragFileId, setDragFileId] = useState<string | null>(null);
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);

  // Gifts (all kinds)
  const [giftCoursesEnabled, setGiftCoursesEnabled] = useState(false);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);

  // Landing
  const [landingHeader, setLandingHeader] = useState("");
  const [landingSubheader, setLandingSubheader] = useState("");
  const [landingHeaderColor, setLandingHeaderColor] = useState("#000000");
  const [landingSubheaderColor, setLandingSubheaderColor] = useState("#666666");
  const [landingHeaderSize, setLandingHeaderSize] = useState("3xl");
  const [landingSubheaderSize, setLandingSubheaderSize] = useState("lg");
  const [landingFeatures, setLandingFeatures] = useState<
    { text: string; icon: string }[]
  >([]);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);

  // Extras
  const [hasIndividualSupport, setHasIndividualSupport] = useState(false);
  const [hasLifetimeUpdates, setHasLifetimeUpdates] = useState(false);
  const [hasCommunity, setHasCommunity] = useState(false);
  const [communityLink, setCommunityLink] = useState("");
  const [supportType, setSupportType] = useState<
    "none" | "community" | "individual" | "both"
  >("none");
  const [tenantWhatsapp, setTenantWhatsapp] = useState<string | null>(null);
  const [guaranteeEnabled, setGuaranteeEnabled] = useState(false);
  const [guaranteeDays, setGuaranteeDays] = useState(7);
  const [guaranteeTitle, setGuaranteeTitle] = useState("");
  const [guaranteeDescription, setGuaranteeDescription] = useState("");

  // Dirty
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const markDirty = useCallback(() => {
    if (dataLoaded.current) setIsDirty(true);
  }, []);

  // Edit dialogs
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [productInfoDialogOpen, setProductInfoDialogOpen] = useState(false);
  const [landingDialogOpen, setLandingDialogOpen] = useState(false);

  useEffect(() => {
    if (!dataLoaded.current) return;
    markDirty();
  }, [
    title,
    slug,
    description,
    adjectives,
    targetAudience,
    price,
    priceBeforeDiscount,
    thumbnailUrl,
    bannerVideoUrl,
    isPublished,
    isUnlisted,
    displayOrder,
    buyButtonText,
    cardButtonText,
    giftCoursesEnabled,
    giftItems,
    landingHeader,
    landingSubheader,
    landingHeaderColor,
    landingSubheaderColor,
    landingHeaderSize,
    landingSubheaderSize,
    hasLifetimeUpdates,
    supportType,
    communityLink,
    guaranteeEnabled,
    guaranteeDays,
    guaranteeTitle,
    guaranteeDescription,
  ]);

  const loadAll = async () => {
    setLoading(true);
    const [tenantRes, productRes, filesRes] = await Promise.all([
      supabase
        .from("tenants")
        .select("whatsapp_number")
        .eq("id", tenantId)
        .single(),
      supabase
        .from("digital_products")
        .select("*")
        .eq("id", productId)
        .single(),
      supabase
        .from("digital_product_files")
        .select("*")
        .eq("digital_product_id", productId)
        .order("sort_order"),
    ]);

    setTenantWhatsapp(tenantRes.data?.whatsapp_number ?? null);

    if (productRes.error || !productRes.data) {
      toast({ title: t("digitalProductEditor.toasts.loadFail"), variant: "destructive" });
      onBack();
      return;
    }
    const p: any = productRes.data;
    setTitle(p.title);
    setSlug(p.slug);
    setDescription(p.description || "");
    setAdjectives(p.adjectives || "");
    setTargetAudience(p.target_audience || "");
    setPrice(Number(p.price) || 0);
    setPriceBeforeDiscount(
      p.price_before_discount ? Number(p.price_before_discount) : null,
    );
    setThumbnailUrl(p.thumbnail_url);
    setBannerVideoUrl(p.banner_video_url || null);
    setIsPublished(p.is_published);
    setIsUnlisted(p.is_unlisted);
    setDisplayOrder(p.display_order ?? 0);
    setBuyButtonText(p.buy_button_text || "");
    setCardButtonText(p.card_button_text || "");
    setGiftCoursesEnabled(p.gift_courses_enabled);
    setLandingHeader(p.landing_header || "");
    setLandingSubheader(p.landing_subheader || "");
    setLandingHeaderColor(p.landing_header_color || "#000000");
    setLandingSubheaderColor(p.landing_subheader_color || "#666666");
    setLandingHeaderSize(p.landing_header_size || "3xl");
    setLandingSubheaderSize(p.landing_subheader_size || "lg");
    setLandingFeatures(p.landing_features || []);
    setFaqs(p.faqs || []);
    setHasIndividualSupport(p.has_individual_support);
    setHasLifetimeUpdates(p.has_lifetime_updates);
    setHasCommunity(p.has_community);
    setCommunityLink(p.community_link || "");
    if (p.has_community && p.has_individual_support) setSupportType("both");
    else if (p.has_community) setSupportType("community");
    else if (p.has_individual_support) setSupportType("individual");
    else setSupportType("none");
    setGuaranteeEnabled(p.guarantee_enabled);
    setGuaranteeDays(p.guarantee_days);
    setGuaranteeTitle(p.guarantee_title || "");
    setGuaranteeDescription(p.guarantee_description || "");

    setFiles(filesRes.data || []);
    const loadedGifts = await loadDigitalProductGifts(productId);
    setGiftItems(loadedGifts);
    setLoading(false);
    setTimeout(() => {
      dataLoaded.current = true;
    }, 100);
  };

  useEffect(() => {
    loadAll(); /* eslint-disable-next-line */
  }, [productId]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: t("digitalProductEditor.toasts.titleRequired"), variant: "destructive" });
      return;
    }
    if (isPublished && supportType === "none") {
      toast({
        title: t("digitalProductEditor.toasts.needSupport"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("update_digital_product", {
      _id: productId,
      _title: title.trim(),
      _slug: slug.trim(),
      _description: description || null,
      _adjectives: adjectives || null,
      _target_audience: targetAudience || null,
      _price: price,
      _price_before_discount: priceBeforeDiscount,
      _thumbnail_url: thumbnailUrl,
      _banner_video_url: bannerVideoUrl,
      _banner_type: bannerVideoUrl ? "video" : "image",
      _is_published: isPublished,
      _is_unlisted: isUnlisted,
      _display_order: displayOrder,
      _buy_button_text: buyButtonText || null,
      _card_button_text: cardButtonText || null,
      _gift_courses_enabled: giftCoursesEnabled,
      _landing_header: landingHeader || null,
      _landing_subheader: landingSubheader || null,
      _landing_header_color: landingHeaderColor,
      _landing_subheader_color: landingSubheaderColor,
      _landing_header_size: landingHeaderSize,
      _landing_subheader_size: landingSubheaderSize,
      _landing_features: landingFeatures.length ? landingFeatures : null,
      _faqs: faqs.length ? faqs : null,
      _has_individual_support:
        supportType === "individual" || supportType === "both",
      _has_community: supportType === "community" || supportType === "both",
      _community_link:
        supportType === "community" || supportType === "both"
          ? communityLink || null
          : null,
      _has_lifetime_updates: hasLifetimeUpdates,
      _guarantee_enabled: guaranteeEnabled,
      _guarantee_days: guaranteeDays,
      _guarantee_title: guaranteeTitle || null,
      _guarantee_description: guaranteeDescription || null,
    });

    // Sync gifts (all kinds)
    if (!error) {
      await saveDigitalProductGifts(
        productId,
        tenantId,
        giftCoursesEnabled ? giftItems : [],
      );
    }

    setSaving(false);
    if (error) {
      toast({
        title: t("digitalProductEditor.toasts.saveError"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: t("digitalProductEditor.toasts.saveSuccess") });
      setIsDirty(false);
    }
  };

  // Thumbnail upload
  const handleThumbUpload = async (file: File) => {
    setUploadingThumb(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/thumbnails/${productId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("course-assets")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast({
        title: t("digitalProductEditor.toasts.imageError"),
        description: upErr.message,
        variant: "destructive",
      });
      setUploadingThumb(false);
      return;
    }
    const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploadingThumb(false);
    toast({ title: t("digitalProductEditor.toasts.imageUploaded") });
  };

  // Banner video upload (Bunny)
  const uploadBannerVideo = async (file: File) => {
    setUploadingBannerVideo(true);
    setBannerUploadProgress(0);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const oldUrl = bannerVideoUrl;
      const createRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/bunny-create-video`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: file.name }),
        },
      );
      if (!createRes.ok) throw new Error(t("digitalProductEditor.toasts.videoCreateFail"));
      const { videoId, libraryId } = await createRes.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "PUT",
          `https://${projectId}.supabase.co/functions/v1/bunny-upload-chunk?videoId=${videoId}`,
        );
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${session?.access_token}`,
        );
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setBannerUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(t("digitalProductEditor.toasts.uploadFail")));
        xhr.onerror = () => reject(new Error(t("digitalProductEditor.toasts.uploadError")));
        xhr.send(file);
      });
      const newUrl = `bunny:${libraryId}:${videoId}`;
      setBannerVideoUrl(newUrl);
      if (oldUrl && isBunnyUrl(oldUrl) && oldUrl !== newUrl)
        void deleteBunnyVideo(oldUrl);
      toast({ title: t("digitalProductEditor.toasts.videoUploaded") });
    } catch (e: any) {
      toast({
        title: t("digitalProductEditor.toasts.videoError"),
        description: e?.message,
        variant: "destructive",
      });
    }
    setUploadingBannerVideo(false);
    setBannerUploadProgress(0);
  };

  // File upload (single)
  const uploadSingleFile = async (file: File, sortOrder: number) => {
    const ext = file.name.split(".").pop();
    const safeName = file.name.replace(/[^\w.\u0600-\u06FF-]/g, "_");
    const path = `${tenantId}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("digital-products")
      .upload(path, file);
    if (upErr) throw upErr;
    const { error: insErr } = await supabase
      .from("digital_product_files")
      .insert({
        digital_product_id: productId,
        tenant_id: tenantId,
        title: file.name,
        file_url: path,
        file_size_bytes: file.size,
        file_type: file.type || ext || null,
        sort_order: sortOrder,
      });
    if (insErr) throw insErr;
  };

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setUploadingFile(true);
    setUploadQueue({ total: arr.length, done: 0 });
    const baseOrder = files.filter((f) => !f.is_sample).length;
    let successCount = 0;
    for (let i = 0; i < arr.length; i++) {
      try {
        await uploadSingleFile(arr[i], baseOrder + i);
        successCount++;
      } catch (e: any) {
        toast({
          title: t("digitalProductEditor.toasts.fileUploadFail", { name: arr[i].name }),
          description: e?.message || "",
          variant: "destructive",
        });
      }
      setUploadQueue({ total: arr.length, done: i + 1 });
    }
    const { data } = await supabase
      .from("digital_product_files")
      .select("*")
      .eq("digital_product_id", productId)
      .order("sort_order");
    setFiles(data || []);
    if (successCount > 0) {
      toast({
        title: successCount === arr.length ? t("digitalProductEditor.toasts.filesUploaded") : t("digitalProductEditor.toasts.filesPartial", { done: successCount, total: arr.length }),
      });
    }
    setUploadingFile(false);
    setUploadQueue({ total: 0, done: 0 });
  };

  const handleFileUpload = (file: File) => handleFilesUpload([file]);

  const reorderFiles = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const nonSample = files.filter((f) => !f.is_sample);
    const samples = files.filter((f) => f.is_sample);
    const fromIdx = nonSample.findIndex((f) => f.id === draggedId);
    const toIdx = nonSample.findIndex((f) => f.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...nonSample];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((f, i) => ({ ...f, sort_order: i }));
    setFiles([...withOrder, ...samples]);
    // Persist
    await Promise.all(
      withOrder.map((f) =>
        supabase
          .from("digital_product_files")
          .update({ sort_order: f.sort_order })
          .eq("id", f.id),
      ),
    );
  };


  const handleFileDelete = async (file: ProductFile) => {
    if (!confirm(t("digitalProductEditor.confirm.deleteFile", { name: file.title }))) return;
    await supabase.storage.from("digital-products").remove([file.file_url]);
    const { error } = await supabase
      .from("digital_product_files")
      .delete()
      .eq("id", file.id);
    if (error) {
      toast({
        title: t("digitalProductEditor.toasts.error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFiles(files.filter((f) => f.id !== file.id));
      toast({ title: t("digitalProductEditor.toasts.fileDeleted") });
    }
  };

  const handleFileTitleChange = (id: string, newTitle: string) => {
    setFiles(files.map((f) => (f.id === id ? { ...f, title: newTitle } : f)));
  };
  const handleFileTitleSave = async (file: ProductFile) => {
    const { error } = await supabase.rpc("update_digital_product_file_title", {
      _id: file.id,
      _title: file.title,
    });
    if (error) {
      toast({
        title: t("digitalProductEditor.toasts.titleSaveError"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSampleUpload = async (file: File) => {
    setUploadingSample(true);
    try {
      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^\w.\u0600-\u06FF-]/g, "_");
      const path = `${tenantId}/${productId}/sample-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("digital-products")
        .upload(path, file);
      if (upErr) throw upErr;

      // Remove any existing sample file (single sample model)
      const existing = files.filter((f) => f.is_sample);
      for (const old of existing) {
        await supabase.storage.from("digital-products").remove([old.file_url]);
        await supabase.from("digital_product_files").delete().eq("id", old.id);
      }

      const { error: insErr } = await supabase
        .from("digital_product_files")
        .insert({
          digital_product_id: productId,
          tenant_id: tenantId,
          title: file.name,
          file_url: path,
          file_size_bytes: file.size,
          file_type: file.type || ext || null,
          sort_order: files.length,
          is_sample: true,
        });
      if (insErr) throw insErr;

      // If RLS blocks setting is_sample directly, fall back to edge function
      const { data: reloaded } = await supabase
        .from("digital_product_files")
        .select("*")
        .eq("digital_product_id", productId)
        .order("sort_order");
      let list = reloaded || [];
      const justUploaded = list.find((f) => f.file_url === path);
      if (justUploaded && !justUploaded.is_sample) {
        await supabase.functions.invoke("toggle-dp-file-sample", {
          body: { file_id: justUploaded.id, is_sample: true },
        });
        const { data: reloaded2 } = await supabase
          .from("digital_product_files")
          .select("*")
          .eq("digital_product_id", productId)
          .order("sort_order");
        list = reloaded2 || list;
      }
      setFiles(list);
      toast({ title: t("digitalProductEditor.toasts.sampleUploaded") });
    } catch (e: any) {
      toast({
        title: t("digitalProductEditor.toasts.sampleError"),
        description: e?.message || "",
        variant: "destructive",
      });
    } finally {
      setUploadingSample(false);
    }
  };

  const handleRemoveSample = async () => {
    const existing = files.filter((f) => f.is_sample);
    if (existing.length === 0) return;
    if (!confirm(t("digitalProductEditor.confirm.cancelSample"))) return;
    for (const old of existing) {
      await supabase.storage.from("digital-products").remove([old.file_url]);
      await supabase.from("digital_product_files").delete().eq("id", old.id);
    }
    setFiles(files.filter((f) => !f.is_sample));
    toast({ title: t("digitalProductEditor.toasts.sampleCanceled") });
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleBack = () => {
    if (isDirty) setShowUnsavedDialog(true);
    else onBack();
  };

  const tabItems = [
    { value: "product-info", label: t("digitalProductEditor.tabs.productInfo"), icon: FileText },
    { value: "content", label: t("digitalProductEditor.tabs.content"), icon: Package },
    { value: "pricing", label: t("digitalProductEditor.tabs.pricing"), icon: Tag },
    { value: "additional-settings", label: t("digitalProductEditor.tabs.additionalSettings"), icon: Award },
  ];

  if (loading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSave={async () => {
          await handleSave();
          setShowUnsavedDialog(false);
          onBack();
        }}
        onDiscard={() => {
          setShowUnsavedDialog(false);
          setIsDirty(false);
          onBack();
        }}
        onCancel={() => setShowUnsavedDialog(false)}
        saving={saving}
      />

      {/* Sticky Header */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowRight className="w-5 h-5 rotate-180 rtl:rotate-0" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
              {title || t("digitalProductEditor.header.titleFallback")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("digitalProductEditor.header.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {!isPublished && (
            <span
              title={t("digitalProductEditor.header.unpublishedTooltip")}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200"
            >
              {t("digitalProductEditor.header.unpublishedBadge")}
            </span>
          )}

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              dir="ltr"
              id="dp-publish"
            />
            <Label htmlFor="dp-publish" className="text-xs cursor-pointer">
              {t("digitalProductEditor.header.publish")}
            </Label>
          </div>
          {tenantSlug && slug && (
            <div
              role="link"
              onClick={() => openExternal(getMentorSiteUrl(tenantSlug, `/p/${slug}`))}
              className="flex-1 sm:flex-none"
            >
              <Button
                variant="outline"
                type="button"
                className="rounded-xl w-full sm:w-auto text-sm"
              >
                <ExternalLink className="w-4 h-4 ml-1 sm:ml-2" />
                {t("digitalProductEditor.header.preview")}
              </Button>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground  dark:bg-white dark:text-black  border-0 rounded-xl px-4 sm:px-6 shadow-lg flex-1 sm:flex-none text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 ml-1 sm:ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-1 sm:ml-2" />}
            {saving ?  t("digitalProductEditor.header.saving") : t("digitalProductEditor.header.save")}
          </Button>
        </div>
      </div>





      {/* Tabs */}
      <Tabs defaultValue={initialTab || "product-info"} dir={dir}>
        <div className="glass-card rounded-2xl p-1.5 mb-4 sm:mb-6 overflow-x-auto">
          <TabsList className="w-full flex-wrap sm:flex-nowrap h-auto gap-1 bg-transparent p-0">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[80px] sm:min-w-[100px] gap-1.5 sm:gap-2 rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* TAB 1: Product Info */}
        <TabsContent value="product-info">
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* === Media (read-only) === */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("digitalProductEditor.media.heading")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("digitalProductEditor.media.edit")}
                </Button>
              </div>
              <div className={mediaDialogOpen ? "hidden" : "flex flex-wrap gap-4 justify-center"}>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("digitalProductEditor.media.thumbLabel")}
                  </span>
                  <div className="relative h-24 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">{t("digitalProductEditor.media.noImage")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("digitalProductEditor.media.videoLabel")}
                  </span>
                  <div className="relative h-24 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                    {bannerVideoUrl ? (
                      <BunnyVideoThumbnail
                        key={bannerVideoUrl}
                        videoUrl={bannerVideoUrl}
                        alt="banner"
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Play className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">{t("digitalProductEditor.media.noVideo")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

          {/* === Media Edit Dialog === */}
          <InlineEdit open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
            <InlineEditContent
              
              dir={dir}
            >
              <InlineEditHeader>
                <InlineEditTitle>{t("digitalProductEditor.media.dialogTitle")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("digitalProductEditor.media.dialogDesc")}
                </InlineEditDescription>
              </InlineEditHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="thumb"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-40" />
                        <p className="text-[11px]">{t("digitalProductEditor.media.noImageYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("digitalProductEditor.media.thumbCardTitle")}
                    </span>
                  </div>
                  <div className="p-2 flex items-center gap-2 border-t border-border">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleThumbUpload(f);
                          e.target.value = "";
                        }}
                      />
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingThumb
                        ? t("digitalProductEditor.media.uploading")
                        : thumbnailUrl
                          ? t("digitalProductEditor.media.changeImage")
                          : t("digitalProductEditor.media.uploadImage")}
                    </label>
                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl(null)}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        {t("digitalProductEditor.media.deleteImage")}
                      </button>
                    )}
                  </div>
                </div>


                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
                    {bannerVideoUrl ? (
                      <BunnyVideoThumbnail
                        key={bannerVideoUrl}
                        videoUrl={bannerVideoUrl}
                        alt="banner"
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Play className="w-7 h-7 mx-auto mb-1 opacity-40" />
                        <p className="text-[11px]">{t("digitalProductEditor.media.noVideoYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("digitalProductEditor.media.videoCardTitle")}
                    </span>
                  </div>
                  <div className="p-2 flex flex-col gap-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          accept="video/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadBannerVideo(f);
                            e.target.value = "";
                          }}
                        />
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingBannerVideo
                          ? t("digitalProductEditor.media.uploading")
                          : bannerVideoUrl
                            ? t("digitalProductEditor.media.changeVideo")
                            : t("digitalProductEditor.media.uploadVideo")}
                      </label>
                      {bannerVideoUrl && !uploadingBannerVideo && (
                        <button
                          type="button"
                          onClick={() => {
                            const old = bannerVideoUrl;
                            setBannerVideoUrl(null);
                            if (old && isBunnyUrl(old))
                              void deleteBunnyVideo(old);
                          }}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          {t("digitalProductEditor.media.deleteVideo")}
                        </button>
                      )}
                    </div>
                    {uploadingBannerVideo && (
                      <div className="space-y-1">
                        <Progress value={bannerUploadProgress} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground text-center">
                          {bannerUploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              <InlineEditFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMediaDialogOpen(false)}
                >
                  {t("digitalProductEditor.media.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setMediaDialogOpen(false);
                  }}
                  disabled={saving || uploadingThumb || uploadingBannerVideo}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("digitalProductEditor.header.saving") : t("digitalProductEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("digitalProductEditor.info.heading")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductInfoDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("digitalProductEditor.media.edit")}
                </Button>
              </div>
              <div className={productInfoDialogOpen ? "hidden" : "space-y-3 text-sm"}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("digitalProductEditor.info.titleLabel")}
                    </p>
                    <p className="font-medium">
                      {title || (
                        <span className="text-muted-foreground italic">
                          {t("digitalProductEditor.info.notSet")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("digitalProductEditor.info.detailsLabel")}
                  </p>
                  {description ? (
                    <div
                      className="text-xs prose prose-sm max-w-none line-clamp-3 [&_*]:!text-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic text-xs flex items-center gap-1">
                      {t("digitalProductEditor.info.empty")}
                      <Pencil className="w-3 h-3" />
                    </p>
                  )}
                </div>
              </div>
          {/* === Product Info Edit Dialog === */}
          <InlineEdit
            open={productInfoDialogOpen}
            onOpenChange={setProductInfoDialogOpen}
          >
            <InlineEditContent
              className="flex flex-col min-h-[65vh]"
              dir={dir}
            >
              <InlineEditHeader className="shrink-0 space-y-0">
                <InlineEditTitle className="text-base">{t("digitalProductEditor.info.dialogTitle")}</InlineEditTitle>
              </InlineEditHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                  <Label className="sm:w-32 shrink-0 text-xs">{t("digitalProductEditor.info.titleInput")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background dark:bg-input h-9 flex-1"
                  />
                </div>

                <RichTextEditor
                  className="flex-1 min-h-0"
                  editorClassName="h-full"
                  label={t("digitalProductEditor.info.details")}
                  content={description}
                  onChange={setDescription}
                />
              </div>

              <InlineEditFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setProductInfoDialogOpen(false)}
                >
                  {t("digitalProductEditor.media.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setProductInfoDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("digitalProductEditor.header.saving") : t("digitalProductEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("digitalProductEditor.faqs.heading")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLandingDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("digitalProductEditor.media.edit")}
                </Button>
              </div>
              <div className={landingDialogOpen ? "hidden" : "text-sm"}>
                {faqs.length > 0 ? (
                  <div className="space-y-2">
                    {faqs.map((faq, index) => (
                      <div key={index} className="p-3 rounded-lg bg-muted/40">
                        <p className="font-medium text-foreground line-clamp-2">{faq.question}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground text-xs">{t("digitalProductEditor.faqs.empty")}</p>
                  </div>
                )}
              </div>
          {/* === Landing Settings Edit Dialog === */}
          <InlineEdit open={landingDialogOpen} onOpenChange={setLandingDialogOpen}>
            <InlineEditContent
              
              dir={dir}
            >
              <InlineEditHeader>
                <InlineEditTitle>{t("digitalProductEditor.faqs.dialogTitle")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("digitalProductEditor.faqs.dialogDesc")}
                </InlineEditDescription>
              </InlineEditHeader>
              <div className="py-2">
                <LandingSettingsEditor
                  header={landingHeader}
                  subheader={landingSubheader}
                  headerColor={landingHeaderColor}
                  subheaderColor={landingSubheaderColor}
                  headerSize={landingHeaderSize}
                  subheaderSize={landingSubheaderSize}
                  features={landingFeatures}
                  communityLink={communityLink}
                  faqs={faqs}
                  onHeaderChange={setLandingHeader}
                  onSubheaderChange={setLandingSubheader}
                  onHeaderColorChange={setLandingHeaderColor}
                  onSubheaderColorChange={setLandingSubheaderColor}
                  onHeaderSizeChange={setLandingHeaderSize}
                  onSubheaderSizeChange={setLandingSubheaderSize}
                  onFeaturesChange={setLandingFeatures}
                  onCommunityLinkChange={setCommunityLink}
                  onFaqsChange={setFaqs}
                />
              </div>
              <InlineEditFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLandingDialogOpen(false)}
                >
                  {t("digitalProductEditor.media.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setLandingDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("digitalProductEditor.header.saving") : t("digitalProductEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: Content (files) */}
        <TabsContent value="content">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {t("digitalProductEditor.contentTab.heading")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("digitalProductEditor.contentTab.subheading")}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fs = e.target.files;
                  if (fs && fs.length > 0) handleFilesUpload(fs);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="gap-1"
              >
                {uploadingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {uploadingFile && uploadQueue.total > 1
                  ? t("digitalProductEditor.contentTab.uploading", { done: uploadQueue.done, total: uploadQueue.total })
                  : t("digitalProductEditor.contentTab.addFiles")}
              </Button>
            </div>
            {files.filter((f) => !f.is_sample).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t("digitalProductEditor.contentTab.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {files
                  .filter((f) => !f.is_sample)
                  .map((file) => (
                    <div
                      key={file.id}
                      draggable
                      onDragStart={(e) => {
                        setDragFileId(file.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverFileId !== file.id) setDragOverFileId(file.id);
                      }}
                      onDragLeave={() => {
                        if (dragOverFileId === file.id) setDragOverFileId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragFileId) reorderFiles(dragFileId, file.id);
                        setDragFileId(null);
                        setDragOverFileId(null);
                      }}
                      onDragEnd={() => {
                        setDragFileId(null);
                        setDragOverFileId(null);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-background/50 border-border/40 transition-all ${
                        dragFileId === file.id ? "opacity-40" : ""
                      } ${
                        dragOverFileId === file.id && dragFileId !== file.id
                          ? "border-primary border-2 bg-primary/5"
                          : ""
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <Input
                        value={file.title}
                        onChange={(e) =>
                          handleFileTitleChange(file.id, e.target.value)
                        }
                        onBlur={() => handleFileTitleSave(file)}
                        className="flex-1 h-8"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatBytes(file.file_size_bytes)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleFileDelete(file)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: Pricing & Display (merged) */}
        <TabsContent value="pricing">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 sm:px-8 py-6 border-b border-border/60">
                <h2 className="text-xl font-bold text-foreground">{t("courseEditor.priceTab.tabTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("courseEditor.priceTab.tabSubtitle")}</p>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* ── 1. Pricing details ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">{t("courseEditor.priceTab.pricingSection")}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {t("digitalProductEditor.pricing.priceLabel")}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={price || ""}
                          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : 0)}
                          className="h-12 text-lg font-bold bg-muted/40 pe-16"
                        />
                        <span className="absolute inset-y-0 end-4 flex items-center text-xs font-medium text-muted-foreground pointer-events-none">
                          {price > 0
                            ? t("digitalProductEditor.pricing.currency")
                            : t("digitalProductEditor.pricing.free")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 min-h-[20px]">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {t("digitalProductEditor.pricing.oldPriceLabel")}
                        </Label>
                        {!!priceBeforeDiscount && priceBeforeDiscount > price && price > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                            {t("courseEditor.priceTab.savings", {
                              pct: toAr(
                                Math.round(((priceBeforeDiscount - price) / priceBeforeDiscount) * 100),
                              ),
                            })}
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        value={priceBeforeDiscount ?? ""}
                        onChange={(e) =>
                          setPriceBeforeDiscount(e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder={t("digitalProductEditor.pricing.oldPricePlaceholder")}
                        className="h-12 text-lg bg-muted/40"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">{document.documentElement.lang === "en" ? "Prices by country & currency" : "الأسعار حسب الدولة والعملة"}</h3>
                  </div>
                  <PriceListEditor tenantId={tenantId} productType="digital_product" productId={productId} basePrice={price} baseCompareAt={priceBeforeDiscount} />
                </section>

                {/* ── 2. Visibility & order ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6 border-y border-border/60">
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {t("digitalProductEditor.unlisted.heading")}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {isUnlisted
                          ? t("digitalProductEditor.unlisted.hintPrivate")
                          : t("digitalProductEditor.unlisted.hintPublic")}
                      </span>
                    </div>
                    <Switch checked={isUnlisted} onCheckedChange={setIsUnlisted} dir="ltr" />
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {t("courseEditor.priceTab.orderTitle")}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {t("courseEditor.priceTab.orderHint")}
                      </span>
                    </div>
                    <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setDisplayOrder(Math.max(0, Number(displayOrder || 0) - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("digitalProductEditor.display.decrease")}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <Input
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(Number(e.target.value))}
                        className="h-9 w-12 text-center text-sm font-bold bg-transparent border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setDisplayOrder(Number(displayOrder || 0) + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("digitalProductEditor.display.increase")}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </section>

                {/* ── 3. Buttons ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">{t("courseEditor.priceTab.buttonsSection")}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {t("courseEditor.priceTab.buyButtonLabel")}
                      </Label>
                      <Input
                        value={buyButtonText}
                        onChange={(e) => setBuyButtonText(e.target.value)}
                        placeholder={t("digitalProductEditor.display.buyPlaceholder")}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {t("courseEditor.priceTab.cardButtonLabel")}
                      </Label>
                      <Input
                        value={cardButtonText}
                        onChange={(e) => setCardButtonText(e.target.value)}
                        placeholder={t("digitalProductEditor.display.cardPlaceholder")}
                        className="h-11"
                      />
                    </div>
                  </div>
                </section>

                {/* ── 4. Free gift ── */}
                <section className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground text-sm">
                          {t("digitalProductEditor.gift.heading")}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("digitalProductEditor.gift.hint")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={giftCoursesEnabled}
                      onCheckedChange={(v) => {
                        setGiftCoursesEnabled(v);
                        if (!v) setGiftItems([]);
                      }}
                      dir="ltr"
                    />
                  </div>

                  {giftCoursesEnabled && (
                    <div className="mt-5 pt-5 border-t border-primary/15">
                      <GiftPicker
                        tenantId={tenantId}
                        exclude={{ kind: "digital_product", id: productId }}
                        value={giftItems}
                        onChange={setGiftItems}
                      />
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </TabsContent>


        {/* TAB 6: Additional Settings */}
        <TabsContent value="additional-settings">
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold">{t("digitalProductEditor.additional.heading")}</h2>
              <p className="text-xs text-muted-foreground -mt-3">
                {t("digitalProductEditor.additional.subtitle")}
              </p>

              <div className="space-y-4">
                {/* Free sample preview */}
                {(() => {
                  const sample = files.find((f) => f.is_sample) || null;
                  const enabled = !!sample;
                  return (
                    <div className="p-3 rounded-xl bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Gift className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">
                              {t("digitalProductEditor.sample.title")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("digitalProductEditor.sample.desc")}
                            </p>
                          </div>
                        </div>
                        <Switch
                          dir="ltr"
                          checked={enabled}
                          onCheckedChange={(val) => {
                            if (val) {
                              sampleInputRef.current?.click();
                            } else {
                              void handleRemoveSample();
                            }
                          }}
                          disabled={uploadingSample}
                        />
                      </div>

                      <input
                        ref={sampleInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSampleUpload(f);
                          if (sampleInputRef.current)
                            sampleInputRef.current.value = "";
                        }}
                      />

                      {enabled && sample && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/40 bg-primary/5">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {sample.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(sample.file_size_bytes)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sampleInputRef.current?.click()}
                            disabled={uploadingSample}
                            className="gap-1"
                          >
                            {uploadingSample ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {t("digitalProductEditor.sample.replace")}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void handleRemoveSample()}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {!enabled && uploadingSample && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("digitalProductEditor.sample.uploading")}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{t("digitalProductEditor.lifetime.title")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("digitalProductEditor.lifetime.desc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    dir="ltr"
                    checked={hasLifetimeUpdates}
                    onCheckedChange={setHasLifetimeUpdates}
                  />
                </div>

                {/* Support Type */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">
                    {t("digitalProductEditor.support.title")}{" "}
                    {isPublished && <span className="text-destructive">*</span>}
                  </p>
                  {isPublished && supportType === "none" && (
                    <p className="text-xs text-destructive">
                      {t("digitalProductEditor.support.needChoice")}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        value: "community" as const,
                        label: t("digitalProductEditor.support.community.label"),
                        desc: t("digitalProductEditor.support.community.desc"),
                        icon: MessageCircle,
                      },
                      {
                        value: "individual" as const,
                        label: t("digitalProductEditor.support.individual.label"),
                        desc: t("digitalProductEditor.support.individual.desc"),
                        icon: Users,
                      },
                      {
                        value: "both" as const,
                        label: t("digitalProductEditor.support.both.label"),
                        desc: t("digitalProductEditor.support.both.desc"),
                        icon: Users,
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${supportType === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"}`}
                      >
                        <input
                          type="radio"
                          name="dpSupportType"
                          value={opt.value}
                          checked={supportType === opt.value}
                          onChange={() => setSupportType(opt.value)}
                          className="sr-only"
                        />
                        <opt.icon
                          className={`w-5 h-5 shrink-0 ${supportType === opt.value ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {opt.desc}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${supportType === opt.value ? "border-primary" : "border-muted-foreground/30"}`}
                        >
                          {supportType === opt.value && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {(supportType === "community" || supportType === "both") && (
                    <div className="pr-2 space-y-2">
                      <Label className="text-sm">{t("digitalProductEditor.support.communityLinkLabel")}</Label>
                      <Input
                        value={communityLink}
                        onChange={(e) => setCommunityLink(e.target.value)}
                        placeholder="https://t.me/..."
                        dir="ltr"
                      />
                    </div>
                  )}

                  {(supportType === "individual" || supportType === "both") && (
                    <div className="pr-2">
                      {tenantWhatsapp ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800">
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <p className="text-xs">
                            {t("digitalProductEditor.support.whatsappNote")}{" "}
                            <span className="font-bold" dir="ltr">
                              {tenantWhatsapp}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                          {t("digitalProductEditor.support.whatsappMissing")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalProductEditor;
