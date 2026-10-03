import { currencySymbol } from "@/lib/currency";

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import CoursePageSkeleton from "@/components/common/CoursePageSkeleton";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { usePageReady } from "@/hooks/usePageReady";
import { useTrackVisit } from "@/hooks/useTrackVisit";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import CourseHeader from "@/components/course/CourseHeader";
import LiveCourseMobileBottomBar from "@/components/course/LiveCourseMobileBottomBar";
import CourseDescription from "@/components/course/CourseDescription";
import CourseFaqs from "@/components/course/CourseFaqs";
import CourseGiftCourses from "@/components/course/CourseGiftCourses";
import CourseMentorCard from "@/components/course/CourseMentorCard";
import BannerAutoplayVideo from "@/components/media/BannerAutoplayVideo";
import ConsultationBookingWidget from "@/components/common/ConsultationBookingWidget";
import { Button } from "@/components/ui/button";
import {
  Video, MapPin, CalendarClock, Users, ArrowRight, Shield, Clock, ExternalLink,
} from "lucide-react";
import { lcQk, fetchLiveCourseBundle } from "@/lib/liveCourseQueries";
import { queryClient } from "@/lib/queries";
import { toAr, toArPrice } from "@/lib/utils";
import PaymentBadges from "@/components/common/PaymentBadges";
import { SeoHead } from "@/components/common/SeoHead";
import { mentorCanonical, plainText, offerSchema, faqPageSchema, AUDIENCE_AREA_SERVED } from "@/lib/seo";

