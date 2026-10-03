import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CoursePageSkeleton from "@/components/common/CoursePageSkeleton";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { SeoHead } from "@/components/common/SeoHead";
import { mentorCanonical, plainText, aggregateRating, offerSchema, reviewSchemas, AUDIENCE_AREA_SERVED } from "@/lib/seo";
import { useInView } from "@/hooks/useInView";
import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk, queryClient, fetchCourseBundle } from "@/lib/queries";
import { usePageReady } from "@/hooks/usePageReady";
import { useTrackVisit } from "@/hooks/useTrackVisit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PixelInjector, { firePixelEvent } from "@/components/common/PixelInjector";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import TrustedBadge from "@/components/common/TrustedBadge";
import CourseHeader from "@/components/course/CourseHeader";
import CoursePurchaseCard from "@/components/course/CoursePurchaseCard";
import CourseMobileBottomBar from "@/components/course/CourseMobileBottomBar";
import CourseHero from "@/components/course/CourseHero";
import CourseFeatureBadges from "@/components/course/CourseFeatureBadges";
import CourseDescription from "@/components/course/CourseDescription";

// Lazy-load heavy below-the-fold sections
const CourseCurriculum = lazy(() => import("@/components/course/CourseCurriculum"));
const CourseGiftCourses = lazy(() => import("@/components/course/CourseGiftCourses"));
const CourseReviews = lazy(() => import("@/components/course/CourseReviews"));
const CourseFaqs = lazy(() => import("@/components/course/CourseFaqs"));
const CourseMentorCard = lazy(() => import("@/components/course/CourseMentorCard"));
const CoursePreviewDialog = lazy(() => import("@/components/course/CoursePreviewDialog"));

interface Section {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    content_type: string;
    duration_seconds: number | null;
    is_preview: boolean;
      video_url?: string | null;
  }[];
}

