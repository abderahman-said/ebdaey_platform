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
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import BunnyVideoThumbnail from "./BunnyVideoThumbnail";
import { Progress } from "@/components/ui/progress";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import ContentBankManager from "./ContentBankManager";
import OrderBumpEditor from "./OrderBumpEditor";
import SalesOffersBlock from "./SalesOffersBlock";
import LandingSettingsEditor from "./LandingSettingsEditor";
import {
  ArrowRight,
  Check,
  Upload,
  Trash2,
  Plus,
  Minus,
  Loader2,
  Image as ImageIcon,
  Play,
  ExternalLink,
  FileText,
  MapPin,
  CalendarClock,
  Tag,
  Gift,
  Monitor,
  Mail,
  Video,
  Link2,
  FolderOpen,
  ShoppingBag,
  Award,
  TrendingUp,
  MessageCircle,
  Users,
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
  loadGiftCoursesFor,
  saveGiftCoursesFor,
} from "@/lib/giftItems";

interface Props {
  liveCourseId: string;
  tenantId: string;
  tenantSlug: string;
  onBack: () => void;
}

interface Session {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  sort_order: number;
  zoom_join_url?: string | null;
  zoom_generation_error?: string | null;
  zoom_generation_attempted_at?: string | null;
  _new?: boolean;
}

