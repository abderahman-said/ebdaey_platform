import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import poweredByArabic from "@/assets/powered-by-arabic.png.asset.json";
import poweredByEnglish from "@/assets/powered-by-english.png.asset.json";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import DOMPurify from "dompurify";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useBrandedPageTitle } from "@/hooks/useBrandedPageTitle";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import {
  ArrowRight, Play, FileText, Clock, Headphones, Image, CheckCircle, Circle,
  ChevronDown, ChevronUp, Menu, X, FolderOpen, Award, PartyPopper,
  Type, Code, Download, HelpCircle, BookOpen, Monitor, Video, ShoppingBag, Tag, ExternalLink, MessageCircle, Lock
} from "lucide-react";
import CourseCertificate from "@/components/student/CourseCertificate";
import QuizViewer from "@/components/student/QuizViewer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentor, queryClient } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import RichTextContent from "@/components/common/RichTextContent";
import ContentProtection from "@/components/auth/ContentProtection";
import { fetchStudentRestrictions, findBlockingRestriction } from "@/lib/contentProtection";
import StudentQAChat from "@/components/student/StudentQAChat";
import LessonActionsFab from "@/components/course/LessonActionsFab";


interface Section {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  video_url: string | null;
  pdf_url: string | null;
  audio_url: string | null;
  image_url: string | null;
  text_content: string | null;
  embed_code: string | null;
  download_url: string | null;
  download_filename: string | null;
  sort_order: number;
  section_id: string;
  is_preview: boolean;
}

const contentIcon = (type: string) => {
  switch (type) {
    case "video": return <Play className="w-4 h-4" />;
    case "pdf": return <FileText className="w-4 h-4" />;
    case "audio": return <Headphones className="w-4 h-4" />;
    case "image": return <Image className="w-4 h-4" />;
    case "text": return <Type className="w-4 h-4" />;
    case "embed": return <Code className="w-4 h-4" />;
    case "download": return <Download className="w-4 h-4" />;
    case "quiz": return <HelpCircle className="w-4 h-4" />;
    case "epub": return <BookOpen className="w-4 h-4" />;
    case "office": return <Monitor className="w-4 h-4" />;
    case "zoom": return <Video className="w-4 h-4" />;
    case "featured_product": return <ShoppingBag className="w-4 h-4" />;
    case "upsell": return <Tag className="w-4 h-4" />;
    default: return <Play className="w-4 h-4" />;
  }
};

interface LessonViewerBundle {
  tenantId: string;
  mentorName: string;
  primaryColor: string | null;
  whatsappNumber: string | null;
  courseTitle: string;
  communityLink: string | null;
  courseId: string;
  qaBotEnabled: boolean;
  studentId: string | null;
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  enrolled: boolean;
  enrollmentId: string | null;
  completedLessons: string[];
  sections: Section[];
}