const CoursePage = () => {
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();


  // Intersection Observer hooks for lazy loading
  const { ref: curriculumRef, inView: showCurriculum } = useInView();
  const { ref: reviewsRef, inView: showReviews } = useInView();
  const { ref: faqsRef, inView: showFaqs } = useInView();
  const { ref: mentorRef, inView: showMentor } = useInView();
  const { ref: giftCoursesRef, inView: showGiftCourses } = useInView();

  // Preload functions for hover optimization
  const preloadCurriculum = () => import("@/components/course/CourseCurriculum");
  const preloadReviews = () => import("@/components/course/CourseReviews");
  const preloadFaqs = () => import("@/components/course/CourseFaqs");
  const preloadMentor = () => import("@/components/course/CourseMentorCard");
  const preloadGiftCourses = () => import("@/components/course/CourseGiftCourses");

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isGiftEnrollment, setIsGiftEnrollment] = useState(false);
  const [activeSection, setActiveSection] = useState("section-about");
  const [previewLesson, setPreviewLesson] = useState<{
    id: string;
    title: string;
    content_type: string;
    video_url?: string | null;
    audio_url?: string | null;
    pdf_url?: string | null;
    image_url?: string | null;
    text_content?: string | null;
    embed_code?: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Cached bundle (tenant + course + sections + reviews + gifts)
  const { data: bundle, isLoading: loading, refetch } = useQuery({
    queryKey: qk.course(mentorSlug || "", courseSlug || ""),
    queryFn: () => fetchCourseBundle(mentorSlug!, courseSlug!),
    enabled: !!mentorSlug && !!courseSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () =>
      mentorSlug && courseSlug
        ? queryClient.getQueryData<Awaited<ReturnType<typeof fetchCourseBundle>>>(qk.course(mentorSlug, courseSlug))
        : undefined,
  });

  const tenantDbId = bundle?.tenant?.id ?? null;
  useTrackVisit(tenantDbId, "course");
  const course = bundle?.course ?? null;
  const sections = bundle?.sections ?? [];
  const reviews = bundle?.reviews ?? [];
  const giftCourses = bundle?.giftCourses ?? [];
  const lessonsCount = bundle?.lessonsCount ?? 0;
  const mentor = bundle?.tenant
    ? {
        name: bundle.tenant.name,
        bio: bundle.tenant.bio,
        specialty: (bundle.tenant as any).specialty,
        profile_image_url: bundle.tenant.profile_image_url,
        primary_color: (bundle.tenant as any).primary_color,
        whatsapp_number: (bundle.tenant as any).whatsapp_number,
        whatsapp_default_color: (bundle.tenant as any).whatsapp_default_color ?? true,
      }
    : null;

  // Active nav link tracking via IntersectionObserver (no scroll listener)
  useEffect(() => {
    if (!course) return;
    const sectionIds = ["section-about", "section-features", "section-curriculum", "section-faqs"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        // Pick the first section (in document order) that is visible
        const active = sectionIds.find((id) => visible.has(id));
        if (active) setActiveSection(active);
      },
      { rootMargin: "-150px 0px -60% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [course]);

  const openPreviewLesson = async (lessonId: string) => {
    setPreviewLoading(true);
    try {
      const { data } = await supabase
        .rpc("get_preview_lesson", { _lesson_id: lessonId })
        .maybeSingle();
      if (data) setPreviewLesson(data as any);

    } catch (err) {
      console.error("Failed to load preview lesson:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const checkEnrollmentAndPendingOrder = async () => {
      setIsEnrolled(false);
      setPendingOrder(null);
      setIsGiftEnrollment(false);
      if (!user || !course || !tenantDbId) return;
      const role = user.user_metadata?.role;
      if (role === "mentor" || role === "admin") return;
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantDbId)
        .maybeSingle();
      if (!student) return;

      const [enrollmentRes, pendingRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, order_id")
          .eq("student_id", student.id)
          .eq("course_id", course.id)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id, created_at")
          .eq("student_id", student.id)
          .eq("course_id", course.id)
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const enrollment = enrollmentRes.data;
      if (enrollment) {
        setIsEnrolled(true);
        if (enrollment.order_id) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("course_id")
            .eq("id", enrollment.order_id)
            .maybeSingle();
          if (orderData && orderData.course_id !== course.id) setIsGiftEnrollment(true);
        } else {
          setIsGiftEnrollment(true);
        }
      } else if (pendingRes.data) {
        setPendingOrder(pendingRes.data);
      }
    };
    checkEnrollmentAndPendingOrder();
  }, [user, course, tenantDbId]);

  useEffect(() => {
    if (course && tenantDbId) {
      firePixelEvent("ViewContent", {
        content_name: course.title,
        content_ids: [course.id],
        value: course.price,
        currency: "EGP",
      });
    }
  }, [course, tenantDbId]);

  const durationSyncedCourseIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!course?.id || sections.length === 0) return;
    // Only lessons actually hosted on Bunny can have their duration filled in
    // by the sync function; anything else would retry forever.
    const hasMissingBunnyDurations = sections.some((section: any) =>
      section.lessons.some(
        (lesson) =>
          lesson.content_type === "video" &&
          lesson.video_url?.startsWith("bunny:") &&
          (!lesson.duration_seconds || lesson.duration_seconds === 0),
      ),
    );
    if (!hasMissingBunnyDurations) return;
    // Extra safety: never sync the same course twice per mount, so a refetch
    // that still lacks durations cannot start an invoke/refetch loop.
    if (durationSyncedCourseIdsRef.current.has(course.id)) return;
    durationSyncedCourseIdsRef.current.add(course.id);

    let cancelled = false;
    supabase.functions
      .invoke("bunny-sync-durations", { body: { course_id: course.id } })
      .then(() => {
        if (!cancelled) refetch();
      })
      .catch((error) => console.warn("Failed to sync course durations", error));

    return () => {
      cancelled = true;
    };
  }, [course?.id, sections, refetch]);

  const handleBuy = () => {
    navigate(urls.checkoutUrl(courseSlug!));
  };

  const totalDurationSeconds = useMemo(
    () =>
      sections.reduce(
        (acc, s) => acc + s.lessons.reduce((a, l) => a + (l.duration_seconds || 0), 0),
        0,
      ),
    [sections],
  );

  const avgRating = useMemo(
    () => (reviews.length > 0 ? reviews.reduce((sum, r) => sum + ((r as any).rating_v2 ?? r.rating), 0) / reviews.length : 5),
    [reviews],
  );
  const roundedRating = Math.round(avgRating * 10) / 10;

  usePageReady(loading);
  if (loading) return <CoursePageSkeleton />;

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("miscPublic.notFoundInline.course")}</p>
      </div>
    );
  }

  const landingFeatures: { text: string; icon: string }[] = (course.landing_features as any) || [];
  const faqs: { question: string; answer: string }[] = (course.faqs as any) || [];
  const communityLink: string = (course as any).community_link || "";

  const seoLocale = i18n.language === "en" ? "en" : "ar";
  const courseCanonical = mentorCanonical(mentorSlug, `/c/${courseSlug}`);
  const courseSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    url: courseCanonical,
    ...(course.description ? { description: plainText(course.description, 500) } : {}),
    ...(course.thumbnail_url ? { image: course.thumbnail_url } : {}),
    inLanguage: seoLocale === "en" ? "en" : "ar-EG",
    ...(mentor
      ? {
          provider: {
            "@type": "Person",
            name: mentor.name,
            url: mentorCanonical(mentorSlug, "/"),
            ...(mentor.profile_image_url ? { image: mentor.profile_image_url } : {}),
          },
        }
      : {}),
    audience: {
      "@type": "Audience",
      audienceType: seoLocale === "en" ? "Learners" : "المتعلمون",
      geographicArea: AUDIENCE_AREA_SERVED,
    },
    ...(Number(course.price ?? 0) === 0 ? { isAccessibleForFree: true } : {}),
    offers: offerSchema(course.price, courseCanonical, true, {
      sellerName: mentor?.name,
      sellerUrl: mentor ? mentorCanonical(mentorSlug, "/") : undefined,
    }),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: lessonsCount > 0 ? `PT${lessonsCount}H` : undefined,
    },
    ...(reviews.length > 0
      ? {
          aggregateRating: aggregateRating({ count: reviews.length, value: roundedRating }),
          review: reviewSchemas(reviews as any[]),
        }
      : {}),
  };
  const promoVideoUrl: string | null =
    (course as any).banner_type === "video" ? (course as any).banner_video_url || null : null;
  const videoSchema: Record<string, unknown> | null =
    promoVideoUrl && !promoVideoUrl.startsWith("bunny:")
      ? {
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: course.title,
          description: plainText(course.description, 300) || course.title,
          ...(course.thumbnail_url ? { thumbnailUrl: [course.thumbnail_url] } : {}),
          contentUrl: promoVideoUrl,
          embedUrl: promoVideoUrl,
          ...((course as any).created_at
            ? { uploadDate: String((course as any).created_at).slice(0, 10) }
            : {}),
          inLanguage: seoLocale,
        }
      : null;

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: plainText(f.answer, 1000) },
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-[#f8f8f9]">
      <SeoHead
        title={`${course.title}${mentor ? ` — ${mentor.name}` : ""}`}
        description={plainText(course.description) || course.title}
        path={courseCanonical}
        image={course.thumbnail_url || undefined}
        locale={seoLocale}
        ogType="product"
        price={{ amount: Number(course.price ?? 0) }}
        jsonLd={[courseSchema, ...(videoSchema ? [videoSchema] : []), ...(faqSchema ? [faqSchema] : [])]}
        breadcrumbs={[
          ...(mentor ? [{ name: mentor.name, url: mentorCanonical(mentorSlug, "/") }] : []),
          { name: course.title, url: courseCanonical },
        ]}
      />
      {tenantDbId && <PixelInjector tenantId={tenantDbId} />}
      {mentor && <TenantThemeInjector primaryColor={mentor.primary_color} />}

      {mentor && (
        <CourseHeader
          mentor={mentor}
          mentorSlug={mentorSlug}
          profileUrl={urls.profileUrl()}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 overflow-x-clip">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start py-6 sm:py-8 lg:py-12">
          <div className="order-2 lg:order-1 lg:sticky lg:top-24 min-w-0">
            <CoursePurchaseCard
              course={course}
              isGiftEnrollment={isGiftEnrollment}
              isEnrolled={isEnrolled}
              pendingOrder={pendingOrder}
              reviews={reviews}
              roundedRating={roundedRating}
              communityLink={communityLink}
              courseSlug={courseSlug!}
              lessonUrl={urls.lessonUrl}
              onBuy={handleBuy}
            />
            <CourseMobileBottomBar
              course={course}
              isGiftEnrollment={isGiftEnrollment}
              isEnrolled={isEnrolled}
              pendingOrder={pendingOrder}
              reviews={reviews}
              roundedRating={roundedRating}
              lessonsCount={lessonsCount}
              totalDurationSeconds={totalDurationSeconds}
              courseSlug={courseSlug!}
              lessonUrl={urls.lessonUrl}
              onBuy={handleBuy}
            />
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2 min-w-0 space-y-6 sm:space-y-8 lg:space-y-12">
            <div id="section-about">
              <CourseHero
                course={course}
                lessonsCount={lessonsCount}
                totalDurationSeconds={totalDurationSeconds}
              />
            </div>

            <div id="section-features">
              <CourseFeatureBadges course={course} landingFeatures={landingFeatures} />
            </div>

            <CourseDescription course={course} kind="course" />

            <div id="section-curriculum" ref={curriculumRef} onMouseEnter={preloadCurriculum}>
              {showCurriculum && (
                <Suspense fallback={<CoursePageSkeleton />}>
                  <CourseCurriculum
                    sections={sections as any}
                    isEnrolled={isEnrolled}
                    courseSlug={courseSlug!}
                    lessonUrl={urls.lessonUrl}
                    onPreview={openPreviewLesson}
                  />
                </Suspense>
              )}
            </div>

            {giftCourses.length > 0 && !isEnrolled && (
              <div ref={giftCoursesRef} onMouseEnter={preloadGiftCourses}>
                {showGiftCourses && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseGiftCourses giftCourses={giftCourses} mentorPath={urls.mentorPath} />
                  </Suspense>
                )}
              </div>
            )}

            <div ref={reviewsRef} onMouseEnter={preloadReviews}>
              {showReviews && (
                <Suspense fallback={<CoursePageSkeleton />}>
                  <CourseReviews reviews={reviews} isEnrolled={isEnrolled} />
                </Suspense>
              )}
            </div>

            {faqs.length > 0 && (
              <div id="section-faqs" ref={faqsRef} onMouseEnter={preloadFaqs}>
                {showFaqs && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseFaqs faqs={faqs} />
                  </Suspense>
                )}
              </div>
            )}

            {mentor && (
              <div ref={mentorRef} onMouseEnter={preloadMentor}>
                {showMentor && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseMentorCard mentor={mentor} profileUrl={urls.profileUrl()} />
                  </Suspense>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <TrustedBadge />
      
      {mentor?.whatsapp_number && <MentorWhatsAppButton phoneNumber={mentor.whatsapp_number} liftOnMobile />}


      {(previewLesson || previewLoading) && (
        <Suspense fallback={null}>
          <CoursePreviewDialog
            previewLesson={previewLesson}
            previewLoading={previewLoading}
            onClose={() => setPreviewLesson(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default CoursePage;
