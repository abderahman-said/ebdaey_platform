import PriceListEditor from "@/components/mentor/PriceListEditor";
import DOMPurify from "dompurify";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { openExternal } from "@/lib/openExternal";
import { isBunnyUrl, deleteBunnyVideo } from "@/lib/bunny";
import BunnyVideoThumbnail from "./BunnyVideoThumbnail";
import OptimizedImage from "@/components/media/OptimizedImage";
import {
  Plus,
  Minus,
  Gift,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Upload,
  Play,
  FileText,
  Headphones,
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
  Paperclip,
  Type,
  Code,
  Download,
  HelpCircle,
  BookOpen,
  Monitor,
  Video,
  ShoppingBag,
  Tag,
  X,
  Check,
  XCircle,
  Edit3,
  Pencil,
  FolderOpen,
  Award,
  TrendingUp,
  MessageCircle,
  Users,
  Lock,
  Loader2,
  Bot,
} from "lucide-react";
import QABotSettings from "./QABotSettings";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "./RichTextEditor";
import ContentBankManager from "./ContentBankManager";

import LandingSettingsEditor from "./LandingSettingsEditor";
import QuizEditor from "./QuizEditor";
import OrderBumpEditor from "./OrderBumpEditor";
import { toAr } from "@/lib/utils";
import SalesOffersBlock from "./SalesOffersBlock";
import { Textarea } from "@/components/ui/textarea";
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import {
  InlineEdit,
  InlineEditContent,
  InlineEditHeader,
  InlineEditTitle,
  InlineEditDescription,
  InlineEditFooter,
} from "./InlineEditPanel";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import GiftPicker from "./GiftPicker";
import {
  GiftItem,
  loadGiftCoursesFor,
  saveGiftCoursesFor,
  fetchGiftOptions,
  GiftOptions,
  GIFT_KIND_LABEL,
} from "@/lib/giftItems";
import { EditorSkeleton } from "./EditorSkeleton";

interface CourseEditorProps {
  courseId: string;
  tenantId: string;
  tenantSlug?: string;
  onBack: () => void;
  initialTab?: string;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  lessons: LessonData[];
}

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  duration_seconds: number | null;
  video_url: string | null;
  pdf_url: string | null;
  audio_url: string | null;
  image_url: string | null;
  text_content: string | null;
  embed_code: string | null;
  download_url: string | null;
  download_filename: string | null;
  file_name: string | null;
  sort_order: number;
  section_id: string;
  is_preview: boolean;
  is_published?: boolean;
  thumbnail_url?: string | null;
}

const CONTENT_TYPE_META = [
  { value: "video", tKey: "video", icon: Play },
  { value: "quiz", tKey: "quiz", icon: HelpCircle },
  { value: "text", tKey: "text", icon: Type },
  { value: "featured_product", tKey: "featuredProduct", icon: ShoppingBag },
] as const;