const LiveCourseEditor = ({
  liveCourseId,
  tenantId,
  tenantSlug,
  onBack,
}: Props) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dir = isEn ? "ltr" : "rtl";
  const { toast } = useToast();
  const dataLoaded = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Product info
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingBannerVideo, setUploadingBannerVideo] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);

  // Attendance
  const [attendanceType, setAttendanceType] = useState<
    "zoom" | "online" | "in_person" | null
  >(null);
  const [zoomConnected, setZoomConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mentor_zoom_accounts" as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!cancelled) setZoomConnected(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);



  const [meetingLink, setMeetingLink] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationMapUrl, setLocationMapUrl] = useState("");
  const [locationDirections, setLocationDirections] = useState("");

  // Pricing
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState(0);
  const [priceBeforeDiscount, setPriceBeforeDiscount] = useState<number | null>(
    null,
  );

  // Display
  const [isPublished, setIsPublished] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [buyButtonText, setBuyButtonText] = useState("");
  const [cardButtonText, setCardButtonText] = useState("");

  // Post purchase
  const [sendOrderConfirmEmail, setSendOrderConfirmEmail] = useState(false);
  const [sendPostPurchaseEmail, setSendPostPurchaseEmail] = useState(false);
  const [postPurchaseSubject, setPostPurchaseSubject] = useState("");
  const [postPurchaseBody, setPostPurchaseBody] = useState("");

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);

  // Product type / consultation
  const [productType, setProductType] = useState<
    "live_course" | "consultation" | "session_bundle"
  >("live_course");
  const [sessionDurationMinutes, setSessionDurationMinutes] =
    useState<number>(30);
  const [scheduleId, setScheduleId] = useState<string | "">("");
  const [schedules, setSchedules] = useState<{ id: string; title: string }[]>(
    [],
  );
  // Session bundle booking policy
  const [sessionsCount, setSessionsCount] = useState<number>(4);
  const [minLeadHours, setMinLeadHours] = useState<number>(0);
  const [bufferSlots, setBufferSlots] = useState<number>(0);
  const [bookingWindowDays, setBookingWindowDays] = useState<number | "">("");
  const [bookingStartDate, setBookingStartDate] = useState<string>("");
  const [bookingEndDate, setBookingEndDate] = useState<string>("");

  // Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Gifts (all kinds)
  const [giftCourseEnabled, setGiftCourseEnabled] = useState(false);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);

  // Additional settings
  const [hasCertificate, setHasCertificate] = useState(false);
  const [hasLifetimeUpdates, setHasLifetimeUpdates] = useState(false);
  const [supportType, setSupportType] = useState<
    "none" | "community" | "individual" | "both"
  >("none");
  const [communityLink, setCommunityLink] = useState("");
  const [tenantWhatsapp, setTenantWhatsapp] = useState<string | null>(null);

  // Landing page settings
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

  const [isDirty, setIsDirty] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const markDirty = useCallback(() => {
    if (dataLoaded.current) setIsDirty(true);
  }, []);

  // Edit dialogs (sales page sections)
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [courseInfoDialogOpen, setCourseInfoDialogOpen] = useState(false);
  const [landingDialogOpen, setLandingDialogOpen] = useState(false);

  useEffect(() => {
    if (!dataLoaded.current) return;
    markDirty();
  }, [
    title,
    slug,
    shortDescription,
    description,
    capacity,
    thumbnailUrl,
    bannerVideoUrl,
    attendanceType,
    meetingLink,
    locationName,
    locationMapUrl,
    locationDirections,
    isFree,
    price,
    priceBeforeDiscount,
    isPublished,
    isUnlisted,
    displayOrder,
    buyButtonText,
    cardButtonText,
    sendOrderConfirmEmail,
    sendPostPurchaseEmail,
    postPurchaseSubject,
    postPurchaseBody,
    giftCourseEnabled,
    giftItems,
    hasCertificate,
    hasLifetimeUpdates,
    supportType,
    communityLink,
    productType,
    sessionDurationMinutes,
    scheduleId,
    landingHeader,
    landingSubheader,
    landingHeaderColor,
    landingSubheaderColor,
    landingHeaderSize,
    landingSubheaderSize,
    landingFeatures,
    faqs,
  ]);

  const loadAll = async () => {
    setLoading(true);
    const [productRes, sessionsRes, tenantRes, schedulesRes] =
      await Promise.all([
        supabase
          .from("live_courses" as any)
          .select("*")
          .eq("id", liveCourseId)
          .single(),
        supabase
          .from("live_course_sessions" as any)
          .select("*")
          .eq("live_course_id", liveCourseId)
          .order("sort_order"),
        supabase
          .from("tenants")
          .select("whatsapp_number")
          .eq("id", tenantId)
          .maybeSingle(),
        supabase
          .from("mentor_schedules" as any)
          .select("id, title")
          .eq("tenant_id", tenantId)
          .order("created_at"),
      ]);
    if (productRes.error || !productRes.data) {
      toast({ title: t("liveCourseEditor.toasts.loadFailed"), variant: "destructive" });
      onBack();
      return;
    }
    const p: any = productRes.data;
    setTitle(p.title);
    setSlug(p.slug);
    setShortDescription(p.short_description || "");
    setDescription(p.description || "");
    setCapacity(p.capacity ?? "");
    setThumbnailUrl(p.thumbnail_url);
    setBannerVideoUrl(p.banner_video_url || null);
    setAttendanceType(p.attendance_type || null);
    setMeetingLink(p.meeting_link || "");
    setLocationName(p.location_name || "");
    setLocationMapUrl(p.location_map_url || "");
    setLocationDirections(p.location_directions || "");
    setIsFree(p.is_free);
    setPrice(Number(p.price) || 0);
    setPriceBeforeDiscount(
      p.price_before_discount ? Number(p.price_before_discount) : null,
    );
    setIsPublished(p.is_published);
    setIsUnlisted(p.is_unlisted);
    setDisplayOrder(p.display_order ?? 0);
    setBuyButtonText(p.buy_button_text || "");
    setCardButtonText(p.card_button_text || "");
    setSendOrderConfirmEmail(p.send_order_confirmation_email);
    setSendPostPurchaseEmail(p.send_post_purchase_email);
    setPostPurchaseSubject(p.post_purchase_email_subject || "");
    setPostPurchaseBody(p.post_purchase_email_body || "");
    setGiftCourseEnabled(p.gift_course_enabled || false);
    setHasCertificate(p.has_certificate || false);
    setHasLifetimeUpdates(p.has_lifetime_updates || false);
    setCommunityLink(p.community_link || "");
    const hc = p.has_community,
      hi = p.has_individual_support;
    setSupportType(
      hc && hi ? "both" : hc ? "community" : hi ? "individual" : "none",
    );
    setSessions(((sessionsRes.data as any) || []) as Session[]);
    const loadedGifts = await loadGiftCoursesFor({ liveCourseId });
    setGiftItems(loadedGifts);
    setTenantWhatsapp(tenantRes.data?.whatsapp_number ?? null);
    setSchedules(((schedulesRes.data as any) || []) as any);
    setProductType((p.product_type as any) || "live_course");
    setSessionDurationMinutes(p.session_duration_minutes || 30);
    setScheduleId(p.schedule_id || "");
    setSessionsCount(p.sessions_count || 4);
    setMinLeadHours(p.min_lead_hours || 0);
    setBufferSlots(p.buffer_slots || 0);
    setBookingWindowDays(p.booking_window_days ?? "");
    setBookingStartDate(p.booking_start_date || "");
    setBookingEndDate(p.booking_end_date || "");
    setLandingHeader(p.landing_header || "");
    setLandingSubheader(p.landing_subheader || "");
    setLandingHeaderColor(p.landing_header_color || "#000000");
    setLandingSubheaderColor(p.landing_subheader_color || "#666666");
    setLandingHeaderSize(p.landing_header_size || "3xl");
    setLandingSubheaderSize(p.landing_subheader_size || "lg");
    setLandingFeatures(p.landing_features || []);
    setFaqs(p.faqs || []);
    setLoading(false);
    setTimeout(() => {
      dataLoaded.current = true;
    }, 100);
  };

  useEffect(() => {
    loadAll(); /* eslint-disable-next-line */
  }, [liveCourseId]);

  // Validation flags
  const attendanceMissing =
    !attendanceType ||
    (attendanceType === "online"
      ? !meetingLink.trim()
      : attendanceType === "in_person"
        ? !locationName.trim() || !locationMapUrl.trim()
        : false);

  const isBundle = productType === "session_bundle";
  const isConsultation = productType === "consultation" || isBundle;
  const _pk = isConsultation ? "consultation" : "course";
  const tProd = t(`liveCourseEditor.terms.productThe.${_pk}`);
  const tProdIndef = t(`liveCourseEditor.terms.productA.${_pk}`);
  const tProdYour = t(`liveCourseEditor.terms.productYour.${_pk}`);
  const tProdsList = t(`liveCourseEditor.terms.productsList.${_pk}`);
  const sessionsMissing = !isConsultation && sessions.length === 0;
  const consultationMissing =
    isConsultation && (!sessionDurationMinutes || !scheduleId);
  const productMissing = !title.trim();

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: t("liveCourseEditor.toasts.titleRequired"), variant: "destructive" });
      return;
    }
    // Build an explicit list of what is actually missing, so the message names
    // the fields instead of pointing at a generic asterisk marker.
    const missing: string[] = [];
    if (!attendanceType) missing.push(t("liveCourseEditor.missing.attendanceType"));
    if (attendanceType === "online" && !meetingLink.trim())
      missing.push(t("liveCourseEditor.missing.meetingLink"));
    if (attendanceType === "in_person" && !locationName.trim())
      missing.push(t("liveCourseEditor.missing.locationName"));
    if (attendanceType === "in_person" && !locationMapUrl.trim())
      missing.push(t("liveCourseEditor.missing.locationMapUrl"));
    if (isConsultation && !sessionDurationMinutes)
      missing.push(t("liveCourseEditor.missing.sessionDuration"));
    if (isConsultation && !scheduleId) missing.push(t("liveCourseEditor.missing.schedule"));
    if (isBundle && (!sessionsCount || sessionsCount < 1))
      missing.push(t("liveCourseEditor.missing.sessionsCount"));
    if (missing.length > 0) {
      toast({
        title: t("liveCourseEditor.toasts.requiredMissing"),
        description: missing.join(" • "),
        variant: "destructive",
      });
      return;
    }


    setSaving(true);
    const { error } = await supabase.from("live_courses" as any).upsert(
      {
        id: liveCourseId,
        tenant_id: tenantId,
        title: title.trim(),
        slug: slug.trim(),
        short_description: shortDescription || null,
        description: description || null,
        capacity: capacity === "" ? null : Number(capacity),
        thumbnail_url: thumbnailUrl,
        banner_video_url: bannerVideoUrl,
        banner_type: bannerVideoUrl ? "video" : "image",
        attendance_type: attendanceType as any,
        meeting_link: attendanceType === "online" ? (meetingLink || null) : null,
        location_name: attendanceType === "in_person" ? (locationName || null) : null,
        location_map_url: attendanceType === "in_person" ? (locationMapUrl || null) : null,
        location_directions: attendanceType === "in_person" ? (locationDirections || null) : null,
        is_free: price === 0,
        price: price,
        price_before_discount: price === 0 ? null : priceBeforeDiscount,
        is_published: attendanceType ? isPublished : false,
        is_unlisted: isUnlisted,
        display_order: displayOrder,
        buy_button_text: buyButtonText || null,
        card_button_text: cardButtonText || null,
        send_order_confirmation_email: sendOrderConfirmEmail,
        send_post_purchase_email: sendPostPurchaseEmail,
        post_purchase_email_subject: postPurchaseSubject || null,
        post_purchase_email_body: postPurchaseBody || null,
        gift_course_enabled: giftCourseEnabled,
        session_duration_minutes: isConsultation
          ? sessionDurationMinutes
          : null,
        schedule_id: isConsultation ? scheduleId || null : null,
        sessions_count: isBundle ? sessionsCount : null,
        min_lead_hours: isConsultation ? minLeadHours || 0 : 0,
        buffer_slots: isConsultation ? bufferSlots || 0 : 0,
        booking_window_days: isConsultation && bookingWindowDays !== "" ? Number(bookingWindowDays) : null,
        booking_start_date: isConsultation ? bookingStartDate || null : null,
        booking_end_date: isConsultation ? bookingEndDate || null : null,
        has_certificate: hasCertificate,
        has_lifetime_updates: hasLifetimeUpdates,
        has_community: supportType === "community" || supportType === "both",
        has_individual_support:
          supportType === "individual" || supportType === "both",
        community_link: communityLink || null,
        landing_header: landingHeader || null,
        landing_subheader: landingSubheader || null,
        landing_header_color: landingHeaderColor,
        landing_subheader_color: landingSubheaderColor,
        landing_header_size: landingHeaderSize,
        landing_subheader_size: landingSubheaderSize,
        landing_features: landingFeatures,
        faqs: faqs,
      } as any,
      { onConflict: "id" },
    );

    // Sync gifts (all kinds)
    await saveGiftCoursesFor(
      { liveCourseId, tenantId },
      giftCourseEnabled ? giftItems : [],
    );

    setSaving(false);
    if (error)
      toast({
        title: t("liveCourseEditor.toasts.saveError"),
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: t("liveCourseEditor.toasts.saved") });
      setIsDirty(false);
    }
  };

  // Thumbnail
  const handleThumbUpload = async (file: File) => {
    setUploadingThumb(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/live-thumbnails/${liveCourseId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("course-assets")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({
        title: t("liveCourseEditor.toasts.genericError"),
        description: error.message,
        variant: "destructive",
      });
      setUploadingThumb(false);
      return;
    }
    const { data } = supabase.storage.from("course-assets").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    setUploadingThumb(false);
    toast({ title: t("liveCourseEditor.toasts.imageUploaded") });
  };

  // Banner video (Bunny)
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
      if (!createRes.ok) throw new Error(t("liveCourseEditor.toasts.createVideoFailed"));
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
            : reject(new Error(t("liveCourseEditor.toasts.uploadFailed")));
        xhr.onerror = () => reject(new Error(t("liveCourseEditor.toasts.genericError")));
        xhr.send(file);
      });
      const newUrl = `bunny:${libraryId}:${videoId}`;
      setBannerVideoUrl(newUrl);
      if (oldUrl && isBunnyUrl(oldUrl) && oldUrl !== newUrl)
        void deleteBunnyVideo(oldUrl);
      toast({ title: t("liveCourseEditor.toasts.videoUploaded") });
    } catch (e: any) {
      toast({ title: t("liveCourseEditor.toasts.genericError"), description: e?.message, variant: "destructive" });
    }
    setUploadingBannerVideo(false);
    setBannerUploadProgress(0);
  };

  // Sessions CRUD
  const addSession = () => {
    setSessions((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        title: "",
        session_date: "",
        session_time: "",
        duration_minutes: 60,
        sort_order: prev.length,
        _new: true,
      },
    ]);
  };
  const updateSessionField = (id: string, patch: Partial<Session>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };
  const [zoomPending, setZoomPending] = useState<string[]>([]);
  const zoomAttempted = useRef<Set<string>>(new Set());
  const ensureZoomLink = async (sessionId: string, silent = false) => {
    setZoomPending((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
    try {
      const { data, error } = await supabase.functions.invoke("live-session-ensure-zoom", {
        body: { sessionId },
      });
      if (error || !data?.ok) {
        const message = data?.error || error?.message || t("liveCourseEditor.toasts.zoomLinkFailed");
        updateSessionField(sessionId, { zoom_generation_error: message });
        if (!silent) {
          toast({ title: t("liveCourseEditor.toasts.zoomLinkFailed"), description: message, variant: "destructive" });
        }
        return false;
      }
      if (data.join_url) updateSessionField(sessionId, { zoom_join_url: data.join_url, zoom_generation_error: null });
      if (!silent) {
        toast({ title: t(data.outcome === "existing" ? "liveCourseEditor.toasts.zoomLinkExists" : "liveCourseEditor.toasts.zoomLinkCreated") });
      }
      return true;
    } finally {
      setZoomPending((prev) => prev.filter((id) => id !== sessionId));
    }
  };

  // Automatic recovery: any future Zoom session without a link gets one in the
  // background, one at a time, with a short retry — no manual button needed.
  useEffect(() => {
    if (attendanceType !== "zoom" || meetingLink) return;
    const pending = sessions.filter(
      (s) =>
        !s._new &&
        !s.zoom_join_url &&
        !zoomAttempted.current.has(s.id) &&
        s.session_date &&
        s.session_time &&
        new Date(`${s.session_date}T${s.session_time}`).getTime() > Date.now(),
    );
    if (pending.length === 0) return;
    pending.forEach((s) => zoomAttempted.current.add(s.id));
    let cancelled = false;
    (async () => {
      for (const s of pending) {
        if (cancelled) return;
        let ok = await ensureZoomLink(s.id, true);
        for (let attempt = 0; !ok && attempt < 2 && !cancelled; attempt += 1) {
          await new Promise((r) => setTimeout(r, 4000));
          if (cancelled) return;
          ok = await ensureZoomLink(s.id, true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attendanceType, meetingLink, sessions]);

  const saveSession = async (s: Session) => {
    if (
      !s.title.trim() ||
      !s.session_date ||
      !s.session_time ||
      !s.duration_minutes
    ) {
      toast({ title: t("liveCourseEditor.toasts.fillAllFields"), variant: "destructive" });
      return;
    }
    const sessionStart = new Date(`${s.session_date}T${s.session_time}`);
    if (!(sessionStart.getTime() > Date.now())) {
      toast({
        title: t("liveCourseEditor.toasts.sessionPast"),
        variant: "destructive",
      });
      return;
    }

    if (s._new) {
      const { data, error } = await supabase
        .from("live_course_sessions" as any)
        .insert({
          live_course_id: liveCourseId,
          tenant_id: tenantId,
          title: s.title.trim(),
          session_date: s.session_date,
          session_time: s.session_time,
          duration_minutes: s.duration_minutes,
          sort_order: s.sort_order,
        } as any)
        .select()
        .single();
      if (error)
        return toast({
          title: t("liveCourseEditor.toasts.genericError"),
          description: error.message,
          variant: "destructive",
        });
      setSessions((prev) =>
        prev.map((x) =>
          x.id === s.id ? { ...(data as any), _new: false } : x,
        ),
      );
      // Fire-and-forget Google Calendar sync
      supabase.functions.invoke("google-calendar-sync", {
        body: { kind: "session_created", sessionId: (data as any).id },
      }).catch(() => {});
      if (attendanceType === "zoom") await ensureZoomLink((data as any).id);
      toast({ title: t("liveCourseEditor.toasts.sessionSaved") });
    } else {
      const { error } = await supabase
        .from("live_course_sessions" as any)
        .update({
          title: s.title.trim(),
          session_date: s.session_date,
          session_time: s.session_time,
          duration_minutes: s.duration_minutes,
        } as any)
        .eq("id", s.id);
      if (error)
        return toast({
          title: t("liveCourseEditor.toasts.genericError"),
          description: error.message,
          variant: "destructive",
        });
      supabase.functions.invoke("google-calendar-sync", {
        body: { kind: "session_updated", sessionId: s.id },
      }).catch(() => {});
      if (attendanceType === "zoom") await ensureZoomLink(s.id);
      toast({ title: t("liveCourseEditor.toasts.sessionUpdated") });
    }
  };
  const deleteSession = async (s: Session) => {
    if (!s._new) {
      // Grab google_event_id + tenant_id before delete
      const { data: existing } = await supabase
        .from("live_course_sessions" as any)
        .select("google_event_id, tenant_id")
        .eq("id", s.id)
        .maybeSingle() as { data: { google_event_id: string | null; tenant_id: string } | null };
      await supabase
        .from("live_course_sessions" as any)
        .delete()
        .eq("id", s.id);
      if (existing?.google_event_id) {
        supabase.functions.invoke("google-calendar-sync", {
          body: {
            kind: "session_deleted",
            sessionId: s.id,
            tenantId: existing.tenant_id,
            googleEventId: existing.google_event_id,
          },
        }).catch(() => {});
      }
    }
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
  };

  // Customers
  const loadCustomers = async () => {
    setCustomersLoading(true);
    const { data } = await supabase
      .from("live_course_purchases")
      .select(
        "id, gross_amount, payment_status, created_at, students(full_name, email, phone)",
      )
      .eq("tenant_id", tenantId)
      .eq("live_course_id", liveCourseId)
      .order("created_at", { ascending: false });
    setCustomers((data as any) || []);
    setCustomersLoading(false);
  };

  const tabItems = [
    { value: "info", label: t("liveCourseEditor.tabs.info"), icon: FileText, warn: productMissing },
    { value: "attendance", label: t("liveCourseEditor.tabs.attendance"), icon: MapPin, warn: attendanceMissing },
    ...(isConsultation
      ? []
      : [{ value: "schedule", label: t("liveCourseEditor.tabs.schedule"), icon: CalendarClock, warn: sessionsMissing }]),
    { value: "pricing", label: t("liveCourseEditor.tabs.pricing"), icon: Tag, warn: false },
    { value: "content-bank", label: t("liveCourseEditor.tabs.contentBank"), icon: FolderOpen, warn: false },
    ...(isConsultation
      ? []
      : [{ value: "additional-settings", label: t("liveCourseEditor.tabs.additionalSettings"), icon: Award, warn: false }]),
    { value: "customers", label: t("liveCourseEditor.tabs.customers"), icon: Video, warn: false },
  ];

  const handleBack = () => {
    if (isDirty) setShowUnsaved(true);
    else onBack();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <UnsavedChangesDialog
        open={showUnsaved}
        onSave={async () => {
          await handleSave();
          setShowUnsaved(false);
          onBack();
        }}
        onDiscard={() => {
          setShowUnsaved(false);
          setIsDirty(false);
          onBack();
        }}
        onCancel={() => setShowUnsaved(false)}
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
              {title || (isBundle ? t("liveCourseEditor.header.editBundle") : isConsultation ? t("liveCourseEditor.header.editConsultation") : t("liveCourseEditor.header.editLive"))}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isBundle ? t("liveCourseEditor.header.subBundle") : isConsultation ? t("liveCourseEditor.header.subConsultation") : t("liveCourseEditor.header.subLive")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {!isPublished && (
            <span
              title={t("liveCourseEditor.header.notPublishedTooltip")}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200"
            >
              {t("liveCourseEditor.header.notPublished")}
            </span>
          )}

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50"
            title={
              !attendanceType
                ? t("liveCourseEditor.attendance.chooseHint")
                : undefined
            }
          >
            <Switch
              checked={isPublished && !!attendanceType}
              disabled={!attendanceType}
              onCheckedChange={(v) => {
                if (!attendanceType) {
                  toast({
                    title: t("liveCourseEditor.attendance.chooseMethod"),
                    description: t("liveCourseEditor.attendance.chooseHint"),
                    variant: "destructive",
                  });
                  return;
                }
                setIsPublished(v);
              }}
              dir="ltr"
              id="lc-pub"
            />
            <Label htmlFor="lc-pub" className="text-xs cursor-pointer">
              {t("liveCourseEditor.header.publish")}
            </Label>
          </div>

          {tenantSlug && slug && (
            <div
              role="link"
              onClick={() => openExternal(getMentorSiteUrl(tenantSlug, `/l/${slug}`))}
              className="flex-1 sm:flex-none"
            >
              <Button
                variant="outline"
                type="button"
                className="rounded-xl w-full sm:w-auto text-sm"
              >
                <ExternalLink className="w-4 h-4 ml-1 sm:ml-2" />
                {t("liveCourseEditor.header.preview")}
              </Button>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground  dark:bg-white dark:text-black  border-0 rounded-xl px-4 sm:px-6 shadow-lg flex-1 sm:flex-none text-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 ml-1 sm:ml-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 ml-1 sm:ml-2" />
            )}
            {saving ? t("liveCourseEditor.header.saving") : t("liveCourseEditor.header.save")}
          </Button>
        </div>
      </div>





      <Tabs
        defaultValue="info"
        dir={dir}
        onValueChange={(v) => {
          if (v === "customers") loadCustomers();
        }}
      >
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

        {/* Info */}
        <TabsContent value="info">
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* === Media (read-only) === */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("liveCourseEditor.info.media")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("liveCourseEditor.info.edit")}
                </Button>
              </div>
              <div className={mediaDialogOpen ? "hidden" : "flex flex-wrap gap-4 justify-center"}>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("liveCourseEditor.info.saleImage")}
                  </span>
                  <div className="relative h-24 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">{t("liveCourseEditor.info.noImage")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {t("liveCourseEditor.info.bannerVideo")}
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
                        <p className="text-xs">{t("liveCourseEditor.info.noVideo")}</p>
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
                <InlineEditTitle>{t("liveCourseEditor.mediaDialog.title")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("liveCourseEditor.mediaDialog.desc")}
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
                        <p className="text-[11px]">{t("liveCourseEditor.mediaDialog.noImageYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("liveCourseEditor.mediaDialog.saleImage")}
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
                        ? t("liveCourseEditor.mediaDialog.uploading")
                        : thumbnailUrl
                          ? t("liveCourseEditor.mediaDialog.changeImage")
                          : t("liveCourseEditor.mediaDialog.uploadImage")}
                    </label>
                    {thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl(null)}
                        className="text-[11px] text-destructive hover:underline"
                      >
                        {t("liveCourseEditor.mediaDialog.deleteImage")}
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
                        <p className="text-[11px]">{t("liveCourseEditor.mediaDialog.noVideoYet")}</p>
                      </div>
                    )}
                    <span className="absolute top-2 start-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {t("liveCourseEditor.mediaDialog.bannerVideoOptional")}
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
                          ? t("liveCourseEditor.mediaDialog.uploading")
                          : bannerVideoUrl
                            ? t("liveCourseEditor.mediaDialog.changeVideo")
                            : t("liveCourseEditor.mediaDialog.uploadVideo")}
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
                          {t("liveCourseEditor.mediaDialog.deleteVideo")}
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
                >{t("liveCourseEditor.mediaDialog.cancel")}</Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setMediaDialogOpen(false);
                  }}
                  disabled={saving || uploadingThumb || uploadingBannerVideo}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("liveCourseEditor.header.saving") : t("liveCourseEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("liveCourseEditor.info.productInfo", { prod: tProd })}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourseInfoDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("liveCourseEditor.info.edit")}
                </Button>
              </div>
              <div className={courseInfoDialogOpen ? "hidden" : "space-y-3 text-sm"}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("liveCourseEditor.info.title")}
                    </p>
                    <p className="font-medium">
                      {title || (
                        <span className="text-muted-foreground italic">
                          {t("liveCourseEditor.info.notSet")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!isConsultation && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("liveCourseEditor.info.capacity")}
                    </p>
                    <p className="font-medium">
                      {capacity === "" ? (
                        <span className="text-muted-foreground italic">
                          {t("liveCourseEditor.info.notSet")}
                        </span>
                      ) : (
                        isEn ? Number(capacity) : toAr(Number(capacity))
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("liveCourseEditor.info.shortDesc")}
                  </p>
                  <p className="text-xs line-clamp-2">
                    {shortDescription || (
                      <span className="text-muted-foreground italic text-xs flex items-center gap-1">
                        {t("liveCourseEditor.info.none")}
                        <Pencil className="w-3 h-3" />
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("liveCourseEditor.info.description")}</p>
                  {description ? (
                    <div
                      className="text-xs prose prose-sm max-w-none line-clamp-3 [&_*]:!text-foreground"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic text-xs flex items-center gap-1">
                      {t("liveCourseEditor.info.none")}
                      <Pencil className="w-3 h-3" />
                    </p>
                  )}
                </div>
                {isConsultation && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("liveCourseEditor.info.sessionDuration")}
                      </p>
                      <p className="font-medium">
                        {sessionDurationMinutes ? (
                          `${toAr(sessionDurationMinutes)} ${t("liveCourseEditor.info.minutes")}`
                        ) : (
                          <span className="text-muted-foreground italic">
                            {t("liveCourseEditor.info.notSet")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("liveCourseEditor.info.schedule")}
                      </p>
                      <p className="font-medium">
                        {schedules.find((s) => s.id === scheduleId)?.title || (
                          <span className="text-muted-foreground italic">
                            {t("liveCourseEditor.info.notSet")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
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
                <InlineEditTitle className="text-base">{t("liveCourseEditor.infoDialog.titlePrefix", { prod: tProd })}</InlineEditTitle>
              </InlineEditHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto px-0.5">
                <div className="grid sm:grid-cols-2 gap-3 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="shrink-0 text-xs">{t("liveCourseEditor.infoDialog.labelTitle", { prod: tProd })}</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        isConsultation
                          ? t("liveCourseEditor.infoDialog.phConsultation")
                          : t("liveCourseEditor.infoDialog.phCourse")
                      }
                      className="bg-background dark:bg-input h-9 flex-1"
                    />
                  </div>

                  {!isConsultation && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label className="shrink-0 text-xs">{t("liveCourseEditor.infoDialog.capacity")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={capacity}
                        onChange={(e) =>
                          setCapacity(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder={t("liveCourseEditor.infoDialog.capacityPh")}
                        className="bg-background dark:bg-input h-9 flex-1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 shrink-0">
                  <Label className="text-xs">
                    {t("liveCourseEditor.infoDialog.shortDescLabel")}
                  </Label>
                  <Textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder={t("liveCourseEditor.infoDialog.shortDescPh", { list: tProdsList })}
                    className="bg-background dark:bg-input resize-none"
                  />
                </div>

                <RichTextEditor
                  className="flex-1 min-h-[55vh]"
                  editorClassName="h-full"
                  label={t("liveCourseEditor.infoDialog.descLabel")}
                  content={description}
                  onChange={setDescription}
                />


                {isConsultation && (
                  <div className="rounded-xl border border-border p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-primary" />
                        {t("liveCourseEditor.infoDialog.consultSettings")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("liveCourseEditor.infoDialog.consultSettingsDesc")}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {t("liveCourseEditor.infoDialog.duration")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={5}
                          step={5}
                          value={sessionDurationMinutes}
                          onChange={(e) =>
                            setSessionDurationMinutes(
                              Number(e.target.value) || 0,
                            )
                          }
                          placeholder={t("liveCourseEditor.infoDialog.durationPh")}
                          className="bg-background dark:bg-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("liveCourseEditor.infoDialog.durationHint")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {t("liveCourseEditor.infoDialog.scheduleLabel")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        {schedules.length === 0 ? (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                            <p>{t("liveCourseEditor.infoDialog.noSchedules")}</p>
                            <button
                              type="button"
                              className="underline font-semibold"
                              onClick={() => {
                                const url = new URL(window.location.href);
                                url.searchParams.set("tab", "schedules");
                                window.location.href = url.toString();
                              }}
                            >
                              {t("liveCourseEditor.infoDialog.goToSchedules")}
                            </button>
                          </div>
                        ) : (
                          <select
                            value={scheduleId}
                            onChange={(e) => setScheduleId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm h-10"
                          >
                            <option value="">{t("liveCourseEditor.infoDialog.chooseSchedule")}</option>
                            {schedules.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {isBundle && (
                        <div className="space-y-2">
                          <Label>
                            {t("liveCourseEditor.infoDialog.sessionsCount")}{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={sessionsCount}
                            onChange={(e) => setSessionsCount(Number(e.target.value) || 0)}
                            className="bg-background dark:bg-input"
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("liveCourseEditor.infoDialog.sessionsCountHint")}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>{t("liveCourseEditor.infoDialog.minLeadHours")}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={minLeadHours}
                          onChange={(e) => setMinLeadHours(Number(e.target.value) || 0)}
                          className="bg-background dark:bg-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("liveCourseEditor.infoDialog.minLeadHoursHint")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("liveCourseEditor.infoDialog.bufferSlots")}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={bufferSlots}
                          onChange={(e) => setBufferSlots(Number(e.target.value) || 0)}
                          className="bg-background dark:bg-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("liveCourseEditor.infoDialog.bufferSlotsHint")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("liveCourseEditor.infoDialog.bookingWindowDays")}</Label>
                        <Input
                          type="number"
                          min={1}
                          value={bookingWindowDays}
                          onChange={(e) =>
                            setBookingWindowDays(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder={t("liveCourseEditor.infoDialog.bookingWindowDaysPh")}
                          className="bg-background dark:bg-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("liveCourseEditor.infoDialog.bookingWindowDaysHint")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("liveCourseEditor.infoDialog.bookingStartDate")}</Label>
                        <Input
                          type="date"
                          value={bookingStartDate}
                          onChange={(e) => setBookingStartDate(e.target.value)}
                          className="bg-background dark:bg-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t("liveCourseEditor.infoDialog.bookingEndDate")}</Label>
                        <Input
                          type="date"
                          value={bookingEndDate}
                          onChange={(e) => setBookingEndDate(e.target.value)}
                          className="bg-background dark:bg-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <InlineEditFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCourseInfoDialogOpen(false)}
                >{t("liveCourseEditor.mediaDialog.cancel")}</Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setCourseInfoDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("liveCourseEditor.header.saving") : t("liveCourseEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">{t("liveCourseEditor.info.faqs")}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLandingDialogOpen((v) => !v)}
                >
                  <Edit3 className="w-4 h-4 ml-1" /> {t("liveCourseEditor.info.edit")}
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
                    <p className="text-muted-foreground text-xs">{t("liveCourseEditor.info.faqEmpty")}</p>
                  </div>
                )}
              </div>
          {/* === Landing Settings Edit Dialog === */}
          <InlineEdit open={landingDialogOpen} onOpenChange={setLandingDialogOpen}>
            <InlineEditContent
              
              dir={dir}
            >
              <InlineEditHeader>
                <InlineEditTitle>{t("liveCourseEditor.landingDialog.title")}</InlineEditTitle>
                <InlineEditDescription>
                  {t("liveCourseEditor.landingDialog.desc")}
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
                >{t("liveCourseEditor.mediaDialog.cancel")}</Button>
                <Button
                  onClick={async () => {
                    await handleSave();
                    setLandingDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {saving ? t("liveCourseEditor.header.saving") : t("liveCourseEditor.header.save")}
                </Button>
              </InlineEditFooter>
            </InlineEditContent>
          </InlineEdit>
            </div>

          </div>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance">
          <div className="glass-card rounded-2xl p-6 space-y-6 max-w-2xl mx-auto">
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t("liveCourseEditor.attendance.method")}</Label>

              {attendanceType === null && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
                  <p className="font-semibold">{t("liveCourseEditor.attendance.chooseMethod")}</p>
                  <p className="mt-0.5 opacity-90">{t("liveCourseEditor.attendance.chooseHint")}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    v: "zoom" as const,
                    label: "Zoom",
                    icon: Video,
                    desc: t("liveCourseEditor.attendance.zoomDesc"),
                  },
                  {
                    v: "online" as const,
                    label: t("liveCourseEditor.attendance.online"),
                    icon: Link2,
                    desc: t("liveCourseEditor.attendance.onlineDesc"),
                  },
                  {
                    v: "in_person" as const,
                    label: t("liveCourseEditor.attendance.inPerson"),
                    icon: MapPin,
                    desc: t("liveCourseEditor.attendance.inPersonDesc"),
                  },
                ].map((o) => {
                  const Icon = o.icon;
                  const active = attendanceType === o.v;
                  const isZoom = o.v === "zoom";
                  const disabled = isZoom && zoomConnected === false;
                  return (
                    <div key={o.v} className="relative">
                      <button
                        type="button"
                        disabled={disabled}
                        title={
                          disabled
                            ? t("liveCourseEditor.attendance.zoomNotConnectedHint")
                            : undefined
                        }
                        onClick={() => !disabled && setAttendanceType(o.v)}
                        className={`w-full h-full p-4 rounded-xl border text-end transition-all ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"} ${disabled ? "opacity-60 cursor-not-allowed hover:border-border bg-muted/30 pb-9" : ""}`}
                      >
                        <Icon
                          className={`w-5 h-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <p className="font-semibold text-sm">{o.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {o.desc}
                        </p>
                      </button>

                      {isZoom && zoomConnected === false && (
                        <div className="absolute bottom-3 start-4 end-4 flex items-center justify-end gap-1.5 text-xs">
                          <span className="text-warning-foreground">
                            {t("liveCourseEditor.attendance.zoomNotConnected")}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                               const applicationsUrl = new URL(window.location.href);
                               applicationsUrl.search = "";
                               applicationsUrl.searchParams.set("tab", "marketing");
                               applicationsUrl.hash = "zoom-integration";
                               window.location.assign(applicationsUrl.toString());
                            }}
                            className="font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
                            title={t("liveCourseEditor.attendance.zoomConnectCta")}
                          >
                            {t("liveCourseEditor.attendance.zoomConnectCta")}
                          </button>
                        </div>
                      )}
                    </div>
                  );

                })}
              </div>
            </div>

            {attendanceType === "zoom" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                {t("liveCourseEditor.attendance.zoomNote")}
              </div>
            )}


            {attendanceType === "online" && (
              <div className="space-y-2">
                <Label>
                  {t("liveCourseEditor.attendance.meetingLink")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  dir="ltr"
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  {t("liveCourseEditor.attendance.meetingHint")}
                </p>
              </div>
            )}


            {attendanceType === "in_person" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {t("liveCourseEditor.attendance.placeName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder={t("liveCourseEditor.attendance.placeNamePh")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("liveCourseEditor.attendance.mapUrl")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={locationMapUrl}
                    onChange={(e) => setLocationMapUrl(e.target.value)}
                    dir="ltr"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("liveCourseEditor.attendance.directions")}</Label>
                  <Textarea
                    rows={4}
                    value={locationDirections}
                    onChange={(e) => setLocationDirections(e.target.value)}
                    placeholder={t("liveCourseEditor.attendance.directionsPh")}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Schedule */}

        {/* Schedule */}
        <TabsContent value="schedule">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  {t("liveCourseEditor.schedule.title")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("liveCourseEditor.schedule.desc")}
                </p>
              </div>
              <Button onClick={addSession} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> {t("liveCourseEditor.schedule.addSession")}
              </Button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t("liveCourseEditor.schedule.empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s, idx) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {t("liveCourseEditor.schedule.sessionNum", { num: idx + 1 })}
                      </p>
                      <div className="flex gap-2">

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => saveSession(s)}
                        >
                          {t("liveCourseEditor.schedule.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSession(s)}
                          className="text-destructive"
                        >{t("liveCourseEditor.mediaDialog.cancel")}</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("liveCourseEditor.schedule.sessionTitle")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={s.title}
                          onChange={(e) =>
                            updateSessionField(s.id, { title: e.target.value })
                          }
                          placeholder={t("liveCourseEditor.schedule.sessionTitlePh")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("liveCourseEditor.schedule.sessionDate")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={s.session_date}
                          onChange={(e) =>
                            updateSessionField(s.id, {
                              session_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("liveCourseEditor.schedule.sessionTime")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="time"
                          value={s.session_time}
                          onChange={(e) =>
                            updateSessionField(s.id, {
                              session_time: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {t("liveCourseEditor.schedule.durationMin")}{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={s.duration_minutes}
                          onChange={(e) =>
                            updateSessionField(s.id, {
                              duration_minutes: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    {attendanceType === "zoom" && !s._new && zoomPending.includes(s.id) && (
                      <p className="text-xs text-muted-foreground">{t("liveCourseEditor.schedule.creatingZoomLink")}</p>
                    )}
                    {attendanceType === "zoom" && !zoomPending.includes(s.id) && s.zoom_generation_error && (
                      <p className="text-xs text-destructive">{s.zoom_generation_error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 sm:px-8 py-6 border-b border-border/60">
                <h2 className="text-xl font-bold text-foreground">
                  {t("liveCourseEditor.pricing.headerTitle")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("liveCourseEditor.pricing.headerDesc", { prod: tProd })}
                </p>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* ── 1. Pricing details ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">
                      {t("liveCourseEditor.pricing.pricingTitle")}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {t("liveCourseEditor.pricing.priceLabel")}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={price || ""}
                          onChange={(e) => setPrice(Number(e.target.value) || 0)}
                          className="h-12 text-lg font-bold bg-muted/40 pe-16"
                        />
                        <span className="absolute inset-y-0 end-4 flex items-center text-xs font-medium text-muted-foreground pointer-events-none">
                          {!isFree && price > 0
                            ? t("liveCourseEditor.pricing.egp")
                            : t("liveCourseEditor.pricing.free")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 min-h-[20px]">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {t("liveCourseEditor.pricing.priceBefore")}
                        </Label>
                        {!isFree &&
                          !!priceBeforeDiscount &&
                          priceBeforeDiscount > price &&
                          price > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                              {t("courseEditor.priceTab.savings", {
                                pct: toAr(
                                  Math.round(
                                    ((priceBeforeDiscount - price) / priceBeforeDiscount) * 100,
                                  ),
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
                        placeholder={t("liveCourseEditor.pricing.priceBeforePh")}
                        className="h-12 text-lg bg-muted/40"
                        disabled={price === 0}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-foreground">{document.documentElement.lang === "en" ? "Prices by country & currency" : "الأسعار حسب الدولة والعملة"}</h3>
                  </div>
                  <PriceListEditor tenantId={tenantId} productType="live_course" productId={liveCourseId} basePrice={price} baseCompareAt={priceBeforeDiscount} />
                </section>

                {/* ── 2. Visibility & order ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6 border-y border-border/60">
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {t(`liveCourseEditor.pricing.unlistedTitle.${_pk}`)}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {isUnlisted
                          ? t("liveCourseEditor.pricing.unlistedYes")
                          : t("liveCourseEditor.pricing.unlistedNo")}
                      </span>
                    </div>
                    <Switch checked={isUnlisted} onCheckedChange={setIsUnlisted} dir="ltr" />
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40">
                    <div className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {t("liveCourseEditor.pricing.displayOrder")}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {t("liveCourseEditor.pricing.orderHint")}
                      </span>
                    </div>
                    <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setDisplayOrder(Math.max(0, Number(displayOrder || 0) - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors"
                        aria-label={t("liveCourseEditor.pricing.decrease")}
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
                        aria-label={t("liveCourseEditor.pricing.increase")}
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
                    <h3 className="font-semibold text-foreground">
                      {t("liveCourseEditor.pricing.displaySection")}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        {t("courseEditor.priceTab.buyButtonLabel")}
                      </Label>
                      <Input
                        value={buyButtonText}
                        onChange={(e) => setBuyButtonText(e.target.value)}
                        placeholder={t(`liveCourseEditor.pricing.buyPh.${_pk}`)}
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
                        placeholder={t("liveCourseEditor.pricing.cardPh")}
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
                          {t("liveCourseEditor.pricing.addGift")}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("liveCourseEditor.pricing.giftDesc")}
                        </p>
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
                        exclude={{
                          kind: isConsultation ? "consultation" : "live_course",
                          id: liveCourseId,
                        }}
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
          <ContentBankManager liveCourseId={liveCourseId} tenantId={tenantId} />
        </TabsContent>

        {/* Additional Settings Tab */}
        <TabsContent value="additional-settings">
          {!isConsultation && (
          <div className="glass-card rounded-2xl p-6 space-y-5 max-w-lg mx-auto">
            <h2 className="text-lg font-bold">{t("liveCourseEditor.additional.title")}</h2>
            <p className="text-xs text-muted-foreground -mt-3">
              {t("liveCourseEditor.additional.desc", { prod: tProdYour })}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{t("liveCourseEditor.additional.certificate")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("liveCourseEditor.additional.certDesc", { prod: tProd })}
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
                    <p className="text-sm font-semibold">{t("liveCourseEditor.additional.lifetime")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`liveCourseEditor.additional.lifetimeDesc.${_pk}`)}
                    </p>
                  </div>
                </div>
                <Switch
                  dir="ltr"
                  checked={hasLifetimeUpdates}
                  onCheckedChange={setHasLifetimeUpdates}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">{t("liveCourseEditor.additional.followup")}</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "community" as const,
                      label: t("liveCourseEditor.additional.community"),
                      desc: t("liveCourseEditor.additional.communityDesc"),
                      icon: MessageCircle,
                    },
                    {
                      value: "individual" as const,
                      label: t("liveCourseEditor.additional.individual"),
                      desc: t("liveCourseEditor.additional.individualDesc"),
                      icon: Users,
                    },
                    {
                      value: "both" as const,
                      label: t("liveCourseEditor.additional.both"),
                      desc: t("liveCourseEditor.additional.bothDesc"),
                      icon: Users,
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${supportType === opt.value ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50"}`}
                    >
                      <input
                        type="radio"
                        name="lcSupportType"
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
                    <Label className="text-sm">{t("liveCourseEditor.additional.communityLink")}</Label>
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
                          {t("liveCourseEditor.additional.whatsappOn")}{" "}
                          <span className="font-bold" dir="ltr">
                            {tenantWhatsapp}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                        <p className="text-xs">
                          {t("liveCourseEditor.additional.whatsappMissing")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {t("liveCourseEditor.customers.title")}
            </h2>
            {customersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t("liveCourseEditor.customers.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {c.students?.full_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.students?.email}
                      </p>
                    </div>
                    <div className="text-start">
                      <p className="text-sm font-semibold">
                        {Number(c.gross_amount || 0)} {t("liveCourseEditor.pricing.egp")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.payment_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default LiveCourseEditor;
