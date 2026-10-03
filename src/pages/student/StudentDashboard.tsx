import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import StudentDashboardSkeleton from "@/components/common/StudentDashboardSkeleton";
import SessionExpiredGate from "@/components/auth/SessionExpiredGate";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useBrandedPageTitle } from "@/hooks/useBrandedPageTitle";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import {
  BookOpen,
  LogOut,
  GraduationCap,
  User,
  TrendingUp,
  KeyRound,
  PlayCircle,
  Play,
  ArrowRight,
  Package,
  Download,
  Video,
  MapPin,
  CalendarClock,
  ExternalLink,
  Crown,
  Calendar,
  CheckCircle2,
  MessageCircle,
  AlertCircle,
  ListFilter,
  Check,
  Clock,
  History as HistoryIcon,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { fetchMentor } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CourseProgressCard from "@/components/student/CourseProgressCard";
import CourseCertificate from "@/components/student/CourseCertificate";
import ChangePassword from "@/components/auth/ChangePassword";
import NotificationBell from "@/components/student/NotificationBell";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import { useTranslation } from "react-i18next";
import poweredByArabic from "@/assets/powered-by-arabic.png.asset.json";
import poweredByEnglish from "@/assets/powered-by-english.png.asset.json";
import { toAr } from "@/lib/utils";
import InstallAppBanner from "@/components/pwa/InstallAppBanner";
import { usePwaManifest, hslTokenToHex } from "@/hooks/usePwaManifest";
import { sanitizeStudentMeetingLink } from "@/lib/zoomLink";

const preloadLessonViewer = () => import("@/pages/course/LessonViewer");

interface Enrollment {
  id: string;
  course_id: string;
  courses: {
    title: string;
    slug: string;
    thumbnail_url: string | null;
  };
  totalLessons: number;
  completedLessons: number;
  lastCompletedAt: string | null;
  allLessonIds: string[];
}

interface DigitalProductPurchase {
  id: string;
  digital_products: {
    title: string;
    slug: string;
    thumbnail_url: string | null;
  } | null;
  created_at: string;
}

interface LiveCoursePurchase {
  id: string;
  created_at: string;
  live_courses: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    attendance_type: string;
    meeting_link: string | null;
    location_name: string | null;
    location_map_url: string | null;
    location_directions: string | null;
    product_type?: string;
  };
  sessions?: Array<{ id: string; title: string; session_date: string; session_time: string; duration_minutes: number; zoom_join_url?: string | null }>;
  booking?: {
    booking_date: string;
    booking_time: string;
    duration_minutes: number;
    meeting_link: string | null;
  } | null;
}

interface LastWatched {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  positionSeconds: number;
  durationSeconds: number;
  thumbnailUrl: string | null;
}

interface StudentDashboardBundle {
  enrollments: Enrollment[];
  digitalPurchases: DigitalProductPurchase[];
  livePurchases: LiveCoursePurchase[];
  studentInfo: { id: string; full_name: string; email: string } | null;
  tenant: {
    id: string;
    name: string;
    specialty: string | null;
    profile_image_url: string | null;
    primary_color: string | null;
    whatsapp_number: string | null;
    whatsapp_default_color: boolean;
    subscriptions_enabled: boolean;
  };
  yearlyPlan: {
    price: number;
    description: string | null;
    features: string[];
    is_active: boolean;
  } | null;
  subscriptionStart: string | null;
  subscriptionExpiresAt: string | null;
  lastWatched: LastWatched | null;
}

