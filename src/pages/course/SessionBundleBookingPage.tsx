import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, CheckCircle2, Clock, ExternalLink, Loader2, Lock, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { toAr } from "@/lib/utils";
import CourseHeader from "@/components/course/CourseHeader";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import ConsultationBookingWidget from "@/components/common/ConsultationBookingWidget";
import { usePageReady } from "@/hooks/usePageReady";
import { sanitizeStudentMeetingLink } from "@/lib/zoomLink";

const dateKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const SessionBundleBookingPage = () => {
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const locale = isEn ? "en-US" : "ar-EG";

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [entitled, setEntitled] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [takenSlots, setTakenSlots] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [externalBusy, setExternalBusy] = useState<Array<{ start: string; end: string }>>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [justBooked, setJustBooked] = useState(false);

  const load = async () => {
    if (!mentorSlug || !courseSlug) return;
    const { data: tn } = await supabase
      .from("public_tenants")
      .select("id, name, slug, profile_image_url, primary_color, whatsapp_number, bio, specialty")
      .eq("slug", mentorSlug).maybeSingle();
    if (!tn) { setLoading(false); return; }
    setTenant(tn);

    const { data: c } = await supabase
      .from("live_courses" as any)
      .select("*")
      .eq("tenant_id", (tn as any).id)
      .eq("slug", courseSlug)
      .maybeSingle();
    setCourse(c);
    if (!c) { setLoading(false); return; }
    const cc: any = c;

    const [slotsRes, ovRes, takenRes] = await Promise.all([
      cc.schedule_id
        ? supabase.from("public_mentor_schedule_slots" as any).select("*").eq("schedule_id", cc.schedule_id)
        : Promise.resolve({ data: [] as any }),
      cc.schedule_id
        ? supabase.from("public_mentor_schedule_overrides" as any).select("*").eq("schedule_id", cc.schedule_id)
        : Promise.resolve({ data: [] as any }),
      supabase.from("public_consultation_taken_slots" as any)
        .select("booking_date, booking_time, duration_minutes")
        .eq("tenant_id", (tn as any).id),

    ]);
    setSlots((slotsRes.data as any) || []);
    setOverrides((ovRes.data as any) || []);
    setTakenSlots((takenRes.data as any) || []);

    if (user) {
      const { data: student } = await supabase
        .from("students").select("id").eq("user_id", user.id)
        .eq("tenant_id", (tn as any).id).maybeSingle();
      if (student) {
        const { data: p } = await supabase
          .from("live_course_purchases" as any).select("id")
          .eq("student_id", (student as any).id)
          .eq("live_course_id", cc.id)
          .eq("payment_status", "completed").maybeSingle();
        if (p) {
          setEntitled(true);
          const { data: bs } = await supabase
            .from("consultation_bookings" as any)
            .select("id, booking_date, booking_time, duration_minutes, meeting_link, status, session_index")
            .eq("purchase_id", (p as any).id)
            .order("booking_date", { ascending: true });
          const list = ((bs as any[]) || []);
          setMyBookings(list);
          // Safety net: a Zoom session must always have a meeting link.
          const missing = list.filter(
            (b: any) =>
              b.status !== "cancelled" &&
              !b.meeting_link &&
              cc.attendance_type === "zoom" &&
              new Date(`${b.booking_date}T${b.booking_time}`).getTime() > Date.now(),
          );
          if (missing.length > 0) {
            const fixes = await Promise.all(
              missing.map(async (b: any) => {
                try {
                  const { data } = await supabase.functions.invoke("booking-ensure-zoom", {
                    body: { booking_id: b.id },
                  });
                  const link = (data as any)?.join_url;
                  return link ? { id: b.id, link } : null;
                } catch {
                  return null;
                }
              }),
            );
            const map = new Map(fixes.filter(Boolean).map((f: any) => [f.id, f.link]));
            if (map.size > 0) {
              setMyBookings((prev) =>
                prev.map((b: any) => (map.has(b.id) ? { ...b, meeting_link: map.get(b.id) } : b)),
              );
            }
          }
        }
      }
    }

    supabase.functions.invoke("google-calendar-busy", {
      body: {
        tenant_id: (tn as any).id,
        time_min: new Date().toISOString(),
        time_max: new Date(Date.now() + 60 * 86400000).toISOString(),
      },
    }).then(({ data }) => {
      const busy = (data as any)?.busy;
      if (Array.isArray(busy)) setExternalBusy(busy);
    }).catch(() => {});

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    load(); /* eslint-disable-next-line */
  }, [mentorSlug, courseSlug, user, authLoading]);

  usePageReady(loading || authLoading);

  const total = course?.sessions_count || 1;
  const activeBookings = useMemo(
    () => myBookings.filter((b) => b.status !== "cancelled"),
    [myBookings],
  );
  const remaining = Math.max(0, total - activeBookings.length);

  const confirm = async (d?: Date, tm?: string) => {
    const dEff = d ?? date;
    const tmEff = tm ?? time;
    if (!dEff || !tmEff || !course || booking) return;
    setBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-bundle-session", {
        body: { live_course_id: course.id, booking_date: dateKeyOf(dEff), booking_time: tmEff },
      });
      if (error) throw error;
      const err = (data as any)?.error;
      if (err) {
        const map: Record<string, string> = {
          slot_taken: t("liveCourse.bundle.errors.slotTaken"),
          no_sessions_left: t("liveCourse.bundle.errors.noSessionsLeft"),
          too_soon: t("liveCourse.bundle.errors.tooSoon"),
          outside_window: t("liveCourse.bundle.errors.outsideWindow"),
          not_entitled: t("liveCourse.bundle.errors.notEntitled"),
        };
        toast({ title: map[err] || t("liveCourse.page.toast.confirmFailed"), variant: "destructive" });
        return;
      }
      setJustBooked(true);
      setDate(null); setTime(null);
      await load();
    } catch (e: any) {
      toast({ title: t("liveCourse.page.toast.error"), description: e?.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f9]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!course || course.product_type !== "session_bundle") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("miscPublic.notFoundInline.page")}</p>
      </div>
    );
  }

  const mentor = tenant ? {
    name: tenant.name,
    bio: tenant.bio,
    specialty: tenant.specialty,
    profile_image_url: tenant.profile_image_url,
    primary_color: tenant.primary_color,
    whatsapp_number: tenant.whatsapp_number,
    whatsapp_default_color: true,
  } : null;

  return (
    <div className="min-h-screen bg-[#f8f8f9]" dir={isEn ? "ltr" : "rtl"}>
      {mentor && <TenantThemeInjector primaryColor={mentor.primary_color} />}
      {mentor && (
        <CourseHeader
          mentor={mentor}
          mentorSlug={mentorSlug}
          profileUrl={urls.profileUrl()}
          activeSection=""
          setActiveSection={() => {}}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{t("liveCourse.bundle.pageSubtitle")}</p>
        </div>

        {!user ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <p className="font-bold">{t("liveCourse.bundle.signInTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("liveCourse.bundle.signInDesc")}</p>
            <Button onClick={() => navigate(urls.studentAuthUrl())}>
              {t("liveCourse.bundle.signInCta")}
            </Button>
          </div>
        ) : !entitled ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-bold">{t("liveCourse.bundle.needPurchaseTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("liveCourse.bundle.needPurchaseDesc")}</p>
            <Button onClick={() => navigate(urls.mentorPath(`/l/${courseSlug}`))}>
              {t("liveCourse.bundle.goToProduct")}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: t("liveCourse.bundle.totalSessions"), value: total, icon: CalendarClock },
                { label: t("liveCourse.bundle.bookedSessions"), value: activeBookings.length, icon: CheckCircle2 },
                { label: t("liveCourse.bundle.remainingSessions"), value: remaining, icon: Clock },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none">{isEn ? s.value : toAr(s.value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {justBooked && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-bold text-green-800">{t("liveCourse.bundle.successTitle")}</p>
                <p className="text-sm text-green-700 mt-1">{t("liveCourse.bundle.successDesc")}</p>
              </div>
            )}

            {activeBookings.length > 0 && (
              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  {t("liveCourse.bundle.myBookings")}
                </h2>
                <div className="space-y-3">
                  {activeBookings.map((b, i) => {
                    const dt = new Date(`${b.booking_date}T${b.booking_time}`);
                    const upcoming = dt.getTime() > Date.now();
                    const joinLink = sanitizeStudentMeetingLink(b.meeting_link || (course?.attendance_type === "online" ? course?.meeting_link : null));
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/40 bg-muted/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {isEn ? i + 1 : toAr(i + 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {dt.toLocaleString(locale, { dateStyle: "full", timeStyle: "short" })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isEn ? b.duration_minutes : toAr(b.duration_minutes)} {t("liveCourse.page.minute")}
                            </p>
                          </div>
                        </div>
                        {upcoming && joinLink && (
                          <a href={joinLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Video className="w-3.5 h-3.5" />
                              {t("liveCourse.page.enterSession")}
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {remaining > 0 ? (
              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-primary" />
                  {t("liveCourse.bundle.bookNextTitle")}
                </h2>
                <p className="text-xs text-muted-foreground mb-5">
                  {t("liveCourse.bundle.remainingHint", { count: remaining, n: isEn ? remaining : toAr(remaining) })}
                </p>
                <ConsultationBookingWidget
                  durationMinutes={course.session_duration_minutes || 30}
                  slots={slots}
                  overrides={overrides}
                  bookings={takenSlots}
                  externalBusy={externalBusy}
                  policy={{
                    minLeadHours: course.min_lead_hours,
                    bufferSlots: course.buffer_slots,
                    windowDays: course.booking_window_days,
                    startDate: course.booking_start_date,
                    endDate: course.booking_end_date,
                  }}
                  selectedDate={date}
                  selectedTime={time}
                  onSelect={(d, tm) => { setDate(d); setTime(tm || null); setJustBooked(false); }}
                  onConfirm={(d, tm) => confirm(d, tm)}
                />
                <Button
                  className="w-full h-13 mt-6 h-12 text-base font-bold rounded-2xl"
                  disabled={!date || !time || booking}
                  onClick={() => confirm()}
                >
                  {booking
                    ? t("liveCourse.page.confirming")
                    : date && time
                      ? t("liveCourse.bundle.confirmBooking")
                      : t("liveCourse.page.chooseTimeFirst")}
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/50 p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-bold">{t("liveCourse.bundle.allBookedTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("liveCourse.bundle.allBookedDesc")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SessionBundleBookingPage;
