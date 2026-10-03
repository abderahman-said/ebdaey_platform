import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import {
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  CalendarRange,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ban,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  scheduleId: string;
  tenantId: string;
  onBack: () => void;
}

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  _new?: boolean;
}

interface Override {
  id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MONTH_KEYS = [
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
] as const;
const TIMEZONE_KEYS = [
  { v: "Africa/Cairo", k: "cairo" },
  { v: "Asia/Riyadh", k: "riyadh" },
  { v: "Asia/Dubai", k: "dubai" },
  { v: "Europe/London", k: "london" },
  { v: "America/New_York", k: "newYork" },
] as const;

// Generate 24h time options every 30 min
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const hh = h.toString().padStart(2, "0");
  return `${hh}:${m}`;
});

const useFormatTimeLabel = () => {
  const { t } = useTranslation();
  return (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? t("scheduleEditor.period.pm") : t("scheduleEditor.period.am");
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  };
};

const MentorScheduleEditor = ({ scheduleId, tenantId, onBack }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const formatTimeLabel = useFormatTimeLabel();
  const { toast } = useToast();
  const dataLoaded = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const markDirty = useCallback(() => {
    if (dataLoaded.current) setIsDirty(true);
  }, []);

  // Override dialog state
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const loadAll = async () => {
    setLoading(true);
    const [scheduleRes, slotsRes, overridesRes] = await Promise.all([
      supabase
        .from("mentor_schedules" as any)
        .select("*")
        .eq("id", scheduleId)
        .single(),
      supabase
        .from("mentor_schedule_slots" as any)
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("mentor_schedule_overrides" as any)
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("date"),
    ]);
    if (scheduleRes.error || !scheduleRes.data) {
      toast({ title: t("scheduleEditor.loadFailed"), variant: "destructive" });
      onBack();
      return;
    }
    const s: any = scheduleRes.data;
    setTitle(s.title);
    setTimezone(s.timezone);
    setSlots(
      ((slotsRes.data as any) || []).map((x: any) => ({
        id: x.id,
        day_of_week: x.day_of_week,
        start_time: x.start_time?.slice(0, 5) || "09:00",
        end_time: x.end_time?.slice(0, 5) || "17:00",
      })),
    );
    setOverrides(
      ((overridesRes.data as any) || []).map((x: any) => ({
        id: x.id,
        date: x.date,
        is_available: x.is_available,
        start_time: x.start_time?.slice(0, 5) || null,
        end_time: x.end_time?.slice(0, 5) || null,
      })),
    );
    setLoading(false);
    setTimeout(() => {
      dataLoaded.current = true;
    }, 100);
  };

  useEffect(() => {
    loadAll(); /* eslint-disable-next-line */
  }, [scheduleId]);

  useEffect(() => {
    markDirty();
  }, [title, timezone, slots, overrides, markDirty]);

  const addSlot = (day: number) => {
    setSlots((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${Math.random()}`,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        _new: true,
      },
    ]);
  };
  const removeSlot = (id: string) =>
    setSlots((prev) => prev.filter((s) => s.id !== id));
  const updateSlot = (id: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: t("scheduleEditor.titleRequired"), variant: "destructive" });
      return;
    }
    setSaving(true);
    // Update schedule
    await supabase
      .from("mentor_schedules" as any)
      .update({
        title: title.trim(),
        timezone,
      } as any)
      .eq("id", scheduleId);

    // Sync slots: delete all then re-insert
    await supabase
      .from("mentor_schedule_slots" as any)
      .delete()
      .eq("schedule_id", scheduleId);
    if (slots.length) {
      await supabase.from("mentor_schedule_slots" as any).insert(
        slots.map((s) => ({
          schedule_id: scheduleId,
          tenant_id: tenantId,
          day_of_week: s.day_of_week,
          start_time: s.start_time + ":00",
          end_time: s.end_time + ":00",
        })) as any,
      );
    }

    setSaving(false);
    toast({ title: t("scheduleEditor.saved") });
    setIsDirty(false);
    loadAll();
  };

  const handleBack = () => {
    if (isDirty) setShowUnsaved(true);
    else onBack();
  };

  // Calendar logic
  const daysWithSlots = new Set(slots.map((s) => s.day_of_week));
  const overrideMap = new Map(overrides.map((o) => [o.date, o]));

  const fmtDate = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const handleDayClick = (date: Date) => {
    setOverrideDate(date);
  };

  const currentOverride = overrideDate
    ? overrideMap.get(fmtDate(overrideDate))
    : null;
  const [ovAvailable, setOvAvailable] = useState(true);
  const [ovStart, setOvStart] = useState("09:00");
  const [ovEnd, setOvEnd] = useState("17:00");

  useEffect(() => {
    if (currentOverride) {
      setOvAvailable(currentOverride.is_available);
      setOvStart(currentOverride.start_time || "09:00");
      setOvEnd(currentOverride.end_time || "17:00");
    } else {
      setOvAvailable(true);
      setOvStart("09:00");
      setOvEnd("17:00");
    }
  }, [overrideDate]);

  const saveOverride = async () => {
    if (!overrideDate) return;
    const dateStr = fmtDate(overrideDate);
    const payload: any = {
      schedule_id: scheduleId,
      tenant_id: tenantId,
      date: dateStr,
      is_available: ovAvailable,
      start_time: ovAvailable ? ovStart + ":00" : null,
      end_time: ovAvailable ? ovEnd + ":00" : null,
    };
    if (currentOverride) {
      await supabase
        .from("mentor_schedule_overrides" as any)
        .update(payload)
        .eq("id", currentOverride.id);
    } else {
      await supabase.from("mentor_schedule_overrides" as any).insert(payload);
    }
    setOverrideDate(null);
    toast({ title: t("scheduleEditor.savedShort") });
    loadAll();
  };

  const removeOverride = async () => {
    if (!currentOverride) return;
    await supabase
      .from("mentor_schedule_overrides" as any)
      .delete()
      .eq("id", currentOverride.id);
    setOverrideDate(null);
    toast({ title: t("scheduleEditor.resetDay") });
    loadAll();
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

      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowRight className={`w-5 h-5 ${dir === "ltr" ? "rotate-180" : ""}`} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
              {t("scheduleEditor.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("scheduleEditor.subtitle")}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-primary text-primary-foreground  dark:bg-white dark:text-black  border-0 rounded-xl px-4 sm:px-6 shadow-lg flex-1 sm:flex-none text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 ml-1 sm:ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-1 sm:ml-2" />}
          {saving ?  t("scheduleEditor.saving") : t("scheduleEditor.save")}
        </Button>
      </div>

      <Tabs defaultValue="weekly" dir={dir as "rtl" | "ltr"}>
        <div className="glass-card rounded-2xl p-1.5 mb-4 sm:mb-6 max-w-2xl mx-auto">
          <TabsList className="w-full h-auto gap-1 bg-transparent p-0">
            <TabsTrigger
              value="weekly"
              className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200"
            >
              <Clock className="w-4 h-4" /> {t("scheduleEditor.tabs.weekly")}
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200"
            >
              <CalendarDays className="w-4 h-4" /> {t("scheduleEditor.tabs.calendar")}
            </TabsTrigger>

          </TabsList>
        </div>

        {/* Weekly hours */}
        <TabsContent value="weekly">
          <div className="glass-card rounded-2xl p-6 space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t("scheduleEditor.form.titleLabel")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("scheduleEditor.form.titlePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {t("scheduleEditor.form.timezone")} <span className="text-destructive">*</span>
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_KEYS.map((tz) => (
                      <SelectItem key={tz.v} value={tz.v}>
                        {t(`scheduleEditor.timezones.${tz.k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


            <div className="space-y-3">
              <Label className="text-base font-semibold">
                {t("scheduleEditor.slots.availableTimes")}
              </Label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
                {t("scheduleEditor.slots.hint")}
              </div>

              <div className="space-y-1">
                {DAY_KEYS.map((dayKey, dayIdx) => {
                  const daySlots = slots.filter(
                    (s) => s.day_of_week === dayIdx,
                  );
                  return (
                    <div
                      key={dayIdx}
                      className="border-t border-border/50 pt-3 first:border-t-0 first:pt-0"
                    >
                      <p className="font-semibold text-sm mb-2">{t(`scheduleEditor.days.${dayKey}`)}</p>
                      {daySlots.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 mb-2"
                        >
                          <button
                            type="button"
                            onClick={() => removeSlot(s.id)}
                            className="text-destructive hover:bg-destructive/10 rounded-lg p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Select
                            value={s.start_time}
                            onValueChange={(v) =>
                              updateSlot(s.id, { start_time: v })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {formatTimeLabel(time)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">-</span>
                          <Select
                            value={s.end_time}
                            onValueChange={(v) =>
                              updateSlot(s.id, { end_time: v })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {formatTimeLabel(time)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addSlot(dayIdx)}
                        className="gap-1 h-8 text-xs"
                      >
                        <Plus className="w-3 h-3" /> {t("scheduleEditor.slots.add")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar">
          <MonthGridCalendar
            month={calendarMonth}
            setMonth={setCalendarMonth}
            onDayClick={handleDayClick}
            slots={slots}
            overrideMap={overrideMap}
            fmtDate={fmtDate}
          />
        </TabsContent>
      </Tabs>

      {/* Override dialog */}
      <Dialog
        open={!!overrideDate}
        onOpenChange={(o) => !o && setOverrideDate(null)}
      >
        <DialogContent dir={dir as "rtl" | "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {overrideDate?.toLocaleDateString(locale, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <Label className="text-sm font-semibold">{t("scheduleEditor.override.available")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("scheduleEditor.override.disableHint")}
                </p>
              </div>
              <Switch
                checked={ovAvailable}
                onCheckedChange={setOvAvailable}
                dir="ltr"
              />
            </div>
            {ovAvailable && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("scheduleEditor.override.from")}</Label>
                  <Select value={ovStart} onValueChange={setOvStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeLabel(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("scheduleEditor.override.to")}</Label>
                  <Select value={ovEnd} onValueChange={setOvEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeLabel(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            {currentOverride && (
              <Button
                variant="outline"
                onClick={removeOverride}
                className="text-destructive hover:text-destructive"
              >
                {t("scheduleEditor.override.remove")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setOverrideDate(null)}>
              {t("scheduleEditor.override.cancel")}
            </Button>
            <Button
              onClick={saveOverride}
              className="gradient-primary text-primary-foreground"
            >
              {t("scheduleEditor.override.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorScheduleEditor;

// ============ Month Grid Calendar ============
interface MonthGridProps {
  month: Date;
  setMonth: (d: Date) => void;
  onDayClick: (d: Date) => void;
  slots: Slot[];
  overrideMap: Map<string, Override>;
  fmtDate: (d: Date) => string;
}

const MonthGridCalendar = ({
  month,
  setMonth,
  onDayClick,
  slots,
  overrideMap,
  fmtDate,
}: MonthGridProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const dow = firstOfMonth.getDay();
  const offsetFromSat = (dow + 1) % 7;
  const gridStart = new Date(year, m, 1 - offsetFromSat);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      ),
    );
  }

  const headerOrder = [6, 0, 1, 2, 3, 4, 5];

  const slotsByDay = new Map<number, Slot[]>();
  slots.forEach((s) => {
    const arr = slotsByDay.get(s.day_of_week) || [];
    arr.push(s);
    slotsByDay.set(s.day_of_week, arr);
  });

  const fmtTime = (time: string) => {
    const [hh, mm] = time.split(":").map(Number);
    const period = hh >= 12 ? t("scheduleEditor.period.pm") : t("scheduleEditor.period.am");
    const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return `${h12.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")} ${period}`;
  };

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  let availableCount = 0,
    customCount = 0,
    blockedCount = 0;
  cells.forEach((date) => {
    if (date.getMonth() !== m) return;
    const ov = overrideMap.get(fmtDate(date));
    if (ov) {
      if (!ov.is_available) blockedCount++;
      else customCount++;
    } else if ((slotsByDay.get(date.getDay()) || []).length > 0) {
      availableCount++;
    }
  });

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-6 space-y-5 overflow-hidden relative">
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              {t(`scheduleEditor.months.${MONTH_KEYS[m]}`)} {year}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("scheduleEditor.calendar.clickToCustomize")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/40 backdrop-blur rounded-2xl p-1 border border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(new Date(year, m - 1, 1))}
            className="h-8 w-8 p-0 rounded-xl hover:bg-background"
          >
            <PrevIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(new Date())}
            className="h-8 px-3 text-xs rounded-xl hover:bg-background font-semibold"
          >
            {t("scheduleEditor.calendar.today")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(new Date(year, m + 1, 1))}
            className="h-8 w-8 p-0 rounded-xl hover:bg-background"
          >
            <NextIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {availableCount} {t("scheduleEditor.calendar.daysAvailable")}
        </div>
        {customCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {customCount} {t("scheduleEditor.calendar.customTimes")}
          </div>
        )}
        {blockedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            <Ban className="w-3 h-3" />
            {blockedCount} {t("scheduleEditor.calendar.daysBlocked")}
          </div>
        )}
      </div>

      <div className="relative grid grid-cols-7 gap-1.5 text-center">
        {headerOrder.map((d) => (
          <div
            key={d}
            className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider py-1 rtl:tracking-normal"
          >
            {t(`scheduleEditor.days.${DAY_KEYS[d]}`)}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((date, idx) => {
          const inMonth = date.getMonth() === m;
          const ds = fmtDate(date);
          const ov = overrideMap.get(ds);
          const dayOfWeek = date.getDay();
          const defaultSlots = slotsByDay.get(dayOfWeek) || [];
          const isBlocked = ov ? !ov.is_available : false;
          const hasCustom = !!ov && ov.is_available;
          const isAvailable = ov ? ov.is_available : defaultSlots.length > 0;
          const isToday = isSameDay(date, today);
          const isPast =
            date <
            new Date(today.getFullYear(), today.getMonth(), today.getDate());

          let displaySlots: { start: string; end: string }[] = [];
          if (ov) {
            if (ov.is_available && ov.start_time && ov.end_time) {
              displaySlots = [{ start: ov.start_time, end: ov.end_time }];
            }
          } else {
            displaySlots = defaultSlots.map((s) => ({
              start: s.start_time,
              end: s.end_time,
            }));
          }

          const baseStyle =
            "group relative min-h-[104px] sm:min-h-[110px] p-1 sm:p-2.5 rounded-xl sm:rounded-2xl border text-end transition-all duration-200 flex flex-col gap-1 overflow-hidden hover:scale-[1.03] hover:shadow-lg hover:z-10";

          let stateStyle = "bg-muted/20 border-border/40 hover:bg-muted/40";
          if (isBlocked) {
            stateStyle =
              "bg-destructive/5 border-destructive/30 hover:bg-destructive/10";
          } else if (hasCustom) {
            stateStyle =
              "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/40 hover:border-primary/60";
          } else if (isAvailable) {
            stateStyle =
              "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50";
          }
          if (!inMonth) stateStyle += " opacity-40";
          if (isPast && inMonth && !ov) stateStyle += " opacity-60";

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick(date)}
              className={`${baseStyle} ${stateStyle}`}
            >
              {isToday && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-1 ring-offset-background pointer-events-none" />
              )}

              <div className="flex items-start justify-between gap-1">
                <div className="flex flex-col gap-0.5 items-start">
                  {isBlocked && (
                    <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                  )}
                  {hasCustom && (
                    <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-md">
                      {t("scheduleEditor.calendar.custom")}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm sm:text-base font-black tabular-nums ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-xl w-7 h-7 flex items-center justify-center shadow-md"
                      : isBlocked
                        ? "text-destructive line-through"
                        : "text-foreground"
                  }`}
                >
                  {date.getDate().toString().padStart(2, "0")}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 overflow-hidden mt-auto w-full">
                {/* Mobile: stacked compact times */}
                <div className="flex flex-col gap-0.5 sm:hidden w-full">
                  {displaySlots.slice(0, 1).map((s, i) => (
                    <span
                      key={i}
                      className={`flex flex-col items-center leading-tight text-[8px] font-bold px-1 py-0.5 rounded-md w-full ${
                        hasCustom
                          ? "bg-primary/20 text-primary"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      }`}
                      dir="ltr"
                    >
                      <span className="tabular-nums">{fmtTime(s.start)}</span>
                      <span className="opacity-60">↓</span>
                      <span className="tabular-nums">{fmtTime(s.end)}</span>
                    </span>
                  ))}
                  {displaySlots.length > 1 && (
                    <span className="text-[8px] font-bold text-primary text-center">
                      +{displaySlots.length - 1}
                    </span>
                  )}
                </div>

                {/* Desktop: inline range */}
                <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden">
                  {displaySlots.slice(0, 2).map((s, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md ${
                        hasCustom
                          ? "bg-primary/20 text-primary"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      }`}
                      dir="ltr"
                    >
                      {fmtTime(s.start)} - {fmtTime(s.end)}
                    </span>
                  ))}
                  {displaySlots.length > 2 && (
                    <span className="text-[9px] font-bold text-primary px-1.5">
                      +{displaySlots.length - 2} {t("scheduleEditor.calendar.more")}
                    </span>
                  )}
                </div>
              </div>

            </button>
          );
        })}
      </div>

      <div className="relative flex flex-wrap gap-3 text-[11px] text-muted-foreground justify-center pt-2 border-t border-border/40">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/40" />
          {t("scheduleEditor.calendar.legend.defaultAvailable")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40" />
          {t("scheduleEditor.calendar.legend.custom")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-destructive/10 border border-destructive/40" />
          {t("scheduleEditor.calendar.legend.blocked")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md ring-2 ring-primary ring-offset-1 ring-offset-background" />
          {t("scheduleEditor.calendar.legend.today")}
        </span>
      </div>
    </div>
  );
};
