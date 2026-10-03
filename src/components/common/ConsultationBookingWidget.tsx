import { useMemo, useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Clock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CalendarCheck, Globe } from "lucide-react";
import { toAr, cn } from "@/lib/utils";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import i18n from "@/i18n";

interface Slot { day_of_week: number; start_time: string; end_time: string; }
interface Override { date: string; is_available: boolean; start_time: string | null; end_time: string | null; }
interface Booking { booking_date: string; booking_time: string; duration_minutes: number; }
interface BusyRange { start: string; end: string; }

export interface BookingPolicy {
  minLeadHours?: number | null;
  bufferSlots?: number | null;
  windowDays?: number | null;
  startDate?: string | null; // yyyy-mm-dd
  endDate?: string | null; // yyyy-mm-dd
}

interface Props {
  durationMinutes: number;
  slots: Slot[];
  overrides: Override[];
  bookings: Booking[];
  externalBusy?: BusyRange[]; // Google Calendar busy ranges (ISO)
  policy?: BookingPolicy;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelect: (date: Date, time: string) => void;
  onConfirm?: (date: Date, time: string) => void; // called by the inner "Book now" button to trigger checkout/booking
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const fmtTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const fmtTimeAr = (t: string) => {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const isEn = i18n.language?.startsWith("en");
  const period = isEn ? (h >= 12 ? "PM" : "AM") : (h >= 12 ? "م" : "ص");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (isEn) return `${h12}:${mStr} ${period}`;
  return `${toAr(h12)}:${toAr(mStr)} ${period}`;
};
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ConsultationBookingWidget = ({
  durationMinutes, slots, overrides, bookings, externalBusy = [], policy,
  selectedDate, selectedTime, onSelect, onConfirm,
}: Props) => {
  const [month, setMonth] = useState<Date>(new Date());
  const [compactShowCalendar, setCompactShowCalendar] = useState(true);
  const [pendingTime, setPendingTime] = useState<string | null>(null);
  const { t, i18n: i18nInst } = useTranslation();
  const isEn = i18nInst.language?.startsWith("en");
  const isCompact = useIsBelowBreakpoint(1024);

  // Clear pending selection when the parent resets the time (e.g. date change)
  useEffect(() => {
    if (!selectedTime) setPendingTime(null);
  }, [selectedDate, selectedTime]);

  const bookedByDate = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const b of bookings) {
      if (!map[b.booking_date]) map[b.booking_date] = new Set();
      map[b.booking_date].add(b.booking_time.slice(0, 5));
    }
    return map;
  }, [bookings]);

  // Parse external busy ranges into ms epoch ranges once
  const externalBusyMs = useMemo(() => {
    return externalBusy
      .map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
  }, [externalBusy]);

  const minLeadMs = Math.max(0, policy?.minLeadHours ?? 0) * 3600 * 1000;
  const bufferSlots = Math.max(0, policy?.bufferSlots ?? 0);

  const availableTimes = useMemo(() => {
    if (!selectedDate || !durationMinutes) return [];
    const key = dateKey(selectedDate);
    const dow = selectedDate.getDay();
    const ov = overrides.find(o => o.date === key);
    let ranges: Array<[number, number]> = [];
    if (ov) {
      if (!ov.is_available) return [];
      if (ov.start_time && ov.end_time) ranges.push([toMin(ov.start_time), toMin(ov.end_time)]);
    } else {
      ranges = slots.filter(s => s.day_of_week === dow).map(s => [toMin(s.start_time), toMin(s.end_time)]);
    }
    const times: string[] = [];
    const now = new Date();
    const isToday = key === dateKey(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const booked = bookedByDate[key] || new Set();
    // Booked minutes, expanded by the mentor's buffer (N slots before/after)
    const bookedMins = Array.from(booked).map(toMin);
    const blockedSpan = bufferSlots * durationMinutes;
    // Build slot start/end epoch (Africa/Cairo assumed = local browser tz for user)
    const dayBase = new Date(selectedDate);
    dayBase.setHours(0, 0, 0, 0);
    for (const [start, end] of ranges) {
      for (let t = start; t + durationMinutes <= end; t += durationMinutes) {
        if (isToday && t <= nowMins) continue;
        const tStr = fmtTime(t);
        if (booked.has(tStr)) continue;
        if (blockedSpan > 0 && bookedMins.some((b) => Math.abs(b - t) <= blockedSpan)) continue;
        // Check external busy overlap
        const slotStart = dayBase.getTime() + t * 60 * 1000;
        const slotEnd = slotStart + durationMinutes * 60 * 1000;
        if (minLeadMs > 0 && slotStart < Date.now() + minLeadMs) continue;
        const clashes = externalBusyMs.some((b) => b.start < slotEnd && b.end > slotStart);
        if (clashes) continue;
        times.push(tStr);
      }
    }
    return times;
  }, [selectedDate, slots, overrides, durationMinutes, bookedByDate, externalBusyMs, minLeadMs, bufferSlots]);

  const isDayDisabled = (d: Date) => {
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    const key = dateKey(d);
    if (policy?.startDate && key < policy.startDate) return true;
    if (policy?.endDate && key > policy.endDate) return true;
    if (policy?.windowDays) {
      const limit = new Date();
      limit.setHours(0, 0, 0, 0);
      limit.setDate(limit.getDate() + policy.windowDays);
      if (d > limit) return true;
    }
    const ov = overrides.find(o => o.date === key);
    if (ov && !ov.is_available) return true;
    if (ov && ov.start_time && ov.end_time) return false;
    const dow = d.getDay();
    return !slots.some(s => s.day_of_week === dow);
  };

  // Group times by period
  const periods = useMemo(() => {
    const groups = { morning: [] as string[], afternoon: [] as string[], evening: [] as string[] };
    for (const t of availableTimes) {
      const h = parseInt(t.split(":")[0], 10);
      if (h < 12) groups.morning.push(t);
      else if (h < 17) groups.afternoon.push(t);
      else groups.evening.push(t);
    }
    return groups;
  }, [availableTimes]);

  const periodLabel: Record<string, string> = {
    morning: t("miscPublic.booking.morning"),
    afternoon: t("miscPublic.booking.afternoon"),
    evening: t("miscPublic.booking.evening"),
  };

  const showCompactTimes = isCompact && selectedDate && !compactShowCalendar;

  const timeSlotsSection = (
    <div>
      {selectedDate && (() => {
        const cardInner = (
          <>
            {showCompactTimes && (
              <div className="w-8 h-8 rounded-lg bg-background border border-border/60 text-primary flex items-center justify-center shrink-0 transition group-hover:border-primary/50">
                {isEn ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            )}
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-start">
              <p className="text-xs font-bold text-foreground truncate">
                {t("miscPublic.booking.selectedDate")}: {format(selectedDate, isEn ? "EEEE, d MMMM yyyy" : "EEEE، d MMMM yyyy", { locale: isEn ? enUS : arSA })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("miscPublic.booking.timezone", { tz: isEn ? "Egypt time" : "توقيت مصر" })}
              </p>
            </div>
          </>
        );
        return showCompactTimes ? (
          <button
            type="button"
            onClick={() => {
              onSelect(selectedDate, "");
              setCompactShowCalendar(true);
            }}
            aria-label={t("miscPublic.booking.changeDate")}
            className="group w-full rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4 flex items-center gap-3 animate-fade-in hover:border-primary/50 hover:bg-primary/10 transition cursor-pointer"
          >
            {cardInner}
          </button>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4 flex items-center gap-3 animate-fade-in">
            {cardInner}
          </div>
        );
      })()}

      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold leading-tight">{t("miscPublic.booking.chooseTime")}</h3>
          <p className="text-[11px] text-muted-foreground">{t("miscPublic.booking.duration", { n: isEn ? durationMinutes : toAr(durationMinutes) })}</p>
        </div>
      </div>

      {!selectedDate ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
          <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{t("miscPublic.booking.chooseDate")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("miscPublic.booking.chooseDateHint")}</p>
        </div>
      ) : availableTimes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">{t("miscPublic.booking.noSlots")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("miscPublic.booking.chooseOtherDay")}</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {(["morning", "afternoon", "evening"] as const).map((p) =>
            periods[p].length > 0 ? (
              <div key={p}>
                <div className="text-[11px] font-bold text-muted-foreground mb-2 px-1">
                  {periodLabel[p]} <span className="text-muted-foreground/60 font-normal">· {t("miscPublic.booking.slotCount", { n: isEn ? periods[p].length : toAr(periods[p].length) })}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {periods[p].map((t) => {
                    const active = (pendingTime ?? selectedTime) === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setPendingTime(t);
                          if (selectedDate) onSelect(selectedDate, t);
                        }}
                        className={cn(
                          "relative h-11 rounded-xl text-sm font-semibold border transition-all duration-200 inline-flex items-center justify-center",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30 scale-[1.02]"
                            : "bg-card border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                        )}
                        dir="ltr"
                      >
                        {active && (
                          <CheckCircle2 className="w-3.5 h-3.5 absolute top-1 right-1.5" />
                        )}
                        {fmtTimeAr(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}

          {/* Book button appears after a time is chosen (all views) */}
          {pendingTime && (
            <div className="pt-2 booking-panel-enter">
              <Button
                type="button"
                size="lg"
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25"
                onClick={() => {
                  if (selectedDate && pendingTime) {
                    onSelect(selectedDate, pendingTime);
                    setPendingTime(null);
                    onConfirm?.(selectedDate, pendingTime);
                  }
                }}
              >
                <CalendarCheck className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                {t("miscPublic.booking.bookNow")}
                <span className="mx-1.5 opacity-80">·</span>
                <span dir="ltr">{fmtTimeAr(pendingTime)}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {!showCompactTimes && (
        /* Section title */
        <div className="flex items-center gap-2 mb-1 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">{t("miscPublic.booking.chooseDate")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("miscPublic.booking.chooseDateHint")}</p>
          </div>
        </div>
      )}

      {showCompactTimes ? (
        <div key="times" className="space-y-4 booking-panel-enter">
          {timeSlotsSection}
        </div>
      ) : (
        <div
          key={isCompact ? `calendar-${compactShowCalendar}` : "calendar"}
          className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start ${isCompact ? "booking-panel-enter booking-panel-enter-reverse" : ""}`}
        >
          {/* Calendar Card */}
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-2 sm:p-3 shadow-sm">
            <Calendar
              mode="single"
              locale={isEn ? enUS : arSA}
              dir={isEn ? "ltr" : "rtl"}
              weekStartsOn={isEn ? 0 : 6}
              selected={selectedDate || undefined}
              onSelect={(d) => {
                if (!d) return;
                onSelect(d, "");
                if (isCompact) setCompactShowCalendar(false);
              }}
              month={month}
              onMonthChange={setMonth}
              disabled={isDayDisabled}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-3",
                caption: "flex justify-center pt-1 relative items-center mb-2",
                caption_label: "text-sm font-bold capitalize",
                nav_button: "h-7 w-7 bg-background border border-border/60 rounded-lg p-0 opacity-80 hover:opacity-100 hover:border-primary/40 inline-flex items-center justify-center transition",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "flex-1 text-muted-foreground font-semibold text-[11px] uppercase tracking-wide py-2 rtl:tracking-normal",
                row: "flex w-full mt-1",
                cell: "flex-1 aspect-square text-center text-sm p-0.5 relative",
                day: "w-full h-full rounded-xl font-medium text-foreground hover:bg-primary/15 hover:text-foreground hover:ring-1 hover:ring-primary/40 transition aria-selected:opacity-100 inline-flex items-center justify-center",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md shadow-primary/30",
                day_today: "ring-1 ring-primary/40 text-primary font-bold",
                day_outside: "text-muted-foreground/30",
                day_disabled: "text-muted-foreground/30 line-through opacity-50 hover:bg-transparent hover:text-muted-foreground/30 cursor-not-allowed",
              }}
            />
          </div>

          {!isCompact && timeSlotsSection}
        </div>
      )}
    </div>
  );
};

export default ConsultationBookingWidget;