const LessonViewer = () => {
  const { courseSlug, lessonId } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const cacheKey = useMemo(
    () => ["lesson-viewer-bundle", mentorSlug || "global", courseSlug || "none", user?.id || "guest"],
    [mentorSlug, courseSlug, user?.id]
  );
  const initialCache = useMemo(
    () => queryClient.getQueryData<LessonViewerBundle>(cacheKey),
    [cacheKey]
  );
  const hasCache = !!initialCache;

  const [sections, setSections] = useState<Section[]>(() => initialCache?.sections || []);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(() => {
    if (!initialCache?.sections) return null;
    const allL = initialCache.sections.flatMap((s) => s.lessons);
    const accessible = initialCache.enrolled ? allL : allL.filter((l) => l.is_preview);
    if (lessonId) {
      return accessible.find((l) => l.id === lessonId) || null;
    }
    return accessible[0] || null;
  });
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    () => new Set(initialCache?.completedLessons || [])
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(initialCache?.sections.map((s) => s.id) || [])
  );
  const [studentId, setStudentId] = useState<string | null>(() => initialCache?.studentId || null);
  const [tenantId, setTenantId] = useState<string | null>(() => initialCache?.tenantId || null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(() => initialCache?.whatsappNumber || null);
  const [courseId, setCourseId] = useState<string | null>(() => initialCache?.courseId || null);
  const [qaBotEnabled, setQaBotEnabled] = useState(() => initialCache?.qaBotEnabled || false);
  
  const [isEnrolled, setIsEnrolled] = useState(() => initialCache?.enrolled || false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(() => initialCache?.enrollmentId || null);
  const [enrollmentChecked, setEnrollmentChecked] = useState(() => hasCache);
  const [courseTitle, setCourseTitle] = useState(() => initialCache?.courseTitle || "");
  const [communityLink, setCommunityLink] = useState<string | null>(() => initialCache?.communityLink || null);
  const [qaChatOpen, setQaChatOpen] = useState(false);
  const [mentorName, setMentorName] = useState(() => initialCache?.mentorName || "");
  useBrandedPageTitle(t("miscPublic.studentDashboard.tabTitles.lesson"), mentorName);
  const [studentName, setStudentName] = useState(() => initialCache?.studentName || "");
  const [studentEmail, setStudentEmail] = useState(() => initialCache?.studentEmail || "");
  const [studentPhone, setStudentPhone] = useState<string | null>(() => initialCache?.studentPhone || null);
  const [loading, setLoading] = useState(() => !hasCache);
  const [showCelebration, setShowCelebration] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string | null>(() => initialCache?.primaryColor || null);
  const [videoInitialTime, setVideoInitialTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval>>();
  const lastSavedTimeRef = useRef<{ time: number; duration: number }>({ time: 0, duration: 0 });
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [blockedScope, setBlockedScope] = useState<string | null>(null);

  useEffect(() => {
    loadCourseData();
  }, [mentorSlug, courseSlug]);

  // Admin-applied content protection restrictions
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    fetchStudentRestrictions(studentId).then((list) => {
      if (cancelled) return;
      const blocking = findBlockingRestriction(list, courseId);
      setBlockedScope(blocking?.scope || null);
      setBlockedReason(blocking ? blocking.reason || "" : null);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId, courseId]);

  // Load saved watch position when lesson changes via route param (e.g. browser back/forward)
  useEffect(() => {
    if (!enrollmentChecked || sections.length === 0 || !lessonId) return;
    if (currentLesson?.id === lessonId) return;

    const allL = sections.flatMap((s) => s.lessons);
    const accessible = isEnrolled ? allL : allL.filter((l) => l.is_preview);
    const target = accessible.find((l) => l.id === lessonId);
    if (target) {
      if (!isEnrolled) {
        navigate(urls.courseUrl(courseSlug!), { replace: true });
        return;
      }
      setCurrentLesson(target);
      setVideoInitialTime(0);
      if (studentId && target.content_type === "video") {
        loadWatchProgress(target.id);
      }
    } else if (!isEnrolled) {
      navigate(urls.courseUrl(courseSlug!), { replace: true });
    }
  }, [lessonId, sections, studentId, enrollmentChecked, isEnrolled, currentLesson?.id, courseSlug]);

  // Save watch progress periodically (every 5 seconds)
  const handleVideoTimeUpdate = useCallback((time: number, dur: number) => {
    lastSavedTimeRef.current = { time, duration: dur };
  }, []);

  useEffect(() => {
    if (!studentId || !currentLesson || !tenantId || currentLesson.content_type !== "video") return;
    
    const interval = setInterval(() => {
      const { time, duration } = lastSavedTimeRef.current;
      if (time > 0 && duration > 0) {
        saveWatchProgress(currentLesson.id, time, duration);
      }
    }, 5000);
    
    saveTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [studentId, currentLesson?.id, tenantId]);

  const loadWatchProgress = async (lid: string) => {
    if (!studentId) return;
    const { data } = await supabase
      .from("watch_progress")
      .select("position_seconds")
      .eq("student_id", studentId)
      .eq("lesson_id", lid)
      .maybeSingle();
    if (data && Number(data.position_seconds) > 2) {
      setVideoInitialTime(Number(data.position_seconds));
    }
  };

  const saveWatchProgress = async (lid: string, position: number, dur: number) => {
    if (!studentId || !tenantId) return;
    await supabase.from("watch_progress").upsert({
      student_id: studentId,
      lesson_id: lid,
      tenant_id: tenantId,
      position_seconds: Math.floor(position),
      duration_seconds: Math.floor(dur),
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id,lesson_id" });
  };

  const loadCourseData = async () => {
    try {
      // 1. Fetch mentor/tenant
      const tenant = await fetchMentor(mentorSlug!);
      if (!tenant) return;
      setTenantId(tenant.id);
      setMentorName(tenant.name);
      if (tenant.primary_color) {
        setPrimaryColor(tenant.primary_color);
      }
      if (tenant.whatsapp_number) {
        setWhatsappNumber(tenant.whatsapp_number);
      }

      // 2. Parallel batch 1: course + student + mentor ownership check
      const [courseRes, studentRes, tenantOwnerRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, community_link, qa_bot_enabled")
          .eq("tenant_id", tenant.id)
          .eq("slug", courseSlug!)
          .maybeSingle(),
        user
          ? supabase
              .from("students")
              .select("id, full_name, email, phone")
              .eq("user_id", user.id)
              .eq("tenant_id", tenant.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from("tenants")
              .select("id")
              .eq("id", tenant.id)
              .eq("owner_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const course = courseRes.data;
      if (!course) return;
      setCourseTitle(course.title);
      setCommunityLink(course.community_link);
      setCourseId(course.id);
      setQaBotEnabled(!!course.qa_bot_enabled);

      const isMentorOwner = !!tenantOwnerRes.data;

      const student = studentRes.data;
      if (student) {
        setStudentId(student.id);
        setStudentName(student.full_name);
        setStudentEmail(student.email || "");
        setStudentPhone(student.phone || null);
      }

      // 3. Parallel batch 2: sections + enrollment + progress + watch progress
      const [sectionsRes, enrollmentRes, progressRes, watchRes] = await Promise.all([
        supabase
          .from("course_sections")
          .select("id, title, sort_order, course_id")
          .eq("course_id", course.id)
          .order("sort_order"),
        student
          ? supabase
              .from("enrollments")
              .select("id")
              .eq("student_id", student.id)
              .eq("course_id", course.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        student
          ? supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("student_id", student.id)
              .eq("completed", true)
          : Promise.resolve({ data: null }),
        student
          ? supabase
              .from("watch_progress")
              .select("lesson_id, position_seconds")
              .eq("student_id", student.id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const enrolled = isMentorOwner || !!enrollmentRes.data;
      setIsEnrolled(enrolled);
      if (enrollmentRes.data) {
        setEnrollmentId(enrollmentRes.data.id);
      }

      if (progressRes.data) {
        const completed = progressRes.data as Array<{ lesson_id: string }>;
        setCompletedLessons(new Set(completed.map((p) => p.lesson_id)));
      }

      const sectionsData = sectionsRes.data;
      let sectionsWithLessons: Section[] = [];
      if (sectionsData && sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s) => s.id);
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .in("section_id", sectionIds)
          .eq("is_published", true)
          .order("sort_order");

        const lessonsBySection = new Map<string, Lesson[]>();
        (lessonsData || []).forEach((l: unknown) => {
          const lesson = l as Lesson;
          const arr = lessonsBySection.get(lesson.section_id) || [];
          arr.push(lesson);
          lessonsBySection.set(lesson.section_id, arr);
        });

        sectionsWithLessons = sectionsData.map((s) => ({
          ...s,
          lessons: lessonsBySection.get(s.id) || [],
        }));

        setExpandedSections(new Set(sectionIds));
      } else {
        setExpandedSections(new Set());
      }
      setSections(sectionsWithLessons);
      setEnrollmentChecked(true);

      const completedList = progressRes.data ? (progressRes.data as Array<{ lesson_id: string }>).map((p) => p.lesson_id) : [];
      queryClient.setQueryData(cacheKey, {
        tenantId: tenant.id,
        mentorName: tenant.name,
        primaryColor: tenant.primary_color || null,
        whatsappNumber: tenant.whatsapp_number || null,
        courseTitle: course.title,
        communityLink: course.community_link || null,
        courseId: course.id,
        qaBotEnabled: !!course.qa_bot_enabled,
        studentId: student?.id || null,
        studentName: student?.full_name || "",
        studentEmail: student?.email || "",
        studentPhone: student?.phone || null,
        enrolled,
        enrollmentId: enrollmentRes.data?.id || null,
        completedLessons: completedList,
        sections: sectionsWithLessons,
      });

      // Determine initial lesson:
      const allL = sectionsWithLessons.flatMap((s) => s.lessons);
      const accessible = enrolled ? allL : allL.filter((l) => l.is_preview);

      let targetLesson: Lesson | null = null;
      if (lessonId) {
        targetLesson = accessible.find((l) => l.id === lessonId) || null;
      }

      if (!targetLesson && accessible.length > 0) {
        // Resume from last watch position if available, else first accessible lesson
        const lastWatchedId = watchRes.data?.lesson_id;
        const matchedResume = lastWatchedId ? accessible.find((l) => l.id === lastWatchedId) : null;
        targetLesson = matchedResume || accessible[0] || null;

        if (targetLesson) {
          navigate(urls.lessonUrl(courseSlug!, targetLesson.id), { replace: true });
        }
      }

      if (!targetLesson && !enrolled) {
        // Visitor with no accessible preview lessons -> redirect to course page
        navigate(urls.courseUrl(courseSlug!), { replace: true });
        return;
      }

      if (targetLesson) {
        setCurrentLesson(targetLesson);
        setVideoInitialTime(0);
        if (student?.id && targetLesson.content_type === "video") {
          const savedPos = watchRes.data?.lesson_id === targetLesson.id ? Number(watchRes.data.position_seconds || 0) : 0;
          if (savedPos > 2) {
            setVideoInitialTime(savedPos);
          } else {
            loadWatchProgress(targetLesson.id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (lessonIdToToggle: string) => {
    if (!studentId || !tenantId) return;

    const isCompleted = completedLessons.has(lessonIdToToggle);
    const newSet = new Set(completedLessons);

    if (isCompleted) {
      newSet.delete(lessonIdToToggle);
      await supabase
        .from("lesson_progress")
        .delete()
        .eq("student_id", studentId)
        .eq("lesson_id", lessonIdToToggle);
    } else {
      newSet.add(lessonIdToToggle);
      await supabase
        .from("lesson_progress")
        .upsert({
          student_id: studentId,
          lesson_id: lessonIdToToggle,
          tenant_id: tenantId,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: "student_id,lesson_id" });
    }

    setCompletedLessons(newSet);
    const cached = queryClient.getQueryData<LessonViewerBundle>(cacheKey);
    if (cached) {
      queryClient.setQueryData(cacheKey, {
        ...cached,
        completedLessons: Array.from(newSet),
      });
    }

    // Check if course is now complete
    const allL = sections.flatMap(s => s.lessons);
    const newCompleted = allL.filter(l => newSet.has(l.id)).length;
    if (newCompleted === allL.length && allL.length > 0 && !isCompleted) {
      setShowCelebration(true);
    }
  };

  const allLessons = sections.flatMap(s => s.lessons);
  const accessibleLessons = isEnrolled ? allLessons : allLessons.filter(l => l.is_preview);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter(l => completedLessons.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const currentIndex = currentLesson ? accessibleLessons.findIndex(l => l.id === currentLesson.id) : -1;
  const nextLesson = currentIndex >= 0 && currentIndex < accessibleLessons.length - 1 ? accessibleLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? accessibleLessons[currentIndex - 1] : null;

  const hasLessonContent = (() => {
    if (!currentLesson) return false;
    switch (currentLesson.content_type) {
      case "video": return !!currentLesson.video_url;
      case "pdf": return !!currentLesson.pdf_url;
      case "audio": return !!currentLesson.audio_url;
      case "image": return !!currentLesson.image_url;
      case "text": return !!currentLesson.text_content;
      case "embed": return !!currentLesson.embed_code;
      case "download": return !!currentLesson.download_url;
      case "quiz": return true;
      case "epub": return !!currentLesson.download_url;
      case "office": return !!currentLesson.download_url;
      case "zoom": return !!currentLesson.video_url;
      case "featured_product": return !!currentLesson.text_content;
      case "upsell": return !!currentLesson.text_content;
      default: return false;
    }
  })();

  const canAccessLesson = (lesson: Lesson) => isEnrolled || lesson.is_preview;

  const navigateToLesson = (lesson: Lesson) => {
    if (!canAccessLesson(lesson)) {
      toast({
        title: t("miscPublic.lessonViewer.paidContentTitle"),
        description: t("miscPublic.lessonViewer.paidContentDesc"),
        variant: "destructive"
      });
      return;
    }
    setCurrentLesson(lesson);
    setVideoInitialTime(0);
    if (studentId && lesson.content_type === "video") {
      loadWatchProgress(lesson.id);
    }
    navigate(urls.lessonUrl(courseSlug!, lesson.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background flex flex-col">
        <TopLoadingBar />
        <header className="bg-card/70 backdrop-blur-xl border-b border-border/60 h-14 sm:h-16 flex items-center px-3 sm:px-6 gap-3 sm:gap-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-32 sm:w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-muted/50 border border-border/50 px-3 py-1.5">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="w-24 md:w-36 bg-muted/40 rounded-full h-1.5" />
            <div className="h-3 w-8 bg-muted rounded animate-pulse" />
          </div>
        </header>

        <div className="w-full flex justify-center py-6 sm:py-10 px-3 sm:px-4">
          <div className="w-full max-w-4xl space-y-5 sm:space-y-6">
            <div className="bg-card rounded-3xl border border-border/60 overflow-hidden shadow-sm">
              <div className="aspect-video w-full bg-muted/30 animate-pulse flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                  <Play className="w-6 h-6 text-muted-foreground/30" />
                </div>
              </div>
              <div className="p-5 sm:p-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2.5 flex-1">
                    <div className="h-4 w-24 bg-muted rounded-full animate-pulse" />
                    <div className="h-6 w-2/3 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                    <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                    <div className="w-28 h-10 rounded-xl bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="pt-6 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded-full animate-pulse" />
                  </div>
                  <div className="h-16 bg-muted/20 rounded-2xl animate-pulse" />
                  <div className="h-16 bg-muted/20 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (blockedReason !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-muted/40 via-background to-background">
        {primaryColor && <TenantThemeInjector primaryColor={primaryColor} />}
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card p-7 text-center">
          <h1 className="text-lg font-bold">
            {blockedScope === "account" ? "تم تعليق حسابك" : "تم إيقاف وصولك لهذه الدورة"}
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            تم رصد محاولات لتسجيل أو التقاط محتوى محمي من هذه الدورة، وتم تقييد الوصول مؤقتًا. إذا
            كنت تعتقد أن هناك خطأ، تواصل مع الدعم لمراجعة حالتك.
          </p>
          {blockedReason && (
            <p className="text-xs text-muted-foreground mt-3">السبب: {blockedReason}</p>
          )}
          <Button className="mt-5 w-full" onClick={() => navigate(urls.studentDashboardUrl())}>
            العودة إلى لوحة الطالب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background flex flex-col content-protected">
      <ContentProtection
        studentName={studentName}
        studentEmail={studentEmail}
        studentPhone={studentPhone}
        fingerprintSeed={studentId}
        enabled={!!studentId}
        studentId={studentId}
        tenantId={tenantId}
        courseId={courseId}
        lessonId={currentLesson?.id || null}
      />
      {primaryColor && <TenantThemeInjector primaryColor={primaryColor} />}

      {/* Top bar */}
      <header className="bg-card/70 backdrop-blur-xl border-b border-border/60 h-14 sm:h-16 flex items-center px-3 sm:px-6 gap-3 sm:gap-4 shrink-0 sticky top-0 z-30">
        <Link
          to={urls.studentDashboardUrl()}
          className="group flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px] sm:max-w-none"
        >
          <span className="w-8 h-8 rounded-full bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors shrink-0">
            <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />

          </span>
          <span className="truncate font-semibold text-foreground">{courseTitle}</span>
        </Link>
        <div className="flex-1" />
        <div className="hidden sm:flex items-center gap-3 rounded-full bg-muted/50 border border-border/50 px-3 py-1.5">
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{completedCount}/{totalLessons}</span>
          <div className="w-24 md:w-36 bg-background rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[11px] font-bold text-primary tabular-nums">{progressPercent}%</span>
        </div>
      </header>

      {/* Focused vertical stream */}
      <div className="w-full flex justify-center py-6 sm:py-10 px-3 sm:px-4">
        <div className="w-full max-w-4xl space-y-5 sm:space-y-6">
          {currentLesson ? (
            <>
              {/* Main lesson card */}
              <div className="bg-card rounded-3xl border border-border/60 overflow-hidden shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.15)]">

                {/* Content viewer */}
                <div className="bg-foreground/5">
                  {currentLesson.content_type === "video" && currentLesson.video_url && (
                    <div className="[&>div]:rounded-b-none">
                      <CustomVideoPlayer
                        key={currentLesson.id}
                        src={currentLesson.video_url}
                        onEnded={() => toggleComplete(currentLesson.id)}
                        onTimeUpdate={handleVideoTimeUpdate}
                        initialTime={videoInitialTime}
                      />
                    </div>
                  )}

                  {currentLesson.content_type === "pdf" && currentLesson.pdf_url && (
                    <iframe
                      src={currentLesson.pdf_url}
                      className="w-full h-[60vh] sm:h-[80vh]"
                      title={currentLesson.title}
                    />
                  )}

                  {currentLesson.content_type === "audio" && currentLesson.audio_url && (
                    <div className="p-6 sm:p-12 flex flex-col items-center gap-6 sm:gap-8">
                      <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full gradient-primary flex items-center justify-center">
                        <Headphones className="w-12 h-12 sm:w-20 sm:h-20 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-center px-4">{currentLesson.title}</h3>
                      <audio
                        src={currentLesson.audio_url}
                        controls
                        className="w-full max-w-xs sm:max-w-lg"
                        onEnded={() => toggleComplete(currentLesson.id)}
                      />
                    </div>
                  )}

                  {currentLesson.content_type === "image" && currentLesson.image_url && (
                    <div className="p-4 sm:p-8 flex justify-center">
                      <img
                        src={currentLesson.image_url}
                        alt={currentLesson.title}
                        className="max-h-[60vh] sm:max-h-[75vh] rounded-xl shadow-card object-contain"
                      />
                    </div>
                  )}

                  {currentLesson.content_type === "text" && currentLesson.text_content && (
                    <div className="p-4 sm:p-8 bg-card">
                      <RichTextContent
                        html={currentLesson.text_content}
                        className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-lg sm:prose-headings:text-xl"
                      />
                    </div>
                  )}

                  {currentLesson.content_type === "embed" && currentLesson.embed_code && (
                    <div className="p-2 sm:p-4">
                      <div
                        className="w-full [&>iframe]:w-full [&>iframe]:min-h-[50vh] sm:[&>iframe]:min-h-[70vh] [&>iframe]:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.embed_code, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allowfullscreen', 'src', 'frameborder', 'allow', 'loading', 'referrerpolicy'] }) }}
                      />
                    </div>
                  )}

                  {currentLesson.content_type === "download" && currentLesson.download_url && (
                    <div className="p-8 sm:p-16 flex flex-col items-center gap-4 sm:gap-6 text-center">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Download className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold px-4">{currentLesson.download_filename || currentLesson.title}</h3>
                      <a href={currentLesson.download_url} download={currentLesson.download_filename || true} target="_blank" rel="noopener noreferrer">
                        <Button className="gradient-primary text-primary-foreground border-0">
                          <Download className="w-4 h-4 ml-2" />
                          {t("miscPublic.lessonViewer.downloadFile")}
                        </Button>
                      </a>
                    </div>
                  )}

                  {currentLesson.content_type === "quiz" && (
                    <QuizViewer lessonId={currentLesson.id} studentId={studentId} onComplete={() => toggleComplete(currentLesson.id)} />
                  )}

                  {currentLesson.content_type === "epub" && currentLesson.download_url && (
                    <div className="p-8 sm:p-16 flex flex-col items-center gap-4 sm:gap-6 text-center">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold px-4">{currentLesson.download_filename || currentLesson.title}</h3>
                      <p className="text-muted-foreground text-sm px-4">{t("miscPublic.lessonViewer.epubHint")}</p>
                      <a href={currentLesson.download_url} download={currentLesson.download_filename || true} target="_blank" rel="noopener noreferrer">
                        <Button className="gradient-primary text-primary-foreground border-0">
                          <Download className="w-4 h-4 ml-2" />
                          {t("miscPublic.lessonViewer.downloadEpub")}
                        </Button>
                      </a>
                    </div>
                  )}

                  {currentLesson.content_type === "office" && currentLesson.download_url && (
                    <div>
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentLesson.download_url)}`}
                        className="w-full h-[60vh] sm:h-[80vh]"
                        title={currentLesson.title}
                      />
                      <div className="p-2 sm:p-4 text-center">
                        <a href={currentLesson.download_url} download={currentLesson.download_filename || true} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {t("miscPublic.lessonViewer.downloadDoc")}
                        </a>
                      </div>
                    </div>
                  )}

                  {currentLesson.content_type === "zoom" && currentLesson.video_url && (
                    <div className="p-8 sm:p-16 flex flex-col items-center gap-4 sm:gap-6 text-center">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Video className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold px-4">{currentLesson.title}</h3>
                      <p className="text-muted-foreground text-sm px-4">{t("miscPublic.lessonViewer.zoomHint")}</p>
                      <a href={currentLesson.video_url} target="_blank" rel="noopener noreferrer">
                        <Button className="gradient-primary text-primary-foreground border-0 text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3 h-auto">
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                          {t("miscPublic.lessonViewer.joinMeeting")}
                        </Button>
                      </a>
                    </div>
                  )}

                  {currentLesson.content_type === "featured_product" && currentLesson.text_content && (
                    <div className="p-8 sm:p-16 flex flex-col items-center gap-4 sm:gap-6 text-center">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold px-4">{t("miscPublic.lessonViewer.featuredProduct")}</h3>
                      <a href={currentLesson.text_content} target="_blank" rel="noopener noreferrer">
                        <Button className="gradient-primary text-primary-foreground border-0 text-base sm:text-lg px-6 sm:px-8 py-2 sm:py-3 h-auto">
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                          {t("miscPublic.lessonViewer.viewProduct")}
                        </Button>
                      </a>
                    </div>
                  )}

                  {currentLesson.content_type === "upsell" && currentLesson.text_content && (
                    <div className="p-6 sm:p-12">
                      <h3 className="text-lg sm:text-xl font-bold text-center mb-6 sm:mb-8">{t("miscPublic.lessonViewer.extraProducts")}</h3>
                      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                        {currentLesson.text_content.split("\n").filter(Boolean).map((link, i) => (
                          <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-xl p-4 sm:p-6 hover:border-primary hover:shadow-md transition-all text-center">
                            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
                            <p className="text-sm font-medium">{t("miscPublic.lessonViewer.productN", { n: i + 1 })}</p>
                            <span className="text-xs text-primary mt-2 inline-flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {t("miscPublic.lessonViewer.viewProduct")}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasLessonContent && (
                    <div className="aspect-video w-full bg-muted/20 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                        {contentIcon(currentLesson.content_type)}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">{currentLesson.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                        {t("miscPublic.lessonViewer.noVideoUploaded", {
                          defaultValue: "لم يتم رفع محتوى لهذا الدرس بعد، جاري إعداد وتجهيز المحتوى."
                        })}
                      </p>
                      {nextLesson && (
                        <Button
                          onClick={() => navigateToLesson(nextLesson)}
                          className="mt-4 gap-2 gradient-primary text-primary-foreground border-0 rounded-xl"
                          size="sm"
                        >
                          <span>{t("miscPublic.lessonViewer.next", { defaultValue: "الدرس التالي" })}</span>
                          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Lesson info & actions */}
                <div className="p-5 sm:p-7 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center gap-1.5">
                          {contentIcon(currentLesson.content_type)}
                          {t(`miscPublic.lessonViewer.types.${currentLesson.content_type}`, { defaultValue: currentLesson.content_type })}
                        </span>
                        {currentIndex >= 0 && (
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums px-2 py-1 rounded-full bg-muted/60">
                            {t("miscPublic.lessonViewer.lessonNumber", { n: currentIndex + 1, defaultValue: `${currentIndex + 1} / ${accessibleLessons.length}` })}
                          </span>
                        )}
                      </div>
                      <h1 className="text-base sm:text-lg font-medium text-foreground leading-relaxed break-words">{currentLesson.title}</h1>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => prevLesson && navigateToLesson(prevLesson)}
                          disabled={!prevLesson}
                          className="w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                          aria-label={t("miscPublic.lessonViewer.prev")}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        {nextLesson ? (
                          <button
                            onClick={() => navigateToLesson(nextLesson)}
                            className="w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center justify-center"
                            aria-label={t("miscPublic.lessonViewer.next")}
                          >
                            <ArrowRight className="w-4 h-4 rotate-180" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-10 h-10 rounded-xl border border-border text-muted-foreground opacity-40 cursor-not-allowed flex items-center justify-center"
                            aria-label={t("miscPublic.lessonViewer.finish")}
                          >
                            <ArrowRight className="w-4 h-4 rotate-180" />
                          </button>
                        )}
                      </div>
                      <Button
                        variant={completedLessons.has(currentLesson.id) ? "outline" : "default"}
                        onClick={() => toggleComplete(currentLesson.id)}
                        className={completedLessons.has(currentLesson.id)
                          ? "h-10 border-success/40 text-success bg-success/5 hover:bg-success/10 rounded-xl"
                          : "h-10 gradient-primary text-primary-foreground border-0 rounded-xl shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.5)] hover:opacity-95"}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        {completedLessons.has(currentLesson.id) ? t("miscPublic.lessonViewer.completed") : t("miscPublic.lessonViewer.markComplete")}
                      </Button>
                    </div>
                  </div>


                  {/* Course-complete certificate slot */}
                  {!nextLesson && progressPercent === 100 && (
                    <div className="pt-2">
                      <CourseCertificate
                        studentName={studentName}
                        courseName={courseTitle}
                        mentorName={mentorName}
                        completionDate={new Date().toISOString()}
                        certificateId={(enrollmentId || currentLesson?.id || "CERT").slice(0, 8).toUpperCase()}
                        tenantId={tenantId || ""}
                        mentorSlug={mentorSlug}
                      />
                    </div>
                  )}

                  {/* Curriculum Section */}
                  <div className="pt-6 border-t border-border/60">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-base sm:text-lg text-foreground">{t("miscPublic.lessonViewer.courseContent")}</h3>
                      <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted/60 tabular-nums">
                        {completedCount}/{totalLessons} {t("miscPublic.lessonViewer.completed")}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {sections.map(section => {
                        const isExpanded = expandedSections.has(section.id);
                        const sectionLessons = section.lessons;
                        const sectionCompleted = sectionLessons.length > 0 && sectionLessons.every(l => completedLessons.has(l.id));
                        const hasActive = sectionLessons.some(l => l.id === currentLesson?.id);
                        return (
                          <div
                            key={section.id}
                            className={`rounded-2xl border overflow-hidden transition-all ${
                              hasActive
                                ? "border-primary/40 bg-card shadow-[0_2px_16px_-8px_hsl(var(--primary)/0.35)]"
                                : "border-border/60 bg-muted/20 hover:bg-muted/40"
                            }`}
                          >
                            <button
                              onClick={() => {
                                const newSet = new Set(expandedSections);
                                newSet.has(section.id) ? newSet.delete(section.id) : newSet.add(section.id);
                                setExpandedSections(newSet);
                              }}
                              className={`w-full flex items-center justify-between p-4 ${hasActive ? "bg-gradient-to-l from-primary/5 to-transparent" : ""}`}
                            >
                              <div className={`flex items-center gap-3 font-semibold text-sm sm:text-base min-w-0 ${hasActive ? "text-primary" : "text-foreground"}`}>
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs shrink-0 transition-colors ${
                                  sectionCompleted
                                    ? "bg-success text-success-foreground"
                                    : hasActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border text-muted-foreground"
                                }`}>
                                  {sectionCompleted ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    section.sort_order + 1
                                  )}
                                </span>
                                <span className="truncate text-start">{section.title}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className={`w-5 h-5 shrink-0 ${hasActive ? "text-primary" : "text-muted-foreground"}`} />
                              ) : (
                                <ChevronDown className={`w-5 h-5 shrink-0 ${hasActive ? "text-primary" : "text-muted-foreground"}`} />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="p-2 space-y-1 bg-card border-t border-border/40">
                                {sectionLessons.map(lesson => {
                                  const accessible = canAccessLesson(lesson);
                                  const isActive = currentLesson?.id === lesson.id;
                                  const done = completedLessons.has(lesson.id);
                                  return (
                                    <button
                                      key={lesson.id}
                                      onClick={() => navigateToLesson(lesson)}
                                      disabled={!accessible}
                                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-start transition-all ${
                                        isActive
                                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                          : accessible
                                          ? "hover:bg-muted/70 text-foreground"
                                          : "text-muted-foreground/50 cursor-not-allowed"
                                      }`}
                                    >
                                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        isActive
                                          ? "bg-primary text-primary-foreground"
                                          : done
                                          ? "bg-success/10 text-success"
                                          : !accessible
                                          ? "bg-muted/60 text-muted-foreground/50"
                                          : "bg-muted/60 text-muted-foreground"
                                      }`}>
                                        {!accessible ? (
                                          <Lock className="w-3.5 h-3.5" />
                                        ) : done ? (
                                          <CheckCircle className="w-4 h-4" />
                                        ) : (
                                          contentIcon(lesson.content_type)
                                        )}
                                      </span>
                                      <span className={`flex-1 text-sm min-w-0 break-words ${isActive ? "font-semibold" : "font-medium"}`}>
                                        {lesson.title}
                                      </span>
                                      {isActive && (
                                        <span className="text-[10px] text-primary font-bold shrink-0 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                          {t("miscPublic.lessonViewer.currentBadge", { defaultValue: "الحالي" })}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>



                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              {t("miscPublic.lessonViewer.chooseLesson")}
            </div>
          )}
        </div>
      </div>


      {/* Celebration Dialog */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCelebration(false)}>
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">{t("miscPublic.lessonViewer.congrats")}</h2>
            <p className="text-muted-foreground text-sm sm:text-base">{t("miscPublic.lessonViewer.congratsDesc")}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("miscPublic.lessonViewer.congratsHint")}</p>
            <div className="flex flex-col gap-2 pt-2">
              <CourseCertificate
                studentName={studentName}
                courseName={courseTitle}
                mentorName={mentorName}
                completionDate={new Date().toISOString()}
                certificateId={(enrollmentId || currentLesson?.id || "CERT").slice(0, 8).toUpperCase()}
                tenantId={tenantId || ""}
                mentorSlug={mentorSlug}
              />
              <Button variant="outline" onClick={() => setShowCelebration(false)}>
                {t("miscPublic.lessonViewer.continue")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {qaBotEnabled && isEnrolled && courseId && (
        <StudentQAChat
          courseId={courseId}
          onJumpToLesson={(lid) => navigate(urls.lessonUrl(courseSlug!, lid))}
          open={qaChatOpen}
          onOpenChange={setQaChatOpen}
          hideTrigger
        />
      )}
      <LessonActionsFab
        contentBankHref={courseSlug ? urls.contentBankUrl(courseSlug) : null}
        communityUrl={communityLink}
        whatsappNumber={whatsappNumber}
        onOpenQA={qaBotEnabled && isEnrolled && courseId ? () => setQaChatOpen(true) : undefined}
      />

      <footer className="mt-10 py-6 flex items-center justify-center">
        <a
          href="https://ebdaey.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          <img
            src={i18n.language?.startsWith("en") ? poweredByEnglish.url : poweredByArabic.url}
            alt="Ebdaey"
            className="h-6 w-auto"
          />
        </a>
      </footer>
    </div>
  );
};

export default LessonViewer;