const CourseEditor = ({
  courseId,
  tenantId,
  tenantSlug,
  onBack,
  initialTab,
}: CourseEditorProps) => {
  const { t, i18n: i18nInst } = useTranslation();
  const dir = i18nInst.dir();
  const isRtl = dir === "rtl";
  const contentTypes = CONTENT_TYPE_META.map((c) => ({
    value: c.value,
    label: t(`courseEditor.contentTypes.${c.tKey}`),
    icon: c.icon,
  }));
  const { toast } = useToast();
  const uploadQueue = useUploadQueue();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseAdjectives, setCourseAdjectives] = useState("");
  const [courseTargetAudience, setCourseTargetAudience] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [priceBeforeDiscount, setPriceBeforeDiscount] = useState<number | null>(
    null,
  );
  const [courseSlug, setCourseSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [buyButtonText, setBuyButtonText] = useState("");
  const [cardButtonText, setCardButtonText] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBannerVideo, setUploadingBannerVideo] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [landingHeader, setLandingHeader] = useState("");
  const [landingSubheader, setLandingSubheader] = useState("");
  const [landingHeaderColor, setLandingHeaderColor] = useState("#000000");
  const [landingSubheaderColor, setLandingSubheaderColor] = useState("#666666");
  const [landingHeaderSize, setLandingHeaderSize] = useState("3xl");
  const [landingSubheaderSize, setLandingSubheaderSize] = useState("lg");
  const [landingFeatures, setLandingFeatures] = useState<
    { text: string; icon: string }[]
  >([]);
  const [communityLink, setCommunityLink] = useState("");
  const [hasCertificate, setHasCertificate] = useState(false);
  const [hasLifetimeUpdates, setHasLifetimeUpdates] = useState(false);
  const [hasCommunity, setHasCommunity] = useState(false);
  const [hasIndividualSupport, setHasIndividualSupport] = useState(false);
  const [supportType, setSupportType] = useState<
    "none" | "community" | "individual" | "both"
  >("none");
  const [tenantWhatsapp, setTenantWhatsapp] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  // Sales page section edit dialogs
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [courseInfoDialogOpen, setCourseInfoDialogOpen] = useState(false);
  const [landingDialogOpen, setLandingDialogOpen] = useState(false);
  // Attachment uploads
  const [uploadingAttachment, setUploadingAttachment] = useState<string | null>(
    null,
  );
  const [attachmentNames, setAttachmentNames] = useState<
    Record<string, string[]>
  >({});
  const [uploadedFileNames, setUploadedFileNames] = useState<
    Record<string, string>
  >({});
  // Section inline edit
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  // Add lesson dialog
  const [addLessonDialog, setAddLessonDialog] = useState<string | null>(null);
  const [newLessonType, setNewLessonType] = useState("video");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonPreview, setNewLessonPreview] = useState(false);
  const [showExtraLessonOptions, setShowExtraLessonOptions] = useState(false);
  // Edit lesson dialog + lesson thumbnail upload
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [uploadingLessonThumb, setUploadingLessonThumb] = useState<
    string | null
  >(null);
  const [giftCourseEnabled, setGiftCourseEnabled] = useState(false);
  const [productOptions, setProductOptions] = useState<GiftOptions>({
    course: [],
    live_course: [],
    digital_product: [],
    consultation: [],
  });
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [guaranteeEnabled, setGuaranteeEnabled] = useState(false);
  const [guaranteeDays, setGuaranteeDays] = useState(7);
  const [guaranteeTitle, setGuaranteeTitle] = useState("");
  const [guaranteeDescription, setGuaranteeDescription] = useState("");
  // Drag-to-reorder state
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragLessonId, setDragLessonId] = useState<string | null>(null);
  const [dragLessonSectionId, setDragLessonSectionId] = useState<string | null>(
    null,
  );
  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const dataLoaded = useRef(false);

  // Mark dirty on any field change after initial load
  const markDirty = useCallback(() => {
    if (dataLoaded.current) setIsDirty(true);
  }, []);

  useEffect(() => {
    if (!dataLoaded.current) return;
    markDirty();
  }, [
    courseTitle,
    courseDesc,
    courseAdjectives,
    courseTargetAudience,
    coursePrice,
    priceBeforeDiscount,
    courseSlug,
    isPublished,
    isUnlisted,
    displayOrder,
    buyButtonText,
    cardButtonText,
    thumbnailUrl,
    bannerVideoUrl,
    landingHeader,
    landingSubheader,
    landingHeaderColor,
    landingSubheaderColor,
    landingHeaderSize,
    landingSubheaderSize,
    communityLink,
    giftCourseEnabled,
    giftItems,
    guaranteeEnabled,
    guaranteeDays,
    guaranteeTitle,
    guaranteeDescription,
    hasCertificate,
    hasLifetimeUpdates,
    supportType,
  ]);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (!tenantId) return;
    fetchGiftOptions(tenantId, { kind: "course", id: courseId }).then(
      setProductOptions,
    );
  }, [tenantId, courseId]);

  const getVideoDuration = (
    src: string,
    revokeObjectUrl = false,
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      let settled = false;

      const cleanup = () => {
        video.onloadedmetadata = null;
        video.ondurationchange = null;
        video.ontimeupdate = null;
        video.onerror = null;
        if (revokeObjectUrl) URL.revokeObjectURL(src);
      };

      const finish = (duration: number) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(Math.max(1, Math.round(duration)));
      };

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const tryResolve = () => {
        const rawDuration = video.duration;
        if (Number.isFinite(rawDuration) && rawDuration > 0) {
          finish(rawDuration);
          return true;
        }
        return false;
      };

      video.preload = "metadata";
      video.crossOrigin = "anonymous";
      video.src = src;

      video.onloadedmetadata = () => {
        if (tryResolve()) return;
        try {
          video.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
          fail("Failed to seek video metadata");
        }
      };

      video.ondurationchange = () => {
        tryResolve();
      };

      video.ontimeupdate = () => {
        tryResolve();
      };

      video.onerror = () => {
        fail("Failed to read video duration");
      };

      window.setTimeout(() => {
        if (!settled) fail("Video duration detection timed out");
      }, 15000);
    });
  };

  const getVideoDurationFromFile = (file: File): Promise<number> => {
    const objectUrl = URL.createObjectURL(file);
    return getVideoDuration(objectUrl, true);
  };

  const getVideoDurationFromUrl = (url: string): Promise<number> => {
    return getVideoDuration(url, false);
  };

  const loadCourse = async () => {
    // Fetch tenant whatsapp
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("whatsapp_number")
      .eq("id", tenantId)
      .single();
    setTenantWhatsapp(tenantData?.whatsapp_number ?? null);

    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (course) {
      setCourseTitle(course.title);
      setCourseDesc(course.description || "");
      setCourseAdjectives((course as any).adjectives || "");
      setCourseTargetAudience((course as any).target_audience || "");
      setCoursePrice(course.price);
      setPriceBeforeDiscount((course as any).price_before_discount ?? null);
      setCourseSlug(course.slug);
      setIsPublished(course.is_published);
      setIsUnlisted((course as any).is_unlisted ?? false);
      setDisplayOrder((course as any).display_order ?? 0);
      setBuyButtonText((course as any).buy_button_text || "");
      setCardButtonText((course as any).card_button_text || "");
      setThumbnailUrl(course.thumbnail_url || null);
      setBannerVideoUrl((course as any).banner_video_url || null);
      setLandingHeader((course as any).landing_header || "");
      setLandingSubheader((course as any).landing_subheader || "");
      setLandingHeaderColor((course as any).landing_header_color || "#000000");
      setLandingSubheaderColor(
        (course as any).landing_subheader_color || "#666666",
      );
      setLandingHeaderSize((course as any).landing_header_size || "3xl");
      setLandingSubheaderSize((course as any).landing_subheader_size || "lg");
      setLandingFeatures((course as any).landing_features || []);
      setCommunityLink((course as any).community_link || "");
      setHasCertificate((course as any).has_certificate ?? false);
      setHasLifetimeUpdates((course as any).has_lifetime_updates ?? false);
      const _hasCommunity = (course as any).has_community ?? false;
      const _hasIndividual = (course as any).has_individual_support ?? false;
      setHasCommunity(_hasCommunity);
      setHasIndividualSupport(_hasIndividual);
      if (_hasCommunity && _hasIndividual) setSupportType("both");
      else if (_hasCommunity) setSupportType("community");
      else if (_hasIndividual) setSupportType("individual");
      else setSupportType("none");
      setFaqs((course as any).faqs || []);
      setGiftCourseEnabled((course as any).gift_course_enabled ?? false);
      // Load gifts (all kinds) from junction table
      const loaded = await loadGiftCoursesFor({ courseId });
      setGiftItems(loaded);
      setGuaranteeEnabled((course as any).guarantee_enabled ?? false);
      setGuaranteeDays((course as any).guarantee_days ?? 7);
      setGuaranteeTitle((course as any).guarantee_title || "");
      setGuaranteeDescription((course as any).guarantee_description || "");
    }

    const { data: sectionsData } = await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");

    if (sectionsData) {
      const withLessons: Section[] = [];
      for (const s of sectionsData) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("*")
          .eq("section_id", s.id)
          .order("sort_order");
        withLessons.push({ ...s, lessons: (lessons || []) as LessonData[] });
      }

      // Backfill missing video durations from Bunny in background, then refresh
      const hasMissing = withLessons.some((sec) =>
        sec.lessons.some(
          (l) =>
            l.content_type === "video" &&
            l.video_url?.startsWith("bunny:") &&
            (!l.duration_seconds || l.duration_seconds === 0),
        ),
      );
      if (hasMissing) {
        supabase.functions
          .invoke("bunny-sync-durations", { body: { course_id: courseId } })
          .then(async ({ data }) => {
            if (data?.updated > 0) {
              const refreshed: Section[] = [];
              for (const s of sectionsData) {
                const { data: lessons } = await supabase
                  .from("lessons")
                  .select("*")
                  .eq("section_id", s.id)
                  .order("sort_order");
                refreshed.push({
                  ...s,
                  lessons: (lessons || []) as LessonData[],
                });
              }
              setSections(refreshed);
            }
          })
          .catch(() => {
            /* silent */
          });
      }

      setSections(withLessons);
      setExpandedSections(new Set(sectionsData.map((s) => s.id)));
    }
    // Mark data as loaded so future changes trigger dirty
    setLoading(false);
    setTimeout(() => {
      dataLoaded.current = true;
    }, 100);
  };

  const saveCourse = async () => {
    setSaving(true);
    try {
      await supabase
        .from("courses")
        .update({
          title: courseTitle,
          description: courseDesc,
          price: coursePrice,
          slug: courseSlug,
          is_published: isPublished,
          thumbnail_url: thumbnailUrl || null,
          adjectives: courseAdjectives,
          target_audience: courseTargetAudience,
          banner_type: bannerVideoUrl ? "video" : "image",
          banner_video_url: bannerVideoUrl || null,
          landing_header: landingHeader || null,
          landing_subheader: landingSubheader || null,
          landing_header_color: landingHeaderColor,
          landing_subheader_color: landingSubheaderColor,
          landing_header_size: landingHeaderSize,
          landing_subheader_size: landingSubheaderSize,
          landing_features: landingFeatures,
          community_link: communityLink || null,
          has_certificate: hasCertificate,
          has_lifetime_updates: hasLifetimeUpdates,
          has_community: supportType === "community" || supportType === "both",
          has_individual_support:
            supportType === "individual" || supportType === "both",
          faqs: faqs,
          price_before_discount: priceBeforeDiscount,
          is_unlisted: isUnlisted,
          display_order: displayOrder,
          buy_button_text: buyButtonText || null,
          card_button_text: cardButtonText || null,
          gift_course_enabled: giftCourseEnabled,
          gift_course_id:
            giftCourseEnabled && giftItems[0]?.kind === "course"
              ? giftItems[0].id
              : null,
          guarantee_enabled: guaranteeEnabled,
          guarantee_days: guaranteeDays,
          guarantee_title: guaranteeTitle || null,
          guarantee_description: guaranteeDescription || null,
        } as any)
        .eq("id", courseId);

      // Sync gift items (all kinds) junction table
      await saveGiftCoursesFor(
        { courseId, tenantId },
        giftCourseEnabled ? giftItems : [],
      );

      toast({ title: t("courseEditor.toasts.saveSuccess") });
      setIsDirty(false);
    } catch {
      toast({ title: t("courseEditor.toasts.saveError"), variant: "destructive" });
    }
    setSaving(false);
  };

  const uploadThumbnail = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${courseId}/thumbnail-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-assets").getPublicUrl(path);
      setThumbnailUrl(publicUrl);
      toast({ title: t("courseEditor.toasts.coverUploadSuccess") });
    } catch (err) {
      console.error("Thumbnail upload error:", err);
      toast({ title: t("courseEditor.toasts.imageUploadError"), variant: "destructive" });
    }
    setUploadingThumbnail(false);
  };

  const uploadBannerVideo = async (file: File) => {
    setUploadingBannerVideo(true);
    setBannerUploadProgress(0);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      // Capture old banner so we can delete it AFTER the new one is uploaded
      const oldBannerUrl = bannerVideoUrl;

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
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || t("courseEditor.toasts.createVideoFailed"));
      }
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
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(t("courseEditor.toasts.videoUploadFailed")));
        };
        xhr.onerror = () => reject(new Error(t("courseEditor.toasts.connectionError")));
        xhr.send(file);
      });

      const newUrl = `bunny:${libraryId}:${videoId}`;
      setBannerVideoUrl(newUrl);
      // New banner ready — clean up old one from Bunny
      if (oldBannerUrl && isBunnyUrl(oldBannerUrl) && oldBannerUrl !== newUrl) {
        void deleteBunnyVideo(oldBannerUrl);
      }
      toast({ title: t("courseEditor.toasts.bannerVideoUploadSuccess") });
    } catch (err) {
      console.error("Banner video upload error:", err);
      toast({ title: t("courseEditor.toasts.videoUploadError"), variant: "destructive" });
    }
    setUploadingBannerVideo(false);
    setBannerUploadProgress(0);
  };

  const addSection = async () => {
    const { data } = await supabase
      .from("course_sections")
      .insert({
        course_id: courseId,
        tenant_id: tenantId,
        title: "قسم جديد",
        sort_order: sections.length,
      })
      .select()
      .single();
    if (data) {
      setSections((prev) => [...prev, { ...data, lessons: [] }]);
      setExpandedSections((prev) => new Set([...prev, data.id]));
      setTimeout(() => {
        const el = document.getElementById(`section-${data.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "end" });
          el.style.transition = "box-shadow 0.3s";
          el.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.5)";
          setTimeout(() => {
            el.style.boxShadow = "";
          }, 2000);
        }
      }, 300);
    }
  };

  const updateSection = async (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
    await supabase
      .from("course_sections")
      .update({ title })
      .eq("id", sectionId);
  };

  const deleteSection = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const bunnyUrls = (section?.lessons || [])
      .map((l) => l.video_url)
      .filter((u): u is string => !!u && isBunnyUrl(u));
    await supabase.from("lessons").delete().eq("section_id", sectionId);
    await supabase.from("course_sections").delete().eq("id", sectionId);
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (bunnyUrls.length) void deleteBunnyVideo(bunnyUrls);
  };

  const addLesson = async (
    sectionId: string,
    contentType: string,
    title: string,
    description: string,
    isPreview: boolean,
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    const { data } = await supabase
      .from("lessons")
      .insert({
        section_id: sectionId,
        tenant_id: tenantId,
        title: title || "درس جديد",
        content_type: contentType,
        sort_order: section?.lessons.length || 0,
        description: description || null,
        is_preview: isPreview,
        is_published: false,
      })
      .select()
      .single();
    if (data) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: [...s.lessons, data as LessonData] }
            : s,
        ),
      );
    }
  };

  const updateLesson = async (
    lessonId: string,
    updates: Partial<LessonData>,
  ) => {
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) =>
          l.id === lessonId ? { ...l, ...updates } : l,
        ),
      })),
    );
    await supabase.from("lessons").update(updates).eq("id", lessonId);
  };

  const deleteLesson = async (lessonId: string, sectionId: string) => {
    const oldVideo = sections
      .find((s) => s.id === sectionId)
      ?.lessons.find((l) => l.id === lessonId)?.video_url;
    await supabase.from("lessons").delete().eq("id", lessonId);
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
          : s,
      ),
    );
    if (oldVideo && isBunnyUrl(oldVideo)) void deleteBunnyVideo(oldVideo);
  };

  const uploadFile = async (lessonId: string, file: File, type: string) => {
    const uniqueId = `${lessonId}-${Date.now()}`;
    const originalFileName = file.name;
    const localPreviewUrl =
      type === "image" || type === "video"
        ? URL.createObjectURL(file)
        : undefined;
    uploadQueue.enqueue(
      uniqueId,
      file.name,
      async (_task, onProgress, signal) => {
        if (type === "video") {
          // Capture the OLD video URL so we can delete it from Bunny AFTER the new one is saved
          const oldVideoUrl =
            sections.flatMap((s) => s.lessons).find((l) => l.id === lessonId)
              ?.video_url || null;
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

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
          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            throw new Error(errData.error || t("courseEditor.toasts.createVideoFailed"));
          }
          const { videoId, libraryId } = await createRes.json();

          // Upload via server-side proxy to keep API key secure
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

            signal.addEventListener("abort", () => xhr.abort());

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(t("courseEditor.toasts.videoUploadFailed")));
            };
            xhr.onerror = () => reject(new Error(t("courseEditor.toasts.connectionError")));
            xhr.onabort = () => reject(new Error(t("courseEditor.toasts.uploadCancelled")));
            xhr.send(file);
          });

          const bunnyUrl = `bunny:${libraryId}:${videoId}`;
          const lessonUpdates: Partial<LessonData> = {
            video_url: bunnyUrl,
            file_name: originalFileName,
          };
          try {
            lessonUpdates.duration_seconds =
              await getVideoDurationFromFile(file);
          } catch {
            console.warn("Could not detect video duration");
          }
          // If the lesson still has the default title, rename it to the uploaded file name (sans extension)
          const currentLesson = sections
            .flatMap((s) => s.lessons)
            .find((l) => l.id === lessonId);
          if (currentLesson && (!currentLesson.title || currentLesson.title.trim() === "درس جديد")) {
            const nameFromFile = originalFileName.replace(/\.[^./\\]+$/, "").trim();
            if (nameFromFile) lessonUpdates.title = nameFromFile;
          }
          await updateLesson(lessonId, lessonUpdates);
          setUploadedFileNames((prev) => ({
            ...prev,
            [lessonId]: originalFileName,
          }));
          // New video saved successfully — now safe to delete the old Bunny video (orphan cleanup)
          if (
            oldVideoUrl &&
            isBunnyUrl(oldVideoUrl) &&
            oldVideoUrl !== bunnyUrl
          ) {
            void deleteBunnyVideo(oldVideoUrl);
          }
          return { previewUrl: localPreviewUrl, fileType: "video" };
        } else {
          const ext = file.name.split(".").pop();
          const path = `${tenantId}/${courseId}/${lessonId}.${ext}`;

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(
              "POST",
              `${supabaseUrl}/storage/v1/object/course-assets/${path}`,
            );
            xhr.setRequestHeader(
              "Authorization",
              `Bearer ${session?.access_token}`,
            );
            xhr.setRequestHeader("x-upsert", "true");

            signal.addEventListener("abort", () => xhr.abort());

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(t("courseEditor.toasts.fileUploadFailed")));
            };
            xhr.onerror = () => reject(new Error(t("courseEditor.toasts.connectionError")));
            xhr.onabort = () => reject(new Error(t("courseEditor.toasts.uploadCancelled")));
            xhr.send(file);
          });

          const {
            data: { publicUrl },
          } = supabase.storage.from("course-assets").getPublicUrl(path);
          const urlField =
            type === "pdf"
              ? "pdf_url"
              : type === "audio"
                ? "audio_url"
                : "image_url";
          await updateLesson(lessonId, {
            [urlField]: publicUrl,
            file_name: originalFileName,
          } as Partial<LessonData>);
          setUploadedFileNames((prev) => ({
            ...prev,
            [lessonId]: originalFileName,
          }));
          return {
            previewUrl: type === "image" ? localPreviewUrl : undefined,
            fileType: type,
          };
        }
      },
    );
  };

  const uploadAttachment = async (lessonId: string, file: File) => {
    setUploadingAttachment(lessonId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${courseId}/${lessonId}/attachment-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      setAttachmentNames((prev) => ({
        ...prev,
        [lessonId]: [...(prev[lessonId] || []), file.name],
      }));
      toast({ title: t("courseEditor.toasts.attachmentUploadSuccess") });
    } catch (err) {
      toast({ title: t("courseEditor.toasts.attachmentUploadError"), variant: "destructive" });
    }
    setUploadingAttachment(null);
  };

  const uploadLessonThumbnail = async (lessonId: string, file: File) => {
    setUploadingLessonThumb(lessonId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${courseId}/lessons/${lessonId}-thumb-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-assets").getPublicUrl(path);
      await updateLesson(lessonId, { thumbnail_url: publicUrl } as any);
      toast({ title: t("courseEditor.toasts.imageUploadSuccess") });
    } catch (err) {
      console.error("Lesson thumbnail upload error:", err);
      toast({ title: t("courseEditor.toasts.imageUploadError"), variant: "destructive" });
    }
    setUploadingLessonThumb(null);
  };

  // --- Drag-to-reorder handlers ---
  const handleSectionDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragSectionId || dragSectionId === targetId) return;
    const fromIdx = sections.findIndex((s) => s.id === dragSectionId);
    const toIdx = sections.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(fromIdx, 1);
    newSections.splice(toIdx, 0, moved);
    setSections(newSections);
  };

  const handleSectionDrop = async () => {
    setDragSectionId(null);
    for (let i = 0; i < sections.length; i++) {
      await supabase
        .from("course_sections")
        .update({ sort_order: i })
        .eq("id", sections[i].id);
    }
  };

  const handleLessonDragOver = (
    e: React.DragEvent,
    sectionId: string,
    targetLessonId: string,
  ) => {
    e.preventDefault();
    if (!dragLessonId || !dragLessonSectionId) return;
    // Only reorder within same section for simplicity
    if (dragLessonSectionId !== sectionId) return;
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const fromIdx = section.lessons.findIndex((l) => l.id === dragLessonId);
    const toIdx = section.lessons.findIndex((l) => l.id === targetLessonId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const newLessons = [...section.lessons];
    const [moved] = newLessons.splice(fromIdx, 1);
    newLessons.splice(toIdx, 0, moved);
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, lessons: newLessons } : s)),
    );
  };

  const handleLessonDrop = async (sectionId: string) => {
    setDragLessonId(null);
    setDragLessonSectionId(null);
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    for (let i = 0; i < section.lessons.length; i++) {
      await supabase
        .from("lessons")
        .update({ sort_order: i })
        .eq("id", section.lessons[i].id);
    }
  };

  const tabItems = [
    { value: "product-info", label: t("courseEditor.tabs.productInfo"), icon: FileText },
    { value: "content", label: t("courseEditor.tabs.content"), icon: BookOpen },
    { value: "pricing", label: t("courseEditor.tabs.pricing"), icon: Tag },
    { value: "content-bank", label: t("courseEditor.tabs.contentBank"), icon: FolderOpen },
    { value: "ai-bot", label: t("courseEditor.tabs.aiBot"), icon: Bot },
    { value: "additional-settings", label: t("courseEditor.tabs.additionalSettings"), icon: Award },
  ];

  const handleBack = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onBack();
    }
  };

  const handleDialogSave = async () => {
    await saveCourse();
    setShowUnsavedDialog(false);
    onBack();
  };

  const handleDialogDiscard = () => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    onBack();
  };

  if (loading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={() => setShowUnsavedDialog(false)}
        saving={saving}
      />

      {/* Header - Sticky */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />}
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground">
              {courseTitle || t("courseEditor.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("courseEditor.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {!isPublished && (
            <span
              title={t("courseEditor.unpublishedTooltip")}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200"
            >
              {t("courseEditor.unpublishedBadge")}
            </span>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
            <Switch
              checked={isPublished}
              onCheckedChange={async (v) => {
                const prev = isPublished;
                setIsPublished(v);
                const { error } = await supabase
                  .from("courses")
                  .update({ is_published: v } as any)
                  .eq("id", courseId);
                if (error) {
                  setIsPublished(prev);
                  toast({ title: t("courseEditor.toasts.saveError"), variant: "destructive" });
                } else {
                  toast({ title: t("courseEditor.toasts.saveSuccess") });
                }
              }}
              dir="ltr"
              id="course-publish"
            />
            <Label htmlFor="course-publish" className="text-xs cursor-pointer">
              {t("courseEditor.publish")}
            </Label>
          </div>

          {tenantSlug && courseSlug && (
            <div
              role="link"
              onClick={() => openExternal(getMentorSiteUrl(tenantSlug, `/c/${courseSlug}`))}
              className="flex-1 sm:flex-none"
            >
              <Button
                variant="outline"
                type="button"
                className="rounded-xl w-full sm:w-auto text-sm"
              >
                <ExternalLink className="w-4 h-4 ml-1 sm:ml-2" />
                {t("courseEditor.preview")}
              </Button>
            </div>
          )}
          <Button
            onClick={saveCourse}
            disabled={saving}
            className="gradient-primary text-primary-foreground dark:bg-white dark:text-black border-0 rounded-xl px-4 sm:px-6 shadow-lg flex-1 sm:flex-none text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 ml-1 sm:ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-1 sm:ml-2" />}
            {saving ?  t("courseEditor.saving") : t("courseEditor.save")}
          </Button>
        </div>
      </div>





      {/* Tabs */}
      <Tabs defaultValue={initialTab || "product-info"} dir={dir as "rtl" | "ltr"}>
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
                  <span className="">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Product Info Tab - Banner, Title, Slug, Description */}
        <TabsContent value="product-info">
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* === Media (read-only) === */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("courseEditor.media.sectionTitle")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("courseEditor.media.edit")}
                </Button>
              </div>
              <div className={mediaDialogOpen ? "hidden" : "flex flex-wrap gap-4 justify-center"}>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("courseEditor.media.salesPageImage")}
                  </span>
                  <div className="relative h-24 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                    {thumbnailUrl ? (
                      <OptimizedImage
                        src={thumbnailUrl}
                        alt={t("courseEditor.media.salesPageImage")}
                        className="w-full h-full object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">{t("courseEditor.media.noImage")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("courseEditor.media.bannerVideo")}
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
                        <p className="text-xs">{t("courseEditor.media.noVideo")}</p>
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
                <InlineEditTitle>{t("courseEditor.media.dialogTitle")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("courseEditor.media.dialogDesc")}
                </InlineEditDescription>
              </InlineEditHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
                    {thumbnailUrl ? (
                      <OptimizedImage
                        src={thumbnailUrl}
                        alt={t("courseEditor.media.salesPageImage")}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-40" />
                        <p className="text-[11px]">{t("courseEditor.media.noImageYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("courseEditor.media.imageLabel")}
                    </span>
                  </div>
                  <div className="p-2 flex items-center gap-2 border-t border-border">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadThumbnail(file);
                          e.target.value = "";
                        }}
                      />
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingThumbnail
                        ? t("courseEditor.media.uploading")
                        : thumbnailUrl
                          ? t("courseEditor.media.changeImage")
                          : t("courseEditor.media.uploadImage")}
                    </label>
                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl(null)}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        {t("courseEditor.media.deleteImage")}
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
                        <p className="text-[11px]">{t("courseEditor.media.noVideoYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("courseEditor.media.videoLabel")}
                    </span>
                  </div>
                  <div className="p-2 flex flex-col gap-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadBannerVideo(file);
                            e.target.value = "";
                          }}
                        />
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingBannerVideo
                          ? t("courseEditor.media.uploading")
                          : bannerVideoUrl
                            ? t("courseEditor.media.changeVideo")
                            : t("courseEditor.media.uploadVideo")}
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
                          {t("courseEditor.media.deleteVideo")}
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
                  {t("courseEditor.common.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await saveCourse();
                    setMediaDialogOpen(false);
                  }}
                  disabled={
                    saving || uploadingThumbnail || uploadingBannerVideo
                  }
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("courseEditor.common.saving") : t("courseEditor.common.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("courseEditor.courseInfo.sectionTitle")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourseInfoDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("courseEditor.media.edit")}
                </Button>
              </div>
              <div className={courseInfoDialogOpen ? "hidden" : "space-y-3 text-sm"}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("courseEditor.courseInfo.titleLabel")}
                    </p>
                    <p className="font-medium">
                      {courseTitle || (
                        <span className="text-muted-foreground italic">
                          {t("courseEditor.courseInfo.notSet")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("courseEditor.courseInfo.detailsLabel")}
                  </p>
                  {courseDesc ? (
                    <div
                      className="text-xs prose prose-sm max-w-none line-clamp-3 [&_*]:!text-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(courseDesc) }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic text-xs flex items-center gap-1">
                      {t("courseEditor.courseInfo.none")}
                      <Pencil className="w-3 h-3" />
                    </p>
                  )}
                </div>
              </div>
          {/* === Course Info Edit Dialog === */}
          <InlineEdit
            open={courseInfoDialogOpen}
            onOpenChange={setCourseInfoDialogOpen}
          >
            <InlineEditContent
              className="flex flex-col min-h-[65vh]"
              dir={dir}
            >
              <InlineEditHeader className="shrink-0 space-y-0">
                <InlineEditTitle className="text-base">{t("courseEditor.courseInfo.dialogTitle")}</InlineEditTitle>
              </InlineEditHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                  <Label className="sm:w-32 shrink-0 text-xs">{t("courseEditor.courseInfo.titleLabel")}</Label>
                  <Input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="bg-background dark:bg-input h-9 flex-1"
                  />
                </div>

                <RichTextEditor
                  className="flex-1 min-h-0"
                  editorClassName="h-full"
                  label={t("courseEditor.courseInfo.detailsLabel")}
                  content={courseDesc}
                  onChange={setCourseDesc}
                />
              </div>

              <InlineEditFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCourseInfoDialogOpen(false)}
                >
                  {t("courseEditor.common.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await saveCourse();
                    setCourseInfoDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("courseEditor.common.saving") : t("courseEditor.common.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("courseEditor.faqs.sectionTitle")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLandingDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("courseEditor.media.edit")}
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
                    <p className="text-muted-foreground text-xs">{t("courseEditor.faqs.empty")}</p>
                  </div>
                )}
              </div>
          {/* === Landing Settings Edit Dialog === */}
          <InlineEdit open={landingDialogOpen} onOpenChange={setLandingDialogOpen}>
            <InlineEditContent
              
              dir={dir}
            >
              <InlineEditHeader>
                <InlineEditTitle>{t("courseEditor.faqs.dialogTitle")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("courseEditor.faqs.dialogDesc")}
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
                  {t("courseEditor.common.cancel")}
                </Button>
                <Button
                  onClick={async () => {
                    await saveCourse();
                    setLandingDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("courseEditor.common.saving") : t("courseEditor.common.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab - Sections & Lessons */}
        <TabsContent value="content">
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t("courseEditor.curriculum.title")}</h2>
              <Button onClick={addSection} variant="outline" size="sm">
                <Plus className="w-4 h-4 ml-2" />
                {t("courseEditor.curriculum.newSection")}
              </Button>
            </div>

            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  id={`section-${section.id}`}
                  key={section.id}
                  className={`glass-card rounded-2xl overflow-hidden transition-opacity ${dragSectionId === section.id ? "opacity-50" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragSectionId(section.id);
                  }}
                  onDragOver={(e) => handleSectionDragOver(e, section.id)}
                  onDragEnd={handleSectionDrop}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleSectionDrop();
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0 hidden sm:block" />

                      <FolderOpen className="w-5 h-5 text-primary shrink-0" />

                      {editingSectionId === section.id ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                          <Input
                            value={editingSectionTitle}
                            onChange={(e) =>
                              setEditingSectionTitle(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateSection(section.id, editingSectionTitle);
                                setEditingSectionId(null);
                              }
                              if (e.key === "Escape") setEditingSectionId(null);
                            }}
                            className="flex-1 border border-border bg-background font-bold text-base p-2 h-auto focus-visible:ring-2 focus-visible:ring-primary"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                updateSection(section.id, editingSectionTitle);
                                setEditingSectionId(null);
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 border border-green-200 rounded-md"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingSectionId(null)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 border border-red-200 rounded-md"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 font-bold text-base truncate">
                            {section.title}
                          </span>
                        </>
                      )}
                    </div>

                    {editingSectionId !== section.id && (
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setEditingSectionTitle(section.title);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 border border-blue-200 rounded-md"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNewLessonTitle("");
                            setNewLessonDescription("");
                            setNewLessonPreview(false);
                            setNewLessonType("video");
                            setAddLessonDialog(section.id);
                          }}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1.5 border border-green-200 rounded-md text-xs font-medium gap-1 h-auto"
                        >
                          <Plus className="w-4 h-4" />
                          {t("courseEditor.lessons.addLesson")}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const s = new Set(expandedSections);
                            s.has(section.id)
                              ? s.delete(section.id)
                              : s.add(section.id);
                            setExpandedSections(s);
                          }}
                        >
                          {expandedSections.has(section.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setSectionToDelete(section.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {expandedSections.has(section.id) && (
                    <div className="p-4 space-y-3">
                      {section.lessons.map((lesson, lessonIdx) => (
                        <div
                          key={lesson.id}
                          className={`relative border border-border rounded-xl p-5 transition-opacity ${dragLessonId === lesson.id ? "opacity-50" : ""}`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = "move";
                            setDragLessonId(lesson.id);
                            setDragLessonSectionId(section.id);
                          }}
                          onDragOver={(e) => {
                            e.stopPropagation();
                            handleLessonDragOver(e, section.id, lesson.id);
                          }}
                          onDragEnd={() => handleLessonDrop(section.id)}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLessonDrop(section.id);
                          }}
                        >
                          {lesson.is_preview && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {t("courseEditor.lessons.freePreview")}
                            </span>
                          )}
                          {/* Compact row: actions on the right (RTL), title in middle, thumbnail on the left */}
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-1 shrink-0">
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                {t("courseEditor.lessons.publishLesson")}
                              </Label>
                              <Switch
                                dir="ltr"
                                aria-label={t("courseEditor.lessons.publishLesson")}
                                checked={lesson.is_published ?? false}
                                onCheckedChange={(v) =>
                                  updateLesson(lesson.id, {
                                    is_published: v,
                                  } as any)
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive h-8 w-8"
                                onClick={() =>
                                  deleteLesson(lesson.id, section.id)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingLessonId(lesson.id)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex-1 min-w-0 flex items-center justify-end gap-2 text-end">
                              <p className="text-sm font-medium truncate">
                                {lesson.title || t("courseEditor.lessons.untitled")}
                              </p>
                              <span className="shrink-0 inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                                {lessonIdx + 1}
                              </span>
                            </div>



                            <div className="relative w-48 h-32 sm:w-64 sm:h-44 rounded-xl overflow-hidden border border-border bg-muted shrink-0">
                              {lesson.content_type === "video" &&
                              lesson.video_url &&
                              isBunnyUrl(lesson.video_url) ? (
                                <BunnyVideoThumbnail
                                  videoUrl={lesson.video_url}
                                  alt={lesson.title}
                                  className="w-full h-full"
                                />
                              ) : lesson.content_type === "image" &&
                                lesson.image_url ? (
                                <OptimizedImage
                                  src={lesson.image_url}
                                  alt={lesson.title}
                                  className="w-full h-full object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              ) : lesson.thumbnail_url ? (
                                <OptimizedImage
                                  src={lesson.thumbnail_url}
                                  alt={lesson.title}
                                  className="w-full h-full object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  {(() => {
                                    const Icon =
                                      contentTypes.find(
                                        (c) => c.value === lesson.content_type,
                                      )?.icon ?? ImageIcon;
                                    return <Icon className="w-12 h-12" />;
                                  })()}
                                </div>
                              )}
                              {(() => {
                                const activeTask = Array.from(
                                  uploadQueue.tasks.entries(),
                                ).find(
                                  ([key, task]) =>
                                    key.startsWith(lesson.id + "-") &&
                                    (task.status === "uploading" ||
                                      task.status === "queued"),
                                )?.[1];
                                if (!activeTask) return null;
                                return (
                                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3">
                                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                    <div className="w-full">
                                      <Progress
                                        value={activeTask.progress}
                                        className="h-2"
                                      />
                                    </div>
                                    <p className="text-xs font-mono font-medium text-foreground">
                                      {activeTask.status === "queued"
                                        ? t("courseEditor.lessons.queued")
                                        : `${Math.round(activeTask.progress)}%`}
                                    </p>
                                  </div>
                                );
                              })()}
                              {!["featured_product", "quiz"].includes(
                                lesson.content_type,
                              ) && (
                                <label
                                  className="absolute top-2 left-2 w-10 h-10 rounded-lg bg-background/90 border border-border flex items-center justify-center cursor-pointer hover:bg-background transition-colors"
                                  title={t("courseEditor.lessons.uploadLessonContent")}
                                >
                                  <input
                                    type="file"
                                    accept={
                                      lesson.content_type === "video"
                                        ? "video/*"
                                        : lesson.content_type === "pdf"
                                          ? ".pdf"
                                          : lesson.content_type === "audio"
                                            ? "audio/*"
                                            : lesson.content_type === "image"
                                              ? "image/*"
                                              : undefined
                                    }
                                    className="hidden"
                                    disabled={
                                      ![
                                        "video",
                                        "pdf",
                                        "audio",
                                        "image",
                                      ].includes(lesson.content_type)
                                    }
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f)
                                        uploadFile(
                                          lesson.id,
                                          f,
                                          lesson.content_type,
                                        );
                                      e.target.value = "";
                                    }}
                                  />
                                  {Array.from(uploadQueue.tasks.entries())
                                    .filter(([key]) =>
                                      key.startsWith(lesson.id + "-"),
                                    )
                                    .some(
                                      ([, task]) =>
                                        task.status === "uploading" ||
                                        task.status === "queued",
                                    ) ? (
                                    <Upload className="w-5 h-5 animate-bounce" />
                                  ) : (
                                    <Upload className="w-5 h-5" />
                                  )}
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Edit dialog: all detail editing happens here */}
                          <Dialog
                            open={editingLessonId === lesson.id}
                            onOpenChange={(o) => {
                              if (!o) setEditingLessonId(null);
                            }}
                          >
                            <DialogContent
                              className="max-w-3xl max-h-[90vh] overflow-y-auto"
                              dir={dir}
                            >
                              <DialogHeader>
                                <DialogTitle>{t("courseEditor.lessons.editLesson")}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-2 w-full sm:flex-1">
                                    <Input
                                      value={lesson.title}
                                      onChange={(e) =>
                                        updateLesson(lesson.id, {
                                          title: e.target.value,
                                        })
                                      }
                                      className="flex-1"
                                      placeholder={t("courseEditor.lessons.titlePlaceholder")}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Select
                                      value={lesson.content_type}
                                      onValueChange={(v) =>
                                        updateLesson(lesson.id, {
                                          content_type: v,
                                        })
                                      }

                                    >
                                      <SelectTrigger className="flex-1 sm:flex-none sm:w-48">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {contentTypes.map((ct) => {
                                          const Icon = ct.icon;
                                          return (
                                            <SelectItem
                                              key={ct.value}
                                              value={ct.value}
                                            >
                                              <span className="flex items-center gap-2">
                                                <Icon className="w-4 h-4 shrink-0" />
                                                {ct.label}
                                              </span>
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Description & Preview toggle */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <div className="flex-1">
                                    <Input
                                      value={lesson.description || ""}
                                      onChange={(e) =>
                                        updateLesson(lesson.id, {
                                          description: e.target.value,
                                        } as any)
                                      }
                                      placeholder={t("courseEditor.lessons.descriptionPlaceholder")}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                      {t("courseEditor.lessons.freePreview")}
                                    </Label>
                                    <Switch
                                      dir="ltr"
                                      checked={lesson.is_preview || false}
                                      onCheckedChange={(v) =>
                                        updateLesson(lesson.id, {
                                          is_preview: v,
                                        } as any)
                                      }
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                      {t("courseEditor.lessons.published")}
                                    </Label>
                                    <Switch
                                      dir="ltr"
                                      checked={lesson.is_published ?? false}
                                      onCheckedChange={(v) =>
                                        updateLesson(lesson.id, {
                                          is_published: v,
                                        } as any)
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Content inputs based on type */}
                                {["video", "pdf", "audio", "image"].includes(
                                  lesson.content_type,
                                ) && (
                                  <>
                                    {/* Upload in progress indicator */}
                                    {Array.from(uploadQueue.tasks.entries())
                                      .filter(([key]) =>
                                        key.startsWith(lesson.id + "-"),
                                      )
                                      .some(
                                        ([, task]) =>
                                          task.status === "uploading" ||
                                          task.status === "queued",
                                      ) && (
                                      <div className="rounded-lg border border-border overflow-hidden bg-muted/30 p-3 flex items-center gap-3 mt-1 animate-pulse">
                                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                                          <Upload className="w-4 h-4 text-muted-foreground animate-bounce" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-muted-foreground">
                                            {t("courseEditor.lessons.uploadingFile")}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {Math.round(
                                              Array.from(
                                                uploadQueue.tasks.entries(),
                                              )
                                                .filter(([key]) =>
                                                  key.startsWith(
                                                    lesson.id + "-",
                                                  ),
                                                )
                                                .find(
                                                  ([, task]) =>
                                                    task.status === "uploading",
                                                )?.[1]?.progress || 0,
                                            )}
                                            %
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    {/* File preview after upload */}
                                    {lesson.content_type === "image" &&
                                      lesson.image_url && (
                                        <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden bg-green-50/50 dark:bg-green-950/20 p-2.5 flex items-center gap-3 mt-1">
                                          <OptimizedImage
                                            src={lesson.image_url}
                                            alt={lesson.title}
                                            className="w-12 h-12 rounded object-cover shrink-0 border border-border"
                                            sizes="48px"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {lesson.file_name ||
                                                uploadedFileNames[lesson.id] ||
                                                decodeURIComponent(
                                                  lesson.image_url
                                                    .split("/")
                                                    .pop() || t("courseEditor.lessons.image"),
                                                )}
                                            </p>
                                            <p className="text-[10px] text-green-600 flex items-center gap-1">
                                              <Check className="w-3 h-3" /> {t("courseEditor.lessons.uploadedSuccessfully")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    {lesson.content_type === "video" &&
                                      lesson.video_url && (
                                        <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden bg-green-50/50 dark:bg-green-950/20 p-2.5 flex items-center gap-3 mt-1">
                                          {isBunnyUrl(lesson.video_url!) ? (
                                            <BunnyVideoThumbnail
                                              videoUrl={lesson.video_url!}
                                              alt={lesson.title}
                                              className="w-32 h-20 rounded shrink-0 border border-border"
                                            />
                                          ) : (
                                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                                              <Play className="w-5 h-5 text-primary" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {lesson.file_name ||
                                                uploadedFileNames[lesson.id] ||
                                                lesson.title ||
                                                t("courseEditor.lessons.video")}
                                            </p>
                                            <p className="text-[10px] text-green-600 flex items-center gap-1">
                                              <Check className="w-3 h-3" /> {t("courseEditor.lessons.uploadedSuccessfully")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    {lesson.content_type === "audio" &&
                                      lesson.audio_url && (
                                        <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden bg-green-50/50 dark:bg-green-950/20 p-2.5 flex items-center gap-3 mt-1">
                                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                                            <Headphones className="w-5 h-5 text-primary" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {lesson.file_name ||
                                                uploadedFileNames[lesson.id] ||
                                                decodeURIComponent(
                                                  lesson.audio_url
                                                    .split("/")
                                                    .pop() || t("courseEditor.lessons.audio"),
                                                )}
                                            </p>
                                            <p className="text-[10px] text-green-600 flex items-center gap-1">
                                              <Check className="w-3 h-3" /> {t("courseEditor.lessons.uploadedSuccessfully")}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    {lesson.content_type === "pdf" &&
                                      lesson.pdf_url && (
                                        <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden bg-green-50/50 dark:bg-green-950/20 p-2.5 flex items-center gap-3 mt-1">
                                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
                                            <FileText className="w-5 h-5 text-red-500" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {lesson.file_name ||
                                                uploadedFileNames[lesson.id] ||
                                                decodeURIComponent(
                                                  lesson.pdf_url
                                                    .split("/")
                                                    .pop() || t("courseEditor.lessons.pdfFile"),
                                                )}
                                            </p>
                                            <p className="text-[10px] text-green-600 flex items-center gap-1">
                                              <Check className="w-3 h-3" /> {t("courseEditor.lessons.uploadedSuccessfully")}
                                            </p>
                                          </div>
                                          <a
                                            href={lesson.pdf_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0"
                                          >
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              type="button"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                            </Button>
                                          </a>
                                        </div>
                                      )}
                                  </>
                                )}

                                {lesson.content_type === "text" && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("courseEditor.lessons.textContent")}
                                    </Label>
                                    <RichTextEditor
                                      label=""
                                      content={lesson.text_content || ""}
                                      onChange={(val) =>
                                        updateLesson(lesson.id, {
                                          text_content: val,
                                        } as any)
                                      }
                                    />
                                  </div>
                                )}

                                {lesson.content_type === "embed" && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("courseEditor.lessons.embedCode")}
                                    </Label>
                                    <Textarea
                                      value={lesson.embed_code || ""}
                                      onChange={(e) =>
                                        updateLesson(lesson.id, {
                                          embed_code: e.target.value,
                                        } as any)
                                      }
                                      rows={4}
                                      dir="ltr"
                                      placeholder='<iframe src="https://..." ...></iframe>'
                                      className="font-mono text-xs"
                                    />
                                  </div>
                                )}

                                {lesson.content_type === "download" && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <label className="flex-1 border-2 border-dashed border-input rounded-lg p-3 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            e.target.value = "";
                                            const uniqueId = `${lesson.id}-${Date.now()}`;
                                            uploadQueue.enqueue(
                                              uniqueId,
                                              file.name,
                                              async (
                                                _task,
                                                onProgress,
                                                signal,
                                              ) => {
                                                const ext = file.name
                                                  .split(".")
                                                  .pop();
                                                const path = `${tenantId}/${courseId}/${lesson.id}/download-${Date.now()}.${ext}`;
                                                const {
                                                  data: { session },
                                                } =
                                                  await supabase.auth.getSession();
                                                const supabaseUrl = import.meta
                                                  .env.VITE_SUPABASE_URL;
                                                await new Promise<void>(
                                                  (resolve, reject) => {
                                                    const xhr =
                                                      new XMLHttpRequest();
                                                    xhr.open(
                                                      "POST",
                                                      `${supabaseUrl}/storage/v1/object/course-assets/${path}`,
                                                    );
                                                    xhr.setRequestHeader(
                                                      "Authorization",
                                                      `Bearer ${session?.access_token}`,
                                                    );
                                                    xhr.setRequestHeader(
                                                      "x-upsert",
                                                      "true",
                                                    );
                                                    signal.addEventListener(
                                                      "abort",
                                                      () => xhr.abort(),
                                                    );
                                                    xhr.upload.onprogress = (
                                                      ev,
                                                    ) => {
                                                      if (ev.lengthComputable)
                                                        onProgress(
                                                          (ev.loaded /
                                                            ev.total) *
                                                            100,
                                                        );
                                                    };
                                                    xhr.onload = () => {
                                                      if (
                                                        xhr.status >= 200 &&
                                                        xhr.status < 300
                                                      )
                                                        resolve();
                                                      else
                                                        reject(
                                                          new Error(
                                                            t("courseEditor.toasts.fileUploadFailed"),
                                                          ),
                                                        );
                                                    };
                                                    xhr.onerror = () =>
                                                      reject(
                                                        new Error(
                                                          t("courseEditor.toasts.connectionError"),
                                                        ),
                                                      );
                                                    xhr.onabort = () =>
                                                      reject(
                                                        new Error(
                                                          t("courseEditor.toasts.uploadCancelled"),
                                                        ),
                                                      );
                                                    xhr.send(file);
                                                  },
                                                );
                                                const {
                                                  data: { publicUrl },
                                                } = supabase.storage
                                                  .from("course-assets")
                                                  .getPublicUrl(path);
                                                await updateLesson(lesson.id, {
                                                  download_url: publicUrl,
                                                  download_filename: file.name,
                                                } as any);
                                                return { fileType: "download" };
                                              },
                                            );
                                          }}
                                        />
                                        <span className="flex items-center justify-center gap-2">
                                          <Upload className="w-4 h-4" />
                                          {lesson.download_url
                                            ? t("courseEditor.lessons.changeFile")
                                            : t("courseEditor.lessons.uploadDownloadFile")}
                                        </span>
                                      </label>
                                      {lesson.download_url && (
                                        <span className="text-xs text-success font-medium">
                                          ✓{" "}
                                          {lesson.download_filename ||
                                            t("courseEditor.lessons.uploaded")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {lesson.content_type === "quiz" && (
                                  <QuizEditor
                                    lessonId={lesson.id}
                                    courseId={courseId}
                                    tenantId={tenantId}
                                  />
                                )}

                                {/* EPUB & Office - file upload */}
                                {["epub", "office"].includes(
                                  lesson.content_type,
                                ) && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <label className="flex-1 border-2 border-dashed border-input rounded-lg p-3 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept={
                                            lesson.content_type === "epub"
                                              ? ".epub"
                                              : ".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                          }
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            e.target.value = "";
                                            const uniqueId = `${lesson.id}-${Date.now()}`;
                                            uploadQueue.enqueue(
                                              uniqueId,
                                              file.name,
                                              async (
                                                _task,
                                                onProgress,
                                                signal,
                                              ) => {
                                                const ext = file.name
                                                  .split(".")
                                                  .pop();
                                                const path = `${tenantId}/${courseId}/${lesson.id}/${lesson.content_type}-${Date.now()}.${ext}`;
                                                const {
                                                  data: { session },
                                                } =
                                                  await supabase.auth.getSession();
                                                const supabaseUrl = import.meta
                                                  .env.VITE_SUPABASE_URL;
                                                await new Promise<void>(
                                                  (resolve, reject) => {
                                                    const xhr =
                                                      new XMLHttpRequest();
                                                    xhr.open(
                                                      "POST",
                                                      `${supabaseUrl}/storage/v1/object/course-assets/${path}`,
                                                    );
                                                    xhr.setRequestHeader(
                                                      "Authorization",
                                                      `Bearer ${session?.access_token}`,
                                                    );
                                                    xhr.setRequestHeader(
                                                      "x-upsert",
                                                      "true",
                                                    );
                                                    signal.addEventListener(
                                                      "abort",
                                                      () => xhr.abort(),
                                                    );
                                                    xhr.upload.onprogress = (
                                                      ev,
                                                    ) => {
                                                      if (ev.lengthComputable)
                                                        onProgress(
                                                          (ev.loaded /
                                                            ev.total) *
                                                            100,
                                                        );
                                                    };
                                                    xhr.onload = () => {
                                                      if (
                                                        xhr.status >= 200 &&
                                                        xhr.status < 300
                                                      )
                                                        resolve();
                                                      else
                                                        reject(
                                                          new Error(
                                                            t("courseEditor.toasts.fileUploadFailed"),
                                                          ),
                                                        );
                                                    };
                                                    xhr.onerror = () =>
                                                      reject(
                                                        new Error(
                                                          t("courseEditor.toasts.connectionError"),
                                                        ),
                                                      );
                                                    xhr.onabort = () =>
                                                      reject(
                                                        new Error(
                                                          t("courseEditor.toasts.uploadCancelled"),
                                                        ),
                                                      );
                                                    xhr.send(file);
                                                  },
                                                );
                                                const {
                                                  data: { publicUrl },
                                                } = supabase.storage
                                                  .from("course-assets")
                                                  .getPublicUrl(path);
                                                await updateLesson(lesson.id, {
                                                  download_url: publicUrl,
                                                  download_filename: file.name,
                                                } as any);
                                                return {
                                                  fileType: lesson.content_type,
                                                };
                                              },
                                            );
                                          }}
                                        />
                                        <span className="flex items-center justify-center gap-2">
                                          <Upload className="w-4 h-4" />
                                          {lesson.download_url
                                            ? t("courseEditor.lessons.changeFile")
                                            : lesson.content_type === "epub"
                                              ? t("courseEditor.lessons.uploadEpub")
                                              : t("courseEditor.lessons.uploadOffice")}
                                        </span>
                                      </label>
                                      {lesson.download_url && (
                                        <span className="text-xs text-success font-medium">
                                          ✓{" "}
                                          {lesson.download_filename ||
                                            t("courseEditor.lessons.uploaded")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ZOOM - meeting URL */}
                                {lesson.content_type === "zoom" && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("courseEditor.lessons.zoomLink")}
                                    </Label>
                                    <Input
                                      value={lesson.video_url || ""}
                                      onChange={(e) =>
                                        updateLesson(lesson.id, {
                                          video_url: e.target.value,
                                        } as any)
                                      }
                                      placeholder="https://zoom.us/j/..."
                                      dir="ltr"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      {t("courseEditor.lessons.zoomHint")}
                                    </p>
                                  </div>
                                )}

                                {/* Featured Product - select single course */}
                                {lesson.content_type === "featured_product" && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("courseEditor.lessons.selectFeatured")}
                                    </Label>
                                    <Select
                                      value={lesson.text_content || ""}
                                      onValueChange={(v) =>
                                        updateLesson(lesson.id, {
                                          text_content: v,
                                        } as any)
                                      }

                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("courseEditor.lessons.selectFeaturedPlaceholder")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(
                                          [
                                            "course",
                                            "live_course",
                                            "digital_product",
                                            "consultation",
                                          ] as const
                                        ).map((kind) => {
                                          const list = productOptions[kind];
                                          if (!list?.length) return null;
                                          return (
                                            <SelectGroup key={kind}>
                                              <SelectLabel>
                                                {GIFT_KIND_LABEL[kind]}
                                              </SelectLabel>
                                              {list.map((o) => (
                                                <SelectItem
                                                  key={`${kind}:${o.id}`}
                                                  value={`${kind}:${o.id}`}
                                                >
                                                  {o.title}
                                                </SelectItem>
                                              ))}
                                            </SelectGroup>
                                          );
                                        })}
                                        {!productOptions.course.length &&
                                          !productOptions.live_course.length &&
                                          !productOptions.digital_product
                                            .length &&
                                          !productOptions.consultation
                                            .length && (
                                            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                              {t("courseEditor.lessons.noProductsAvailable")}
                                            </div>
                                          )}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      {t("courseEditor.lessons.selectFeaturedHint")}
                                    </p>
                                  </div>
                                )}

                                {/* Upsell - multiple course links */}
                                {lesson.content_type === "upsell" && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">
                                      {t("courseEditor.lessons.upsellLinks")}
                                    </Label>
                                    <Textarea
                                      value={lesson.text_content || ""}
                                      onChange={(e) =>
                                        updateLesson(lesson.id, {
                                          text_content: e.target.value,
                                        } as any)
                                      }
                                      placeholder={
                                        t("courseEditor.lessons.upsellPlaceholder")
                                      }
                                      rows={3}
                                      dir="ltr"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      {t("courseEditor.lessons.upsellHint")}
                                    </p>
                                  </div>
                                )}

                                <div className="flex justify-end pt-2">
                                  <Button
                                    onClick={() => setEditingLessonId(null)}
                                  >
                                    {t("courseEditor.lessons.done")}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ))}

                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewLessonTitle("");
                            setNewLessonDescription("");
                            setNewLessonPreview(false);
                            setNewLessonType("video");
                            setAddLessonDialog(section.id);
                          }}
                          className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 gap-2 h-11 px-6 text-sm font-medium"
                        >
                          <Plus className="w-5 h-5" />
                          {t("courseEditor.lessons.addLesson")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Pricing Tab */}
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
                        {t("courseEditor.pricing.priceLabel")}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={coursePrice || ""}
                          onChange={(e) => setCoursePrice(e.target.value ? Number(e.target.value) : 0)}
                          placeholder={t("courseEditor.pricing.pricePlaceholder")}
                          className="h-12 text-lg font-bold bg-muted/40 pe-16"
                        />
                        <span className="absolute inset-y-0 end-4 flex items-center text-xs font-medium text-muted-foreground pointer-events-none">
                          {coursePrice > 0 ? t("courseEditor.pricing.currency") : t("courseEditor.pricing.free")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 min-h-[20px]">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {t("courseEditor.pricing.priceBeforeDiscount")}
                        </Label>
                        {!!priceBeforeDiscount &&
                          priceBeforeDiscount > coursePrice &&
                          coursePrice > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                              {t("courseEditor.priceTab.savings", {
                                pct: (() => {
                                  const pct = Math.round(
                                    ((priceBeforeDiscount - coursePrice) / priceBeforeDiscount) * 100,
                                  );
                                  return isRtl ? toAr(pct) : pct;
                                })(),
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
                        placeholder={t("courseEditor.pricing.priceBeforeDiscountPlaceholder")}
                        className="h-12 text-lg bg-muted/40"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">{isRtl ? "الأسعار حسب الدولة والعملة" : "Prices by country & currency"}</h3>
                  </div>
                  <PriceListEditor tenantId={tenantId} productType="course" productId={courseId} basePrice={coursePrice} baseCompareAt={priceBeforeDiscount} />
                </section>

                {/* ── 2. Visibility & order ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6 border-y border-border/60">
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">{t("courseEditor.visibility.title")}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {isUnlisted
                          ? t("courseEditor.visibility.privateDesc")
                          : t("courseEditor.visibility.publicDesc")}
                      </span>
                    </div>
                    <Switch checked={isUnlisted} onCheckedChange={setIsUnlisted} dir="ltr" />
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">{t("courseEditor.priceTab.orderTitle")}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {t("courseEditor.priceTab.orderHint")}
                      </span>
                    </div>
                    <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setDisplayOrder(Math.max(0, Number(displayOrder || 0) - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("courseEditor.displayAndButtons.decrement")}
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
                        aria-label={t("courseEditor.displayAndButtons.increment")}
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
                        placeholder={t("courseEditor.displayAndButtons.buyButtonPlaceholder")}
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
                        placeholder={t("courseEditor.displayAndButtons.cardButtonPlaceholder")}
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
                        <h4 className="font-bold text-foreground text-sm">{t("courseEditor.gift.title")}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("courseEditor.gift.desc")}</p>
                      </div>
                    </div>
                    <Switch
                      checked={giftCourseEnabled}
                      onCheckedChange={(v) => {
                        setGiftCourseEnabled(v);
                        if (!v) setGiftItems([]);
                      }}
                      dir="ltr"
                    />
                  </div>

                  {giftCourseEnabled && (
                    <div className="mt-5 pt-5 border-t border-primary/15">
                      <GiftPicker
                        tenantId={tenantId}
                        exclude={{ kind: "course", id: courseId }}
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


        {/* Content Bank Tab */}
        <TabsContent value="content-bank">
          <div className="max-w-3xl mx-auto space-y-5">
            <ContentBankManager courseId={courseId} tenantId={tenantId} />
          </div>
        </TabsContent>

        {/* AI Bot Tab */}
        <TabsContent value="ai-bot">
          <div className="max-w-3xl mx-auto space-y-5">
            <QABotSettings courseId={courseId} />
          </div>
        </TabsContent>

        {/* Additional Settings Tab */}
        <TabsContent value="additional-settings">
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold">{t("courseEditor.additionalSettings.title")}</h2>
              <p className="text-xs text-muted-foreground -mt-3">
                {t("courseEditor.additionalSettings.subtitle")}
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{t("courseEditor.additionalSettings.certificate")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("courseEditor.additionalSettings.certificateDesc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    dir="ltr"
                    checked={hasCertificate}
                    onCheckedChange={setHasCertificate}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{t("courseEditor.additionalSettings.lifetimeUpdates")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("courseEditor.additionalSettings.lifetimeUpdatesDesc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    dir="ltr"
                    checked={hasLifetimeUpdates}
                    onCheckedChange={setHasLifetimeUpdates}
                  />
                </div>

                {/* Support Type - 3 radio options */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">
                    {t("courseEditor.support.title")}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        value: "community" as const,
                        label: t("courseEditor.support.community"),
                        desc: t("courseEditor.support.communityDesc"),
                        icon: MessageCircle,
                      },
                      {
                        value: "individual" as const,
                        label: t("courseEditor.support.individual"),
                        desc: t("courseEditor.support.individualDesc"),
                        icon: Users,
                      },
                      {
                        value: "both" as const,
                        label: t("courseEditor.support.both"),
                        desc: t("courseEditor.support.bothDesc"),
                        icon: Users,
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${supportType === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"}`}
                      >
                        <input
                          type="radio"
                          name="supportType"
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

                  {/* Community link input */}
                  {(supportType === "community" || supportType === "both") && (
                    <div className="pr-2 space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-primary" />
                        {t("courseEditor.community.linkLabel")}{" "}
                        {isPublished && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>
                      <Input
                        type="url"
                        dir="ltr"
                        placeholder={t("courseEditor.community.linkPlaceholder")}
                        value={communityLink}
                        onChange={(e) => setCommunityLink(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("courseEditor.community.linkHint")}
                      </p>
                    </div>
                  )}

                  {/* Individual support - WhatsApp info */}
                  {(supportType === "individual" || supportType === "both") && (
                    <div className="pr-2">
                      {tenantWhatsapp ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800">
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <p className="text-xs">
                            {t("courseEditor.community.whatsappInfo")}{" "}
                            <span className="font-bold" dir="ltr">
                              {tenantWhatsapp}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                          <p className="text-xs">
                            {t("courseEditor.community.whatsappMissing")}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="shrink-0 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                            onClick={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set("tab", "profile");
                              window.location.href = url.toString();
                            }}
                          >
                            {t("courseEditor.community.profileSettings")}
                          </Button>
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

      {/* Add Lesson Dialog */}
      <Dialog
        open={!!addLessonDialog}
        onOpenChange={(open) => !open && setAddLessonDialog(null)}
      >
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("courseEditor.addLesson.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t("courseEditor.addLesson.contentType")}
              </Label>
              <Select
                value={newLessonType}
                onValueChange={setNewLessonType}

              >
                <SelectTrigger>
                  <SelectValue placeholder={t("courseEditor.addLesson.contentTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((ct) => {
                    const Icon = ct.icon;
                    return (
                      <SelectItem key={ct.value} value={ct.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 shrink-0" />
                          {ct.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("courseEditor.addLesson.contentTitle")}</Label>
              <Input
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder={
                  contentTypes.find((c) => c.value === newLessonType)?.label ||
                  t("courseEditor.addLesson.titleFallback")
                }
              />
            </div>
            <button
              type="button"
              onClick={() => setShowExtraLessonOptions((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span>{t("courseEditor.addLesson.extraSettings")}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showExtraLessonOptions ? "rotate-180" : ""}`}
              />
            </button>
            {showExtraLessonOptions && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">{t("courseEditor.addLesson.description")}</Label>
                  <Textarea
                    value={newLessonDescription}
                    onChange={(e) => setNewLessonDescription(e.target.value)}
                    placeholder={t("courseEditor.addLesson.descriptionPlaceholder")}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t("courseEditor.addLesson.freePreview")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("courseEditor.addLesson.freePreviewDesc")}
                    </p>
                  </div>
                  <Switch
                    dir="ltr"
                    checked={newLessonPreview}
                    onCheckedChange={setNewLessonPreview}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddLessonDialog(null)}
              >
                {t("courseEditor.addLesson.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (addLessonDialog) {
                    addLesson(
                      addLessonDialog,
                      newLessonType,
                      newLessonTitle,
                      newLessonDescription,
                      newLessonPreview,
                    );
                    setAddLessonDialog(null);
                  }
                }}
                className="gradient-primary text-primary-foreground border-0"
              >
                {t("courseEditor.addLesson.add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <Dialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("courseEditor.deleteSection.title")}</DialogTitle>
            <DialogDescription>
              {t("courseEditor.deleteSection.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setSectionToDelete(null)}>
              {t("courseEditor.deleteSection.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (sectionToDelete) {
                  deleteSection(sectionToDelete);
                  setSectionToDelete(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              {t("courseEditor.deleteSection.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseEditor;