const StudentDashboard = () => {
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dateLocale = isEn ? "en-US" : "ar-EG";
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const cacheKey = useMemo(
    () => ["student-dashboard-bundle", user?.id, mentorSlug || "global"],
    [user?.id, mentorSlug],
  );
  const initialCache = user ? queryClient.getQueryData<StudentDashboardBundle>(cacheKey) : undefined;

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => initialCache?.enrollments || []);
  const [digitalPurchases, setDigitalPurchases] = useState<DigitalProductPurchase[]>(() => initialCache?.digitalPurchases || []);
  const [livePurchases, setLivePurchases] = useState<LiveCoursePurchase[]>(() => initialCache?.livePurchases || []);
  const [studentInfo, setStudentInfo] = useState<{ id: string; full_name: string; email: string } | null>(() => initialCache?.studentInfo || null);
  const [tenantName, setTenantName] = useState(() => initialCache?.tenant?.name || "");
  const [tenantSpecialty, setTenantSpecialty] = useState<string | null>(() => initialCache?.tenant?.specialty ?? null);
  const [tenantImage, setTenantImage] = useState<string | null>(() => initialCache?.tenant?.profile_image_url ?? null);
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState<string | null>(() => initialCache?.tenant?.primary_color ?? null);
  const [whatsapp, setWhatsapp] = useState(() => initialCache?.tenant?.whatsapp_number || "");
  const [whatsappDefaultColor, setWhatsappDefaultColor] = useState(() => initialCache?.tenant?.whatsapp_default_color ?? true);
  const [tenantId, setTenantId] = useState(() => initialCache?.tenant?.id || "");
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(() => initialCache?.lastWatched || null);
  const [activeFilter, setActiveFilter] = useState<"all" | "recorded" | "live" | "digital" | "consultation">("all");
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [yearlyPlan, setYearlyPlan] = useState<{
    price: number;
    description: string | null;
    features: string[];
    is_active: boolean;
  } | null>(() => initialCache?.yearlyPlan || null);
  const [subscriptionStart, setSubscriptionStart] = useState<string | null>(() => initialCache?.subscriptionStart || null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(() => initialCache?.subscriptionExpiresAt || null);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(() => initialCache?.tenant?.subscriptions_enabled ?? false);
  const locationForTab = useLocation();
  const searchParamsForTab = new URLSearchParams(locationForTab.search);
  const initialStudentTab =
    (searchParamsForTab.get("tab") as "courses" | "change-password" | "subscription") || "courses";
  const [activeTab, setActiveTabState] = useState<"courses" | "change-password" | "subscription">(initialStudentTab);
  const navigateForTab = useNavigate();

  const setActiveTab = (tab: "courses" | "change-password" | "subscription") => {
    setActiveTabState(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    navigateForTab({ search: params.toString() }, { replace: true });
  };

  // Installable student app identity, branded with the mentor's academy
  usePwaManifest(
    tenantName
      ? {
          name: tenantName,
          shortName: tenantName,
          icon: tenantImage,
          themeColor: hslTokenToHex(tenantPrimaryColor) || "#00d655",
          startPath: urls.studentDashboardUrl() || "/dashboard",
          dir: isEn ? "ltr" : "rtl",
          lang: isEn ? "en" : "ar",
        }
      : null,
  );

  // Branded browser tab title (mentor academy name instead of platform default)
  useBrandedPageTitle(undefined, tenantName);





  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const hasCache = Boolean(queryClient.getQueryData(cacheKey));
      loadData(hasCache);
    } else {
      loadTenantBrandOnly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, cacheKey]);

  /** Signed-out state: fetch just the mentor branding for the session gate. */
  const loadTenantBrandOnly = async () => {
    try {
      if (!mentorSlug) return;
      const tenant = await fetchMentor(mentorSlug);
      if (tenant) {
        setTenantName(tenant.name);
        setTenantImage(tenant.profile_image_url ?? null);
        setTenantPrimaryColor(tenant.primary_color ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent && !queryClient.getQueryData(cacheKey)) {
      setLoading(true);
    }
    try {
      const tenant = await fetchMentor(mentorSlug!);
      if (!tenant) {
        toast({ title: t("miscPublic.studentDashboard.mentorNotFound"), variant: "destructive" });
        navigate("/");
        return;
      }
      setTenantId(tenant.id);
      setTenantName(tenant.name);
      setTenantSpecialty(tenant.specialty ?? null);
      setTenantImage(tenant.profile_image_url ?? null);
      setTenantPrimaryColor(tenant.primary_color ?? null);
      setWhatsapp(tenant.whatsapp_number || "");
      setWhatsappDefaultColor(tenant.whatsapp_default_color ?? true);
      setSubscriptionsEnabled(tenant.subscriptions_enabled ?? false);

      // Parallel: yearly plan + student record (both depend only on tenant.id)
      const [planRes, studentRes] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("price, description, features, is_active")
          .eq("tenant_id", tenant.id)
          .eq("plan_type", "yearly")
          .maybeSingle(),
        supabase
          .from("students")
          .select("id, full_name, email")
          .eq("user_id", user!.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle(),
      ]);

      const plan = planRes.data;
      if (plan) {
        setYearlyPlan({
          price: Number(plan.price),
          description: plan.description,
          features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
          is_active: plan.is_active,
        });
      }

      const student = studentRes.data;
      if (!student) {
        toast({
          title: t("miscPublic.studentDashboard.accessDeniedTitle"),
          description: t("miscPublic.studentDashboard.accessDeniedDesc"),
          variant: "destructive",
        });
        navigate(urls.profileUrl());
        return;
      }
      setStudentInfo(student);

      // Active subscribers get access to anything the mentor published after
      // they subscribed — materialise it before reading their library.
      try {
        const { data: activeSub } = await supabase
          .from("subscription_purchases")
          .select("id")
          .eq("student_id", student.id)
          .eq("tenant_id", tenant.id)
          .eq("payment_status", "completed")
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (activeSub) await supabase.functions.invoke("subscription-sync-access");
      } catch (e) {
        console.error("subscription sync failed", e);
      }

      // Parallel: digital purchases + live purchases + enrollments (all depend only on student.id)

      const [dpRes, lcRes, enrollmentsRes] = await Promise.all([
        supabase
          .from("digital_product_purchases")
          .select(
            "id, created_at, digital_products!digital_product_purchases_digital_product_id_fkey(title, slug, thumbnail_url)",
          )
          .eq("student_id", student.id)
          .eq("tenant_id", tenant.id)
          .eq("payment_status", "completed")
          .order("created_at", { ascending: false }),
        supabase
          .from("live_course_purchases")
          .select(
            "id, created_at, live_courses!live_course_purchases_live_course_id_fkey(id, title, slug, thumbnail_url, attendance_type, meeting_link, location_name, location_map_url, location_directions, product_type, sessions_count)",
          )
          .eq("student_id", student.id)
          .eq("tenant_id", tenant.id)
          .eq("payment_status", "completed")
          .order("created_at", { ascending: false }),
        supabase
          .from("enrollments")
          .select("id, course_id, created_at, courses(title, slug, thumbnail_url)")
          .eq("student_id", student.id)
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: true }),
      ]);

      setDigitalPurchases((dpRes.data as any) || []);

      const liveList = (lcRes.data as any) || [];
      if (liveList.length > 0) {
        const liveCourseIds = liveList.map((p: any) => p.live_courses?.id).filter(Boolean);
        const purchaseIds = liveList.map((p: any) => p.id);
        const [{ data: sessionsData }, { data: bookingsData }] = await Promise.all([
          supabase
            .from("public_live_course_sessions" as any)
            .select("id, live_course_id, title, session_date, session_time, duration_minutes, zoom_join_url")
            .in("live_course_id", liveCourseIds)
            .order("session_date", { ascending: true }),
          supabase
            .from("consultation_bookings")
            .select("id, purchase_id, booking_date, booking_time, duration_minutes, meeting_link, status")
            .in("purchase_id", purchaseIds),
        ]);
        // Safety net: a Zoom appointment must always carry a meeting link.
        const zoomCourseIds = new Set(
          liveList.filter((p: any) => p.live_courses?.attendance_type === "zoom").map((p: any) => p.id),
        );
        const missing = ((bookingsData as any[]) || []).filter(
          (b: any) =>
            !b.meeting_link &&
            b.status !== "cancelled" &&
            zoomCourseIds.has(b.purchase_id) &&
            new Date(`${b.booking_date}T${b.booking_time}`).getTime() > Date.now(),
        );
        if (missing.length > 0) {
          await Promise.all(
            missing.map(async (b: any) => {
              try {
                const { data } = await supabase.functions.invoke("booking-ensure-zoom", {
                  body: { booking_id: b.id },
                });
                const link = (data as any)?.join_url;
                if (link) b.meeting_link = link;
              } catch { /* keep the appointment visible without a link */ }
            }),
          );
        }
        // Same safety net for live course sessions: an upcoming Zoom session
        // must always carry a join link.
        const zoomLiveCourseIds = new Set(
          liveList
            .filter((p: any) =>
              p.live_courses?.attendance_type === "zoom" &&
              !p.live_courses?.meeting_link &&
              p.live_courses?.product_type !== "consultation" &&
              p.live_courses?.product_type !== "session_bundle")
            .map((p: any) => p.live_courses?.id),
        );
        const missingSessions = ((sessionsData as any[]) || []).filter(
          (s: any) =>
            !s.zoom_join_url &&
            zoomLiveCourseIds.has(s.live_course_id) &&
            new Date(`${s.session_date}T${s.session_time}`).getTime() > Date.now(),
        ).slice(0, 5);
        if (missingSessions.length > 0) {
          await Promise.all(
            missingSessions.map(async (s: any) => {
              try {
                const { data } = await supabase.functions.invoke("live-session-ensure-zoom", {
                  body: { sessionId: s.id },
                });
                const link = (data as any)?.join_url;
                if (link) s.zoom_join_url = link;
              } catch { /* keep the session visible without a link */ }
            }),
          );
        }
        liveList.forEach((p: any) => {
          p.sessions = (sessionsData || []).filter((s: any) => s.live_course_id === p.live_courses?.id);
          const mine = (bookingsData || []).filter((b: any) => b.purchase_id === p.id)
            .sort((a: any, b: any) => `${a.booking_date}T${a.booking_time}` < `${b.booking_date}T${b.booking_time}` ? -1 : 1);
          p.bookings = mine;
          p.booking = mine.find((b: any) => new Date(`${b.booking_date}T${b.booking_time}`) >= new Date()) || mine[0] || null;
        });
      }
      setLivePurchases(liveList);

      const enrollmentsData = enrollmentsRes.data;

      // Load actual yearly subscription purchase (if any)
      const { data: subRow } = await supabase
        .from("subscription_purchases" as any)
        .select("starts_at, expires_at, payment_status")
        .eq("student_id", student.id)
        .eq("tenant_id", tenant.id)
        .eq("payment_status", "completed")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let subStart: string | null = null;
      let subExpires: string | null = null;
      if (subRow) {
        subStart = (subRow as any).starts_at;
        subExpires = (subRow as any).expires_at;
        setSubscriptionStart(subStart);
        setSubscriptionExpiresAt(subExpires);
      }

      if (enrollmentsData && enrollmentsData.length > 0) {
        const courseIds = enrollmentsData.map((e) => e.course_id);

        // Batch: get ALL sections, lessons, and progress in parallel
        const [sectionsResult, progressResult, watchResult] = await Promise.all([
          supabase.from("course_sections").select("id, course_id").in("course_id", courseIds),
          supabase
            .from("lesson_progress")
            .select("lesson_id, completed_at")
            .eq("student_id", student.id)
            .eq("completed", true),
          supabase
            .from("watch_progress")
            .select("lesson_id, position_seconds, duration_seconds")
            .eq("student_id", student.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const allSections = sectionsResult.data || [];
        const sectionIds = allSections.map((s) => s.id);

        // Build section->course mapping
        const sectionToCourse = new Map<string, string>();
        allSections.forEach((s) => sectionToCourse.set(s.id, s.course_id));

        // Fetch all lessons for all sections in one query
        const { data: allLessons } =
          sectionIds.length > 0
            ? await supabase.from("lessons").select("id, section_id").in("section_id", sectionIds).eq("is_published", true)
            : { data: [] as { id: string; section_id: string }[] };

        // Build lesson->course and course->lessons maps
        const lessonToCourse = new Map<string, string>();
        const courseLessonCounts = new Map<string, number>();
        (allLessons || []).forEach((l) => {
          const cId = sectionToCourse.get(l.section_id);
          if (cId) {
            lessonToCourse.set(l.id, cId);
            courseLessonCounts.set(cId, (courseLessonCounts.get(cId) || 0) + 1);
          }
        });

        // Build course->completed counts from progress
        const allProgress = progressResult.data || [];
        const courseCompletedCounts = new Map<string, number>();
        const courseLastCompleted = new Map<string, string>();
        const allLessonIds = new Set((allLessons || []).map((l) => l.id));
        allProgress.forEach((p) => {
          if (!allLessonIds.has(p.lesson_id)) return;
          const cId = lessonToCourse.get(p.lesson_id);
          if (cId) {
            courseCompletedCounts.set(cId, (courseCompletedCounts.get(cId) || 0) + 1);
            if (p.completed_at) {
              const prev = courseLastCompleted.get(cId);
              if (!prev || p.completed_at > prev) courseLastCompleted.set(cId, p.completed_at);
            }
          }
        });

        const enriched: Enrollment[] = enrollmentsData.map((e) => ({
          ...e,
          courses: e.courses as any,
          totalLessons: courseLessonCounts.get(e.course_id) || 0,
          completedLessons: courseCompletedCounts.get(e.course_id) || 0,
          lastCompletedAt: courseLastCompleted.get(e.course_id) || null,
          allLessonIds: (allLessons || []).filter((l) => lessonToCourse.get(l.id) === e.course_id).map((l) => l.id),
        }));
        setEnrollments(enriched);

        let resolvedLastWatched: LastWatched | null = null;
        // Process last watched
        const watchData = watchResult.data;
        if (watchData && Number(watchData.position_seconds) > 2) {
          const watchedCourseId = lessonToCourse.get(watchData.lesson_id);
          if (watchedCourseId) {
            const matchedEnrollment = enriched.find((en) => en.course_id === watchedCourseId);
            if (matchedEnrollment) {
              // Get lesson title
              const { data: lessonData } = await supabase
                .from("lessons")
                .select("id, title")
                .eq("id", watchData.lesson_id)
                .single();
              if (lessonData) {
                resolvedLastWatched = {
                  lessonId: lessonData.id,
                  lessonTitle: lessonData.title,
                  courseSlug: matchedEnrollment.courses.slug,
                  courseTitle: matchedEnrollment.courses.title,
                  positionSeconds: Number(watchData.position_seconds),
                  durationSeconds: Number(watchData.duration_seconds),
                  thumbnailUrl: matchedEnrollment.courses.thumbnail_url,
                };
                setLastWatched(resolvedLastWatched);
              }
            }
          }
        }

        queryClient.setQueryData(cacheKey, {
          tenant,
          yearlyPlan: plan
            ? {
                price: Number(plan.price),
                description: plan.description,
                features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
                is_active: plan.is_active,
              }
            : null,
          studentInfo: student,
          digitalPurchases: (dpRes.data as any) || [],
          livePurchases: liveList,
          enrollments: enriched,
          subscriptionStart: subStart,
          subscriptionExpiresAt: subExpires,
          lastWatched: resolvedLastWatched,
        });
      } else {
        setEnrollments([]);
        queryClient.setQueryData(cacheKey, {
          tenant,
          yearlyPlan: plan
            ? {
                price: Number(plan.price),
                description: plan.description,
                features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
                is_active: plan.is_active,
              }
            : null,
          studentInfo: student,
          digitalPurchases: (dpRes.data as any) || [],
          livePurchases: liveList,
          enrollments: [],
          subscriptionStart: subStart,
          subscriptionExpiresAt: subExpires,
          lastWatched: null,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(urls.profileUrl());
  };

  // Overall stats
  const totalAllLessons = enrollments.reduce((s, e) => s + e.totalLessons, 0);
  const completedAllLessons = enrollments.reduce((s, e) => s + e.completedLessons, 0);
  const overallProgress = totalAllLessons > 0 ? Math.round((completedAllLessons / totalAllLessons) * 100) : 0;
  const completedCourses = enrollments.filter(
    (e) => e.totalLessons > 0 && e.completedLessons === e.totalLessons,
  ).length;

  if ((authLoading || loading) && !studentInfo) {
    return <StudentDashboardSkeleton />;
  }

  if (!user) {
    return (
      <>
        <TenantThemeInjector primaryColor={tenantPrimaryColor} />
        <SessionExpiredGate
          mentorName={tenantName}
          mentorImage={tenantImage}
          mentorSlug={mentorSlug}
          onBackHome={() => navigate(urls.profileUrl())}
        />
      </>
    );
  }


  return (
    <div className="min-h-screen bg-[#fafafa]">
      <InstallAppBanner />
      <header className="glass-strong border-b border-border/50 sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
          <Link to={urls.profileUrl()} className="flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-80 transition-opacity">
            {tenantImage ? (
              <img
                src={tenantImage}
                alt={tenantName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 border border-border/50"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs sm:text-sm shrink-0">
                {tenantName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm truncate">{tenantName}</p>
              {tenantSpecialty && (
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{tenantSpecialty}</p>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            {tenantId && <NotificationBell tenantId={tenantId} />}
            {subscriptionsEnabled && subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date() && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("subscription")}
                  className={`hidden sm:inline-flex ${activeTab === "subscription" ? "text-primary" : ""}`}
                >
                  <Crown className="w-4 h-4 me-1" />
                  {t("miscPublic.studentDashboard.mySubscription")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveTab("subscription")}
                  className={`sm:hidden ${activeTab === "subscription" ? "text-primary" : ""}`}
                >
                  <Crown className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTab("change-password")}
              className={activeTab === "change-password" ? "text-primary" : ""}
            >
              <KeyRound className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hidden sm:inline-flex"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 me-1" />
              {t("miscPublic.studentDashboard.signOut")}
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive sm:hidden" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6 sm:py-8 px-3 sm:px-6">
        {activeTab === "courses" && (() => {
          const firstName = (studentInfo?.full_name || "").split(" ")[0];
          const completedCount = enrollments.filter(e => e.totalLessons > 0 && e.completedLessons === e.totalLessons).length;
          const inProgressCount = enrollments.filter(e => e.totalLessons > 0 && e.completedLessons > 0 && e.completedLessons < e.totalLessons).length
            + livePurchases.filter(p => p.live_courses?.product_type !== "consultation").length
            + digitalPurchases.length;
          const certificatesCount = completedCount;

          // Continue-learning: use lastWatched
          const continueLesson = lastWatched;
          const continuePct = continueLesson && continueLesson.durationSeconds > 0
            ? Math.min(100, Math.round((continueLesson.positionSeconds / continueLesson.durationSeconds) * 100))
            : 0;

          type LiveSession = { id: string; title: string; session_date: string; session_time: string; duration_minutes: number; zoom_join_url?: string | null };
          type CardItem =
            | { kind: "recorded"; key: string; title: string; thumb: string | null; slug: string; enrollment: Enrollment; sortAt: string }
            | { kind: "live"; key: string; title: string; thumb: string | null; nextAt: Date | null; nextSession: LiveSession | null; pastSessions: LiveSession[]; purchase: LiveCoursePurchase; sortAt: string }
            | { kind: "consultation"; key: string; title: string; thumb: string | null; bookingAt: Date | null; duration: number | null; purchase: LiveCoursePurchase; sortAt: string; isBundle?: boolean; total?: number; remaining?: number }
            | { kind: "digital"; key: string; title: string; thumb: string | null; slug: string; purchaseId: string; sortAt: string };

          const items: CardItem[] = [];
          enrollments.forEach(e => {
            items.push({ kind: "recorded", key: `r-${e.id}`, title: e.courses.title, thumb: e.courses.thumbnail_url, slug: e.courses.slug, enrollment: e, sortAt: e.lastCompletedAt || "" });
          });
          livePurchases.forEach(p => {
            const lc = p.live_courses; if (!lc) return;
            if (lc.product_type === "consultation" || lc.product_type === "session_bundle") {
              const b = p.booking;
              const isBundle = lc.product_type === "session_bundle";
              const total = isBundle ? ((lc as any).sessions_count || 1) : 1;
              const booked = ((p as any).bookings || []).length;
              items.push({
                kind: "consultation", key: `c-${p.id}`, title: lc.title, thumb: lc.thumbnail_url,
                bookingAt: b ? new Date(`${b.booking_date}T${b.booking_time}`) : null,
                duration: b?.duration_minutes ?? null, purchase: p, sortAt: p.created_at,
                isBundle, total, remaining: Math.max(0, total - booked),
              });
            } else {
              const now = new Date();
              const sorted = [...(p.sessions || [])].sort((a, b) =>
                `${a.session_date}T${a.session_time}` < `${b.session_date}T${b.session_time}` ? -1 : 1);
              const upcoming = sorted.filter(s => new Date(`${s.session_date}T${s.session_time}`) >= now);
              const past = sorted.filter(s => new Date(`${s.session_date}T${s.session_time}`) < now).reverse();
              const next = upcoming[0] || null;
              items.push({
                kind: "live", key: `l-${p.id}`, title: lc.title, thumb: lc.thumbnail_url,
                nextAt: next ? new Date(`${next.session_date}T${next.session_time}`) : null,
                nextSession: next, pastSessions: past,
                purchase: p, sortAt: p.created_at,
              });
            }
          });
          digitalPurchases.forEach(p => {
            const d = p.digital_products; if (!d) return;
            items.push({ kind: "digital", key: `d-${p.id}`, title: d.title, thumb: d.thumbnail_url, slug: d.slug, purchaseId: p.id, sortAt: p.created_at });
          });

          const buckets = {
            all: items.length,
            recorded: items.filter(i => i.kind === "recorded").length,
            live: items.filter(i => i.kind === "live").length,
            digital: items.filter(i => i.kind === "digital").length,
            consultation: items.filter(i => i.kind === "consultation").length,
          };
          const filtered = activeFilter === "all" ? items : items.filter(i => i.kind === activeFilter);
          const fmtDate = (d: Date) => d.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" });

          return (
            <div className="max-w-6xl mx-auto space-y-8">

              {/* Continue Learning Hero */}
              {continueLesson && (
                <section className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <Link
                      to={urls.lessonUrl(continueLesson.courseSlug, continueLesson.lessonId)}
                      onMouseEnter={preloadLessonViewer}
                      onFocus={preloadLessonViewer}
                      className="w-full md:w-1/3 aspect-video rounded-xl overflow-hidden bg-slate-800 relative group flex-shrink-0"
                    >
                      {continueLesson.thumbnailUrl ? (
                        <img src={continueLesson.thumbnailUrl} alt={continueLesson.courseTitle} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition" />
                      ) : (
                        <div className="w-full h-full bg-slate-800" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <PlayCircle className="w-8 h-8 text-primary-foreground" />
                        </div>
                      </div>
                    </Link>
                    <div className="flex-1 space-y-4 w-full">
                      <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
                        {t("miscPublic.studentDashboard.heroContinuePill")}
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold leading-snug line-clamp-2">
                        {continueLesson.courseTitle}
                      </h2>
                      <p className="text-sm text-white/70 line-clamp-1">{continueLesson.lessonTitle}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all" style={{ width: `${continuePct}%` }} />
                        </div>
                        <span className="text-sm font-medium">{toAr(continuePct)}%</span>
                      </div>
                      <Link
                        to={urls.lessonUrl(continueLesson.courseSlug, continueLesson.lessonId)}
                        onMouseEnter={preloadLessonViewer}
                        onFocus={preloadLessonViewer}
                      >
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold text-base h-auto">
                          {t("miscPublic.studentDashboard.heroCta")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </section>
              )}


              {/* Empty state */}
              {items.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-border/50">
                  <GraduationCap className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">{t("miscPublic.studentDashboard.noCoursesYet")}</p>
                  <Link to={urls.profileUrl()}>
                    <Button className="rounded-xl">{t("miscPublic.studentDashboard.browseCourses")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((it) => {
                    const shell = "bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md hover:-translate-y-0.5";
                    const thumbEl = it.thumb ? (
                      <img src={it.thumb} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        {it.kind === "digital" ? <Package className="w-10 h-10 text-muted-foreground" /> :
                         it.kind === "recorded" ? <BookOpen className="w-10 h-10 text-muted-foreground" /> :
                         <Video className="w-10 h-10 text-muted-foreground" />}
                      </div>
                    );

                    if (it.kind === "recorded") {
                      const e = it.enrollment;
                      const pct = e.totalLessons > 0 ? Math.round((e.completedLessons / e.totalLessons) * 100) : 0;
                      const done = pct === 100;
                      const targetLessonUrl = (lastWatched && lastWatched.courseSlug === it.slug)
                        ? urls.lessonUrl(it.slug, lastWatched.lessonId)
                        : urls.lessonUrl(it.slug);
                      return (
                        <div key={it.key} className={shell}>
                          <Link
                            to={targetLessonUrl}
                            onMouseEnter={preloadLessonViewer}
                            onFocus={preloadLessonViewer}
                            className="aspect-video bg-muted relative block overflow-hidden"
                          >
                            {thumbEl}
                            <span className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-foreground">
                              {t("miscPublic.studentDashboard.badgeRecorded")}
                            </span>
                          </Link>
                          <div className="p-5 flex-1 flex flex-col">
                            <Link
                              to={targetLessonUrl}
                              onMouseEnter={preloadLessonViewer}
                              onFocus={preloadLessonViewer}
                            >
                              <h3 className="font-bold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors">{it.title}</h3>
                            </Link>
                            <div className="mt-auto space-y-3">
                              <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${done ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex justify-between items-center text-xs gap-2">
                                <span className={`font-bold ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
                                  {done ? t("miscPublic.studentDashboard.statusCompleted") : `${toAr(pct)}%`}
                                </span>
                                <div className="flex items-center gap-2">
                                  {done && e.lastCompletedAt && (
                                    <CourseCertificate
                                      studentName={studentInfo?.full_name || ""}
                                      courseName={it.title}
                                      mentorName={tenantName}
                                      completionDate={e.lastCompletedAt}
                                      certificateId={e.id.slice(0, 8).toUpperCase()}
                                      tenantId={tenantId}
                                      mentorSlug={mentorSlug!}
                                    />
                                  )}
                                  <Link
                                    to={targetLessonUrl}
                                    onMouseEnter={preloadLessonViewer}
                                    onFocus={preloadLessonViewer}
                                  >
                                    <Button size="sm" variant={done ? "outline" : "default"} className="h-8 rounded-lg text-xs gap-1.5">
                                      <Play className="w-3.5 h-3.5" />
                                      {t("miscPublic.studentDashboard.watch", { defaultValue: "مشاهدة" })}
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (it.kind === "live") {
                      return (
                        <div key={it.key} className={shell}>
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {thumbEl}
                            <span className="absolute top-3 right-3 bg-red-500 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white">
                              {t("miscPublic.studentDashboard.badgeLive")}
                            </span>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-foreground mb-2 line-clamp-2">{it.title}</h3>
                            {(() => {
                              const lc = it.purchase.live_courses;
                              const isOnline = lc?.attendance_type === "zoom" || lc?.attendance_type === "online";
                              const joinLink = sanitizeStudentMeetingLink(it.nextSession?.zoom_join_url || lc?.meeting_link || null);
                              return (
                            <div className="mt-auto">
                              <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-500/20">
                                <p className="text-[11px] text-red-600 dark:text-red-400 mb-1 font-medium">
                                  {t("miscPublic.studentDashboard.nextSessionLabel")}
                                </p>
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">
                                  {it.nextAt ? fmtDate(it.nextAt) : t("miscPublic.studentDashboard.noSessionYet")}
                                </p>
                                {it.nextSession?.title && (
                                  <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5 line-clamp-1">{it.nextSession.title}</p>
                                )}
                              </div>
                              {isOnline && (
                                joinLink ? (
                                  <a href={joinLink} target="_blank" rel="noopener noreferrer">
                                    <Button className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                      <ExternalLink className="w-4 h-4" />
                                      {lc?.attendance_type === "zoom"
                                        ? t("miscPublic.studentDashboard.joinZoom")
                                        : t("miscPublic.studentDashboard.joinMeeting")}
                                    </Button>
                                  </a>
                                ) : it.nextAt ? (
                                  <Button disabled className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                    <Clock className="w-4 h-4" />
                                    {t("miscPublic.studentDashboard.joinLinkSoon")}
                                  </Button>
                                ) : null
                              )}
                              {it.pastSessions.length > 0 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full gap-2 mt-2 rounded-xl">
                                      <HistoryIcon className="w-4 h-4" />
                                      {t("miscPublic.studentDashboard.viewPastSessions")} ({toAr(it.pastSessions.length)})
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>{t("miscPublic.studentDashboard.pastSessionsTitle")}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                      {it.pastSessions.map((s) => (
                                        <div key={s.id} className="p-3 rounded-xl border border-border/60 bg-muted/40">
                                          <p className="text-sm font-semibold text-foreground line-clamp-1">
                                            {s.title || it.title}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {fmtDate(new Date(`${s.session_date}T${s.session_time}`))}
                                            {s.duration_minutes ? ` · ${toAr(s.duration_minutes)} ${t("miscPublic.studentDashboard.minutesShort")}` : ""}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    }

                    if (it.kind === "consultation") {
                      return (
                        <div key={it.key} className={shell}>
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {thumbEl}
                            <span className="absolute top-3 right-3 bg-amber-500 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white">
                              {it.isBundle
                                ? t("liveCourse.page.sessionsInBundle", { n: it.total })
                                : t("miscPublic.studentDashboard.badgeConsultation")}
                            </span>
                          </div>
                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-foreground mb-2 line-clamp-2">{it.title}</h3>
                            <div className="mt-auto">
                              {it.isBundle ? (
                                <>
                                  <div className="flex items-center justify-between gap-2 text-[11px] font-medium mb-2">
                                    <span className="text-muted-foreground">
                                      {t("liveCourse.bundle.bookedSessions")}: {(it.total ?? 0) - (it.remaining ?? 0)} / {it.total}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {t("liveCourse.bundle.remainingSessions")}: {it.remaining}
                                    </span>
                                  </div>
                                  <div className="bg-muted/50 p-3 rounded-xl border border-border/60 space-y-2">
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                      {t("liveCourse.bundle.myBookings")}
                                    </p>
                                    {(((it.purchase as any).bookings || []) as any[]).length === 0 ? (
                                      <p className="text-sm font-bold text-foreground">
                                        {t("miscPublic.studentDashboard.noSessionYet")}
                                      </p>
                                    ) : (
                                      (((it.purchase as any).bookings || []) as any[]).map((b: any, i: number) => {
                                        const lc: any = it.purchase.live_courses;
                                        const joinLink = sanitizeStudentMeetingLink(b.meeting_link || (lc?.attendance_type === "online" ? lc?.meeting_link : null));
                                        return (
                                        <div key={`${b.booking_date}-${b.booking_time}-${i}`} className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-bold text-foreground">
                                            {fmtDate(new Date(`${b.booking_date}T${b.booking_time}`))}
                                          </span>
                                          {joinLink && (
                                            <a href={joinLink} target="_blank" rel="noopener noreferrer"
                                              className="text-[11px] font-semibold text-primary hover:underline shrink-0">
                                              {t("miscPublic.studentDashboard.joinMeeting")}
                                            </a>
                                          )}
                                        </div>
                                        );
                                      })
                                    )}
                                  </div>
                                  {it.purchase.live_courses?.slug && (
                                    <Link to={urls.mentorPath(`/l/${it.purchase.live_courses.slug}/booking`)}>
                                      <Button
                                        variant={(it.remaining ?? 0) > 0 ? "default" : "outline"}
                                        className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                        <CalendarClock className="w-4 h-4" />
                                        {(it.remaining ?? 0) > 0
                                          ? t("liveCourse.page.manageBundleBookings")
                                          : t("miscPublic.studentDashboard.viewSessionDetails")}
                                      </Button>
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <>
                              <div className="bg-muted/50 p-3 rounded-xl border border-border/60">
                                <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                                  {t("miscPublic.studentDashboard.appointmentLabel")}
                                </p>
                                <p className="text-sm font-bold text-foreground">
                                  {it.bookingAt ? fmtDate(it.bookingAt) : t("miscPublic.studentDashboard.noSessionYet")}
                                </p>
                              </div>
                              {it.bookingAt && it.purchase.booking?.meeting_link && (
                                <a href={sanitizeStudentMeetingLink(it.purchase.booking.meeting_link) ?? undefined} target="_blank" rel="noopener noreferrer">
                                  <Button className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                    <ExternalLink className="w-4 h-4" />
                                    {t("miscPublic.studentDashboard.joinMeeting")}
                                  </Button>
                                </a>
                              )}
                              {it.bookingAt && !it.purchase.booking?.meeting_link && it.purchase.live_courses?.slug && (
                                <Link to={urls.mentorPath(`/live/${it.purchase.live_courses.slug}`)}>
                                  <Button variant="outline" className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                    <CalendarClock className="w-4 h-4" />
                                    {t("miscPublic.studentDashboard.viewSessionDetails")}
                                  </Button>
                                </Link>
                              )}
                                </>
                              )}

                              {!it.isBundle && !it.bookingAt && it.purchase.live_courses?.slug && (
                                <Link to={urls.mentorPath(`/live/${it.purchase.live_courses.slug}`)}>
                                  <Button className="w-full gap-2 mt-3 rounded-xl" size="sm">
                                    <CalendarClock className="w-4 h-4" />
                                    {t("miscPublic.studentDashboard.bookAppointment")}
                                  </Button>
                                </Link>
                              )}

                            </div>
                          </div>
                        </div>
                      );
                    }

                    // digital
                    return (
                      <Link key={it.key} to={urls.mentorPath(`/p/${it.slug}/delivery?purchase=${it.purchaseId}`)} className={shell}>
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {thumbEl}
                          <span className="absolute top-3 right-3 bg-blue-500 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white">
                            {t("miscPublic.studentDashboard.badgeDigital")}
                          </span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-bold text-foreground mb-2 line-clamp-2">{it.title}</h3>
                          <div className="mt-auto pt-4">
                            <div className="w-full py-2 bg-muted/60 border border-border/60 rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                              <Download className="w-4 h-4" />
                              {t("miscPublic.studentDashboard.downloadFile")}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === "change-password" && (
          <div>
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setActiveTab("courses")}>
              <ArrowRight className="w-4 h-4 me-1 rtl:rotate-0 ltr:rotate-180" />
              {t("miscPublic.studentDashboard.backToCourses")}
            </Button>
            <ChangePassword />
          </div>
        )}

        {activeTab === "subscription" &&
          (() => {
            const startDate = subscriptionStart ? new Date(subscriptionStart) : null;
            const renewalDate = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
            const now = new Date();
            const isActive = !!renewalDate && renewalDate > now;
            const daysLeft = renewalDate
              ? Math.max(0, Math.ceil((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
              : 0;
            const fmt = (d: Date) =>
              d.toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" });
            const waMsg = encodeURIComponent(
              t("miscPublic.studentDashboard.waMessage", { name: studentInfo?.full_name || "", mentor: tenantName }),
            );
            const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${waMsg}` : null;

            return (
              <div className="max-w-4xl mx-auto">
                <Button variant="ghost" size="sm" className="mb-4" onClick={() => setActiveTab("courses")}>
                  <ArrowRight className="w-4 h-4 me-1 rtl:rotate-0 ltr:rotate-180" />
                  {t("miscPublic.studentDashboard.backToCourses")}
                </Button>

                <div className="mb-6">
                  <h1 className="text-2xl font-bold mb-1">
                    {t("miscPublic.studentDashboard.annualSubscriptionTitle")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("miscPublic.studentDashboard.annualSubscriptionSubtitle", { mentor: tenantName })}
                  </p>
                </div>

                {!yearlyPlan || !yearlyPlan.is_active ? (
                  <div className="glass-card rounded-2xl p-10 text-center border border-border/50">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">{t("miscPublic.studentDashboard.noYearlyPlan")}</p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl glass-card border border-border/50 shadow-card">
                    <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary opacity-10 blur-3xl pointer-events-none" />

                    <div className="relative p-6 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Crown className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold">{t("miscPublic.studentDashboard.yearlyPlan")}</h2>
                            <p className="text-xs text-muted-foreground">
                              {yearlyPlan.description || t("miscPublic.studentDashboard.yearlyPlanDefaultDesc")}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isActive ? "bg-green-500/15 text-green-700" : "bg-destructive/15 text-destructive"}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isActive
                            ? t("miscPublic.studentDashboard.statusActive")
                            : t("miscPublic.studentDashboard.statusInactive")}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-xl bg-muted/40 p-4">
                          <p className="text-[11px] text-muted-foreground mb-1">
                            {t("miscPublic.studentDashboard.annualPrice")}
                          </p>
                          <p className="text-lg font-black text-primary">
                            {t("miscPublic.studentDashboard.priceEgp", {
                              value: yearlyPlan.price.toLocaleString(dateLocale),
                            })}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/40 p-4">
                          <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {t("miscPublic.studentDashboard.subscriptionStartDate")}
                          </p>
                          <p className="text-sm font-bold">{startDate ? fmt(startDate) : "—"}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 p-4">
                          <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {t("miscPublic.studentDashboard.renewalDate")}
                          </p>
                          <p className="text-sm font-bold">{renewalDate ? fmt(renewalDate) : "—"}</p>
                          {isActive && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {t("miscPublic.studentDashboard.daysRemaining", { count: daysLeft })}
                            </p>
                          )}
                        </div>
                      </div>

                      {yearlyPlan.features.length > 0 && (
                        <div className="mb-6">
                          <p className="text-sm font-bold mb-3">{t("miscPublic.studentDashboard.planFeatures")}</p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {yearlyPlan.features.filter(Boolean).map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-border/50 bg-muted/30 p-4 mb-6">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("miscPublic.studentDashboard.subscriptionFooterNote")}
                        </p>
                      </div>

                      {waLink && (
                        <Button asChild className="gradient-primary text-primary-foreground border-0 w-full sm:w-auto">
                          <a href={waLink} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4 me-2" />
                            {t("miscPublic.studentDashboard.contactMentor")}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      <footer className="mt-10 py-6 flex items-center justify-center">
        <a
          href="https://ebdaey.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <img
            src={i18n.language?.startsWith("en") ? poweredByEnglish.url : poweredByArabic.url}
            alt="Ebdaey"
            className="h-6 w-auto opacity-80"
          />
        </a>
      </footer>

      {whatsapp && <MentorWhatsAppButton phoneNumber={whatsapp} showDualOptions position="bottom-start" />}
    </div>
  );
};

export default StudentDashboard;