const LiveCoursePage = () => {
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: lcQk.course(mentorSlug || "", courseSlug || ""),
    queryFn: () => fetchLiveCourseBundle(mentorSlug!, courseSlug!),
    enabled: !!mentorSlug && !!courseSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes (live courses change more frequently)
    initialData: () =>
      mentorSlug && courseSlug
        ? queryClient.getQueryData<Awaited<ReturnType<typeof fetchLiveCourseBundle>>>(
            lcQk.course(mentorSlug, courseSlug)
          )
        : undefined,
  });

  const tenantDbId = bundle?.tenant?.id ?? null;
  useTrackVisit(tenantDbId, "live_course");
  const course: any = bundle?.course ?? null;
  const sessions: any[] = bundle?.sessions ?? [];
  const seatsTaken = bundle?.seatsTaken ?? 0;
  const slots = (bundle as any)?.slots ?? [];
  const overrides = (bundle as any)?.overrides ?? [];
  const bookings = (bundle as any)?.bookings ?? [];
  const giftCourses = (bundle as any)?.giftCourses ?? [];
  const isConsultation = course?.product_type === "consultation";
  const isBundle = course?.product_type === "session_bundle";

  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [externalBusy, setExternalBusy] = useState<Array<{ start: string; end: string }>>([]);

  // Fetch Google Calendar busy ranges (next 60 days) once mentor tenant known and it's a consultation
  useEffect(() => {
    if (!tenantDbId || !isConsultation) return;
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 60);
    supabase.functions
      .invoke("google-calendar-busy", {
        body: {
          tenant_id: tenantDbId,
          time_min: now.toISOString(),
          time_max: end.toISOString(),
        },
      })
      .then(({ data }) => {
        const busy = (data as any)?.busy;
        if (Array.isArray(busy)) setExternalBusy(busy);
      })
      .catch(() => {});
  }, [tenantDbId, isConsultation]);
  const mentor = bundle?.tenant ? {
    name: bundle.tenant.name,
    bio: (bundle.tenant as any).bio,
    specialty: (bundle.tenant as any).specialty,
    profile_image_url: bundle.tenant.profile_image_url,
    primary_color: (bundle.tenant as any).primary_color,
    whatsapp_number: (bundle.tenant as any).whatsapp_number,
    whatsapp_default_color: (bundle.tenant as any).whatsapp_default_color ?? true,
  } : null;

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [bookingMeetingLink, setBookingMeetingLink] = useState<string | null>(null);
  const [hasBooking, setHasBooking] = useState<boolean>(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [bookingReloadKey, setBookingReloadKey] = useState(0);

  useEffect(() => {
    const check = async () => {
      if (!user || !course || !tenantDbId) return;
      const { data: student } = await supabase
        .from("students").select("id").eq("user_id", user.id)
        .eq("tenant_id", tenantDbId).single();
      if (!student) return;
      const { data: p } = await supabase
        .from("live_course_purchases" as any).select("id")
        .eq("student_id", student.id).eq("live_course_id", course.id)
        .eq("payment_status", "completed").maybeSingle();
      if (p) {
        setIsEnrolled(true);
        setPurchaseId((p as any).id);
        // For consultations, meeting link is per-booking (Zoom auto-generated)
        if (isConsultation) {
          const { data: b } = await supabase
            .from("consultation_bookings" as any)
            .select("meeting_link, booking_date, booking_time")
            .eq("purchase_id", (p as any).id)
            .order("booking_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (b) {
            setHasBooking(true);
            if ((b as any).meeting_link) setBookingMeetingLink((b as any).meeting_link);
          } else {
            setHasBooking(false);
          }
        }
      }
    };
    check();
  }, [user, course, tenantDbId, isConsultation, bookingReloadKey]);

  // toast imported below



  usePageReady(loading);
  if (loading) return <CoursePageSkeleton />;

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("miscPublic.notFoundInline.page")}</p>
      </div>
    );
  }

  const isFull = course.capacity != null && seatsTaken >= course.capacity;
  const seatsRemaining = course.capacity != null ? Math.max(0, course.capacity - seatsTaken) : null;

  const handleBuy = (d?: Date, tm?: string) => {
    if (isFull) return;
    if (isConsultation) {
      const dEff = d ?? bookingDate;
      const tmEff = tm ?? bookingTime;
      if (!dEff || !tmEff) {
        return;
      }
      const dateKey = `${dEff.getFullYear()}-${String(dEff.getMonth() + 1).padStart(2, "0")}-${String(dEff.getDate()).padStart(2, "0")}`;
      sessionStorage.setItem(`consultation_booking_${course.id}`, JSON.stringify({ date: dateKey, time: tmEff }));
    }
    navigate(urls.mentorPath(`/l/${courseSlug}/checkout`));
  };

  const confirmGiftBooking = async (d?: Date, tm?: string) => {
    const dEff = d ?? bookingDate;
    const tmEff = tm ?? bookingTime;
    if (!dEff || !tmEff || !course || confirmingBooking) return;
    setConfirmingBooking(true);
    const dateKey = `${dEff.getFullYear()}-${String(dEff.getMonth() + 1).padStart(2, "0")}-${String(dEff.getDate()).padStart(2, "0")}`;
    try {
      const { data, error } = await supabase.functions.invoke("book-gift-consultation", {
        body: { live_course_id: course.id, booking_date: dateKey, booking_time: tmEff },
      });
      if (error) throw error;
      if ((data as any)?.error === "slot_taken") {
        toast({ title: t("liveCourse.page.toast.slotTaken"), description: t("liveCourse.page.toast.chooseAnother"), variant: "destructive" });
        return;
      }
      if ((data as any)?.error === "already_booked") {
        setHasBooking(true);
      }
      if ((data as any)?.error && (data as any).error !== "already_booked") {
        toast({ title: t("liveCourse.page.toast.confirmFailed"), description: (data as any).error, variant: "destructive" });
        return;
      }
      toast({ title: t("liveCourse.page.toast.confirmed"), description: t("liveCourse.page.toast.confirmedDesc") });
      setBookingReloadKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: t("liveCourse.page.toast.error"), description: e?.message || t("liveCourse.page.toast.confirmFailed"), variant: "destructive" });
    } finally {
      setConfirmingBooking(false);
    }
  };


  const formatDate = (d: string, t2: string) => {
    try {
      const dt = new Date(`${d}T${t2}`);
      const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
      return dt.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
        + " — " + dt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    } catch { return `${d} ${t2}`; }
  };

  const attendanceLabel =
    course.attendance_type === "zoom" ? t("liveCourse.page.attendance.zoom") :
    course.attendance_type === "online" ? t("liveCourse.page.attendance.online") : t("liveCourse.page.attendance.inPerson");

  const PriceCard = (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[28px] blur-sm" />
      <div className="relative bg-card border border-border/50 rounded-[24px] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-l from-primary via-primary/80 to-primary/40" />
        <div className="p-6 space-y-5">
          <div className="relative bg-muted/40 rounded-2xl p-5">
            {course.price_before_discount && course.price_before_discount > course.price && (
              <div className="absolute -top-3 right-4">
                <span className="bg-destructive text-destructive-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                  {t("liveCourse.page.discount")} {toAr(Math.round(((course.price_before_discount - course.price) / course.price_before_discount) * 100))}{i18n.language === "en" ? "%" : "٪"}
                </span>
              </div>
            )}
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-foreground tracking-tight leading-none text-4xl">
                    {course.price > 0 ? toAr(course.price) : t("liveCourse.page.free")}
                  </span>
                  {course.price > 0 && <span className={`text-sm text-muted-foreground font-bold ${course.currency === "SAR" ? "product-sar-symbol" : ""}`}>{currencySymbol(course.currency)}</span>}
                </div>
                {course.price_before_discount && course.price_before_discount > course.price && (
                  <span className="text-sm text-muted-foreground line-through font-medium mt-1 block">
                    {toAr(course.price_before_discount)} <span className={course.currency === "SAR" ? "product-sar-symbol" : ""}>{currencySymbol(course.currency)}</span>
                  </span>
                )}
              </div>
              {seatsRemaining != null && (
                <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5 border border-border/40 shadow-sm">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">{toAr(seatsRemaining)}</span>
                  <span className="text-[10px] text-muted-foreground">{t("liveCourse.page.seatsLeft")}</span>
                </div>
              )}
            </div>
          </div>

          {isEnrolled && isBundle ? (
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)]"
              onClick={() => navigate(urls.mentorPath(`/l/${courseSlug}/booking`))}
            >
              <CalendarClock className="w-5 h-5 me-2" />
              {t("liveCourse.page.manageBundleBookings")}
            </Button>
          ) : isEnrolled && isConsultation && !hasBooking ? (
            <Button
              disabled={!bookingDate || !bookingTime || confirmingBooking}
              className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] disabled:opacity-50"
              onClick={() => confirmGiftBooking()}
            >
              <ArrowRight className="w-5 h-5 me-2" />
              {confirmingBooking
                ? t("liveCourse.page.confirming")
                : (bookingDate && bookingTime ? t("liveCourse.page.confirmFree") : t("liveCourse.page.chooseTimeFirst"))}
            </Button>
          ) : isEnrolled ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 font-bold mb-1">{isConsultation ? t("liveCourse.page.bookedTitle") : t("liveCourse.page.enrolledTitle")}</p>
              <p className="text-xs text-green-700">{isConsultation ? t("liveCourse.page.bookedDesc") : t("liveCourse.page.enrolledDesc")}</p>
            </div>
          ) : isFull ? (
            <Button disabled className="w-full h-14 text-lg font-bold rounded-2xl">
              {t("liveCourse.page.full")}
            </Button>
          ) : (
            <Button
              disabled={isConsultation && (!bookingDate || !bookingTime)}
              className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              onClick={() => handleBuy()}
            >
              <ArrowRight className="w-5 h-5 me-2" />
              {isConsultation
                ? (bookingDate && bookingTime ? t("liveCourse.page.completeBooking") : t("liveCourse.page.chooseTimeFirst"))
                : (course.buy_button_text || (course.price > 0 ? t("liveCourse.page.bookNow") : t("liveCourse.page.registerFree")))}
            </Button>
          )}

          {course.price > 0 && (
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t("liveCourse.page.securePayment")}</span>
              </div>
              <PaymentBadges currency={course.currency} imgClassName="h-5 object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const seoLocale = i18n.language === "en" ? "en" : "ar";
  const liveCanonical = mentorCanonical(mentorSlug, `/l/${courseSlug}`);
  const liveFaqSchema = faqPageSchema(Array.isArray(course.faqs) ? (course.faqs as any) : null);
  const firstSession = sessions[0];
  const liveSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isConsultation || isBundle ? "Service" : "Course",
    name: course.title,
    url: liveCanonical,
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
    ...(isConsultation || isBundle
      ? {
          serviceType: isConsultation
            ? seoLocale === "en"
              ? "Online one-on-one consultation"
              : "استشارة أونلاين فردية"
            : seoLocale === "en"
              ? "Online live session bundle"
              : "باقة جلسات لايف أونلاين",
          areaServed: AUDIENCE_AREA_SERVED,
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: liveCanonical,
            availableLanguage: ["Arabic", "English"],
            serviceLocation: { "@type": "VirtualLocation", url: liveCanonical },
          },
          audience: {
            "@type": "Audience",
            audienceType: seoLocale === "en" ? "Learners" : "المتعلمون",
            geographicArea: AUDIENCE_AREA_SERVED,
          },
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: seoLocale === "en" ? "Online booking" : "الحجز أونلاين",
              value: seoLocale === "en" ? "Customers choose an available appointment" : "يختار العميل موعداً متاحاً",
            },
            ...(course.attendance_type === "zoom"
              ? [{
                  "@type": "PropertyValue",
                  name: seoLocale === "en" ? "Meeting platform" : "منصة الاجتماع",
                  value: seoLocale === "en" ? "Automatic Zoom meeting link" : "إنشاء رابط اجتماع Zoom تلقائياً",
                }]
              : []),
            ...(course.session_duration_minutes
              ? [
                  {
                    "@type": "PropertyValue",
                    name: seoLocale === "en" ? "Session duration (minutes)" : "مدة الجلسة (دقيقة)",
                    value: String(course.session_duration_minutes),
                  },
                ]
              : []),
          ],
        }
      : {}),
    offers: offerSchema(course.price, liveCanonical, !isFull, {
      sellerName: mentor?.name,
      sellerUrl: mentor ? mentorCanonical(mentorSlug, "/") : undefined,
    }),
    ...(!isConsultation && !isBundle
      ? {
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            ...(firstSession?.session_date
              ? {
                  startDate: firstSession.session_time
                    ? `${firstSession.session_date}T${firstSession.session_time}`
                    : firstSession.session_date,
                }
              : {}),
          },
        }
      : {}),
  };

  // Upcoming online sessions as Event schemas (Google Events / consultations)
  const durationMin = course.session_duration_minutes || 30;
  const eventSchemas: Record<string, unknown>[] = sessions
    .filter((s: any) => s?.session_date)
    .slice(0, 10)
    .map((s: any) => {
      const start = s.session_time
        ? `${s.session_date}T${String(s.session_time).slice(0, 5)}:00+02:00`
        : `${s.session_date}`;
      const end = s.session_time
        ? new Date(
            new Date(`${s.session_date}T${String(s.session_time).slice(0, 5)}:00+02:00`).getTime() +
              durationMin * 60000,
          ).toISOString()
        : undefined;
      return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: course.title,
        ...(course.description ? { description: plainText(course.description, 300) } : {}),
        ...(course.thumbnail_url ? { image: course.thumbnail_url } : {}),
        startDate: start,
        ...(end ? { endDate: end } : {}),
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "VirtualLocation", url: liveCanonical },
        inLanguage: seoLocale,
        ...(mentor
          ? { performer: { "@type": "Person", name: mentor.name, url: mentorCanonical(mentorSlug, "/") } }
          : {}),
        offers: offerSchema(course.price, liveCanonical, !isFull, {
          sellerName: mentor?.name,
          sellerUrl: mentor ? mentorCanonical(mentorSlug, "/") : undefined,
        }),
      };
    });

  return (
    <div className="min-h-screen bg-[#f8f8f9]" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <SeoHead
        title={`${course.title}${mentor ? ` — ${mentor.name}` : ""}`}
        description={plainText(course.description) || course.title}
        path={liveCanonical}
        image={course.thumbnail_url || undefined}
        locale={seoLocale}
        ogType="product"
        price={{ amount: Number(course.price ?? 0), availability: isFull ? "oos" : "instock" }}
        jsonLd={[liveSchema, ...eventSchemas, ...(liveFaqSchema ? [liveFaqSchema] : [])]}
        breadcrumbs={[
          ...(mentor ? [{ name: mentor.name, url: mentorCanonical(mentorSlug, "/") }] : []),
          { name: course.title, url: liveCanonical },
        ]}
      />
      {mentor && <TenantThemeInjector primaryColor={mentor.primary_color} />}
      {mentor && (
        <CourseHeader
          mentor={mentor}
          mentorSlug={mentorSlug}
          profileUrl={urls.profileUrl()}
          activeSection="section-about"
          setActiveSection={() => {}}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 overflow-x-clip">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start py-6 sm:py-8 lg:py-12">
          <div className="order-2 lg:order-1 lg:sticky lg:top-24 min-w-0 hidden lg:block">
            {PriceCard}
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2 min-w-0 space-y-6 sm:space-y-8 lg:space-y-12">
            <div id="section-about" className="scroll-mt-20 space-y-6">
              <div className="rounded-2xl lg:rounded-3xl overflow-hidden aspect-video bg-muted shadow-2xl relative mx-auto">
                {course.banner_video_url ? (
                  <BannerAutoplayVideo src={course.banner_video_url} poster={course.thumbnail_url || undefined} />
                ) : course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} width={1280} height={720} loading="eager" {...({ fetchpriority: "high" } as Record<string, string>)} decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Video className="w-20 h-20 text-primary/30" />
                  </div>
                )}
              </div>

              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-black mb-3 leading-tight">{course.title}</h1>
                {course.short_description && (
                  <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto px-4">
                    {course.short_description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl mx-auto">
                {isBundle && (
                  <div className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-3 border flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">{t("liveCourse.page.sessionsInBundle", { count: course.sessions_count || 1, n: toAr(course.sessions_count || 1) })}</p>
                  </div>
                )}
                {!isConsultation && !isBundle ? (
                  <div className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-3 border flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">{toAr(sessions.length)} {t("liveCourse.page.lectures")}</p>
                  </div>
                ) : (
                  <div className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-3 border flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">{toAr(course.session_duration_minutes || 30)} {t("liveCourse.page.minute")}</p>
                  </div>
                )}
                <div className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-3 border flex items-center gap-2">
                  {course.attendance_type === "in_person" ? <MapPin className="w-4 h-4 text-primary shrink-0" /> : <Video className="w-4 h-4 text-primary shrink-0" />}
                  <p className="text-xs text-muted-foreground">{attendanceLabel}</p>
                </div>
                {!isConsultation && !isBundle && course.capacity != null && (
                  <div className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-3 border flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">{toAr(course.capacity)} {t("liveCourse.page.seat")}</p>
                  </div>
                )}
              </div>
            </div>

            {course.description && <CourseDescription course={course} />}

            {isConsultation && (!isEnrolled || !hasBooking) && (
              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  {t("liveCourse.page.bookYourSlot")}
                </h2>
                <ConsultationBookingWidget
                  durationMinutes={course.session_duration_minutes || 30}
                  slots={slots}
                  overrides={overrides}
                  bookings={bookings}
                  externalBusy={externalBusy}
                  selectedDate={bookingDate}
                  selectedTime={bookingTime}
                  onSelect={(d, t) => { setBookingDate(d); setBookingTime(t || null); }}
                  onConfirm={(d, t) => {
                    if (isEnrolled) confirmGiftBooking(d, t);
                    else handleBuy(d, t);
                  }}
                />
              </div>
            )}

            {!isConsultation && sessions.length > 0 && (
              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  {t("liveCourse.page.schedule")}
                </h2>
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <div key={s.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-muted/20">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {toAr(i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{s.title}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{formatDate(s.session_date, s.session_time)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{toAr(s.duration_minutes)} {t("liveCourse.page.minute")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEnrolled && course.attendance_type === "in_person" && (
              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> {t("liveCourse.page.location")}
                </h2>
                {course.location_name && <p className="font-semibold mb-2">{course.location_name}</p>}
                {course.location_directions && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">{course.location_directions}</p>
                )}
                {course.location_map_url && (
                  <a href={course.location_map_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2"><ExternalLink className="w-4 h-4" /> {t("liveCourse.page.openMaps")}</Button>
                  </a>
                )}
              </div>
            )}

            {isEnrolled && (course.attendance_type === "zoom" || course.attendance_type === "online") && (() => {
              const link = (course.attendance_type === "zoom" && isConsultation)
                ? bookingMeetingLink
                : (course.meeting_link || bookingMeetingLink);
              if (!link) return null;
              return (
                <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" /> {t("liveCourse.page.attendanceLink")}
                  </h2>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <Button className="gap-2"><ExternalLink className="w-4 h-4" /> {isConsultation ? t("liveCourse.page.enterSession") : t("liveCourse.page.enterCourse")}</Button>
                  </a>
                </div>
              );
            })()}

            {giftCourses.length > 0 && !isEnrolled && (
              <CourseGiftCourses giftCourses={giftCourses} mentorPath={urls.mentorPath} />
            )}

            {Array.isArray(course.faqs) && course.faqs.length > 0 && (
              <CourseFaqs faqs={course.faqs as any} />
            )}

            {mentor && (
              <CourseMentorCard mentor={mentor} profileUrl={urls.profileUrl()} />
            )}

          </div>
        </div>
      </div>
      
      <LiveCourseMobileBottomBar
        course={course}
        isConsultation={isConsultation}
        isEnrolled={isEnrolled && !(isConsultation && !hasBooking)}
        isFull={isFull}
        seatsRemaining={seatsRemaining}
        sessionsCount={sessions.length}
        attendanceLabel={attendanceLabel}
        bookingReady={!!(bookingDate && bookingTime)}
        attendanceLink={
          isEnrolled
            ? course.attendance_type === "in_person"
              ? null
              : (isConsultation ? bookingMeetingLink : (course.meeting_link || bookingMeetingLink))
            : null
        }
        onBuy={isEnrolled && isConsultation && !hasBooking ? confirmGiftBooking : handleBuy}
      />
      <TrustedBadge />
      <div className="lg:hidden h-40" aria-hidden="true" />
      {mentor?.whatsapp_number && (
        <div className="lg:hidden">
          <MentorWhatsAppButton phoneNumber={mentor.whatsapp_number} liftOnMobile />
        </div>
      )}
    </div>
  );
};

export default LiveCoursePage;
