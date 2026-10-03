import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, User, Users, Video, ExternalLink, MapPin, Phone, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  tenantId: string;
}

type UpcomingItem = {
  id: string;
  kind: "consultation" | "live_session";
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  meetingLink?: string | null;
  locationName?: string | null;
  attendeeName?: string | null;
  attendeePhone?: string | null;
  attendeeEmail?: string | null;
  attendeesCount?: number;
  attendanceType?: string | null;
};

const MentorUpcomingAppointments = ({ tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const locale = isEn ? "en-US" : "ar-EG";
  const dir = isEn ? "ltr" : "rtl";

  const formatLocaleDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hh = parseInt(h, 10);
    if (isEn) {
      const ampm = hh >= 12 ? "PM" : "AM";
      const hour12 = hh % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    }
    const ampm = hh >= 12 ? "م" : "ص";
    const hour12 = hh % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const { data: bookings, error: bookingsErr } = await supabase
        .from("consultation_bookings")
        .select(
          `id, booking_date, booking_time, duration_minutes, meeting_link, zoom_start_url, status, student_id,
           live_courses ( title, attendance_type, location_name )`,
        )
        .eq("tenant_id", tenantId)
        .gte("booking_date", today)
        .neq("status", "cancelled");
      if (bookingsErr) console.error("bookings error", bookingsErr);

      const studentIds = Array.from(
        new Set((bookings || []).map((b: any) => b.student_id).filter(Boolean)),
      );
      const studentMap = new Map<string, any>();
      if (studentIds.length > 0) {
        const { data: studs } = await supabase
          .from("students")
          .select("id, full_name, email, phone")
          .in("id", studentIds);
        (studs || []).forEach((s: any) => studentMap.set(s.id, s));
      }

      const { data: sessions, error: sessionsErr } = await supabase
        .from("live_course_sessions")
        .select(
          `id, session_date, session_time, duration_minutes, title, live_course_id,
           zoom_join_url, zoom_start_url`,
        )
        .eq("tenant_id", tenantId)
        .gte("session_date", today);
      if (sessionsErr) console.error("live sessions error", sessionsErr);

      const liveCourseIds = Array.from(
        new Set((sessions || []).map((s: any) => s.live_course_id).filter(Boolean)),
      );
      const liveCourseMap = new Map<string, any>();
      const countsMap = new Map<string, number>();
      if (liveCourseIds.length > 0) {
        const { data: liveCourses, error: liveCoursesErr } = await supabase
          .from("live_courses")
          .select("id, title, meeting_link, attendance_type, location_name")
          .eq("tenant_id", tenantId)
          .in("id", liveCourseIds);
        if (liveCoursesErr) console.error("live courses error", liveCoursesErr);
        (liveCourses || []).forEach((course: any) => liveCourseMap.set(course.id, course));

        const { data: purchases } = await supabase
          .from("live_course_purchases")
          .select("live_course_id")
          .eq("tenant_id", tenantId)
          .in("live_course_id", liveCourseIds)
          .eq("payment_status", "completed");
        (purchases || []).forEach((p: any) => {
          countsMap.set(p.live_course_id, (countsMap.get(p.live_course_id) || 0) + 1);
        });
      }

      const consultationItems: UpcomingItem[] = (bookings || []).map((b: any) => ({
        id: `c-${b.id}`,
        kind: "consultation",
        title: b.live_courses?.title || t("upcomingAppointments.defaultConsultation"),
        date: b.booking_date,
        time: b.booking_time,
        durationMinutes: b.duration_minutes || 30,
        meetingLink: b.zoom_start_url || b.meeting_link,
        locationName: b.live_courses?.location_name,
        attendanceType: b.live_courses?.attendance_type,
        attendeeName: studentMap.get(b.student_id)?.full_name,
        attendeePhone: studentMap.get(b.student_id)?.phone,
        attendeeEmail: studentMap.get(b.student_id)?.email,
      }));

      const sessionItems: UpcomingItem[] = (sessions || []).map((s: any) => ({
        id: `s-${s.id}`,
        kind: "live_session",
        title: `${liveCourseMap.get(s.live_course_id)?.title || t("upcomingAppointments.defaultLiveCourse")}${s.title ? ` — ${s.title}` : ""}`,
        date: s.session_date,
        time: s.session_time,
        durationMinutes: s.duration_minutes || 60,
        meetingLink: s.zoom_start_url || s.zoom_join_url || liveCourseMap.get(s.live_course_id)?.meeting_link,
        locationName: liveCourseMap.get(s.live_course_id)?.location_name,
        attendanceType: liveCourseMap.get(s.live_course_id)?.attendance_type,
        attendeesCount: countsMap.get(s.live_course_id) || 0,
      }));

      const now = Date.now();
      const merged = [...consultationItems, ...sessionItems]
        .filter((it) => {
          const start = new Date(`${it.date}T${(it.time || "00:00:00").slice(0, 8)}`).getTime();
          if (Number.isNaN(start)) return true;
          return start + (it.durationMinutes || 60) * 60000 >= now;
        })
        .sort((a, b) => {
          const ad = `${a.date}T${a.time}`;
          const bd = `${b.date}T${b.time}`;
          return ad < bd ? -1 : ad > bd ? 1 : 0;
        });


      setItems(merged);
      setLoading(false);
    };
    if (tenantId) fetchAll();
  }, [tenantId, i18n.language]);

  const grouped = useMemo(() => {
    const map = new Map<string, UpcomingItem[]>();
    for (const it of items) {
      const arr = map.get(it.date) || [];
      arr.push(it);
      map.set(it.date, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div dir={dir}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><CalendarCheck className="h-6 w-6 text-primary" />{t("upcomingAppointments.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("upcomingAppointments.subtitle")}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("upcomingAppointments.empty")}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayItems]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">{formatLocaleDate(date)}</h3>
                <span className="text-xs text-muted-foreground">
                  ({dayItems.length} {t("upcomingAppointments.appointmentsLabel")})
                </span>
              </div>
              <div className="space-y-3">
                {dayItems.map((it) => (
                  <Card key={it.id} className="glass-card p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {it.kind === "consultation" ? (
                            <Badge variant="secondary" className="gap-1">
                              <User className="w-3 h-3" />
                              {t("upcomingAppointments.consultation")}
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-primary/10 text-primary border-0">
                              <Users className="w-3 h-3" />
                              {t("upcomingAppointments.liveCourse")}
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(it.time)} ({it.durationMinutes} {t("upcomingAppointments.minutes")})
                          </Badge>
                        </div>

                        <p className="font-semibold mb-2">{it.title}</p>

                        {it.kind === "consultation" && it.attendeeName && (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5" />
                              <span>{it.attendeeName}</span>
                            </div>
                            {it.attendeePhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5" />
                                <span dir="ltr">{it.attendeePhone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {it.kind === "live_session" && (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            <span>{it.attendeesCount || 0} {t("upcomingAppointments.attendees")}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-stretch">
                        {it.meetingLink && (
                          <Button
                            asChild
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                          >
                            <a href={it.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4 ml-1" />
                              {t("upcomingAppointments.join")}
                              <ExternalLink className="w-3 h-3 mr-1" />
                            </a>
                          </Button>
                        )}
                        {!it.meetingLink && it.locationName && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {it.locationName}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentorUpcomingAppointments;
