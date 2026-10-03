import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface AdvancedRangeValue {
  from: Date;
  to: Date;
  compare?: { from: Date; to: Date } | null;
  presetId?: string;
  presetLabel?: string;
}

interface Props {
  value: AdvancedRangeValue;
  onChange: (v: AdvancedRangeValue) => void;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

type Preset = {
  id: string;
  build: () => { from: Date; to: Date };
  /** Keep the exact times instead of widening to full calendar days. */
  exact?: boolean;
};

const today = () => startOfDay(new Date());

const PRESETS: Preset[] = [
  {
    id: "last24h",
    exact: true,
    build: () => {
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      return { from, to };
    },
  },
  { id: "today", build: () => ({ from: today(), to: endOfDay(new Date()) }) },
  { id: "yesterday", build: () => ({ from: addDays(today(), -1), to: endOfDay(addDays(today(), -1)) }) },
  { id: "today_yesterday", build: () => ({ from: addDays(today(), -1), to: endOfDay(new Date()) }) },
  { id: "last7", build: () => ({ from: addDays(today(), -6), to: endOfDay(new Date()) }) },
  { id: "last14", build: () => ({ from: addDays(today(), -13), to: endOfDay(new Date()) }) },
  { id: "last28", build: () => ({ from: addDays(today(), -27), to: endOfDay(new Date()) }) },
  { id: "last30", build: () => ({ from: addDays(today(), -29), to: endOfDay(new Date()) }) },
  { id: "last90", build: () => ({ from: addDays(today(), -89), to: endOfDay(new Date()) }) },
  {
    id: "this_week",
    build: () => {
      const d = today();
      const day = d.getDay();
      const from = addDays(d, -day);
      return { from, to: endOfDay(new Date()) };
    },
  },
  {
    id: "last_week",
    build: () => {
      const d = today();
      const day = d.getDay();
      const thisWeekStart = addDays(d, -day);
      const from = addDays(thisWeekStart, -7);
      const to = endOfDay(addDays(thisWeekStart, -1));
      return { from, to };
    },
  },
  {
    id: "this_month",
    build: () => {
      const d = new Date();
      const from = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
      return { from, to: endOfDay(new Date()) };
    },
  },
  {
    id: "last_month",
    build: () => {
      const d = new Date();
      const from = startOfDay(new Date(d.getFullYear(), d.getMonth() - 1, 1));
      const to = endOfDay(new Date(d.getFullYear(), d.getMonth(), 0));
      return { from, to };
    },
  },
  {
    id: "max",
    build: () => ({ from: addDays(today(), -364), to: endOfDay(new Date()) }),
  },
];

export default function AdvancedDateRangePicker({ value, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: value.from, to: value.to });
  const [compareEnabled, setCompareEnabled] = useState<boolean>(!!value.compare);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const fmt = (d: Date) =>
    d.toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  useEffect(() => {
    if (open) {
      setDraft({ from: value.from, to: value.to });
      setCompareEnabled(!!value.compare);
      setActivePreset(null);
    }
  }, [open, value]);

  const applyPreset = (p: Preset) => {
    const r = p.build();
    setDraft({ from: r.from, to: r.to });
    setActivePreset(p.id);
  };

  const handleUpdate = () => {
    if (!draft?.from) return;
    const preset = PRESETS.find((p) => p.id === activePreset);
    const exact = !!preset?.exact;
    const from = exact ? new Date(draft.from) : startOfDay(draft.from);
    const to = exact
      ? new Date(draft.to || draft.from)
      : endOfDay(draft.to || draft.from);
    const spanMs = to.getTime() - from.getTime();
    const compare = compareEnabled
      ? exact
        ? { from: new Date(from.getTime() - spanMs), to: new Date(from.getTime() - 1) }
        : {
            from: addDays(from, -(Math.round(spanMs / 86400000) + 1)),
            to: endOfDay(addDays(from, -1)),
          }
      : null;
    onChange({
      from,
      to,
      compare,
      presetId: preset?.id,
      presetLabel: preset ? t(`advancedDateRangePicker.presets.${preset.id}`) : undefined,
    });
    setOpen(false);
  };

  const triggerLabel = value.presetId
    ? t(`advancedDateRangePicker.presets.${value.presetId}`)
    : value.presetLabel
    ? value.presetLabel
    : `${fmt(value.from)} - ${fmt(value.to)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full glass-card gap-2 px-4 h-10 font-medium"
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[95vw] p-0 overflow-hidden"
        dir={i18n.dir()}
      >
        <div className="flex flex-col md:flex-row">
          {/* Presets */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-l border-border bg-muted/30 p-3 max-h-[320px] md:max-h-none overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              {t("advancedDateRangePicker.quickRanges")}
            </p>
            <div className="flex md:flex-col gap-1 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "text-start text-sm px-3 py-1.5 rounded-md hover:bg-accent transition-colors md:w-full",
                    activePreset === p.id && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {t(`advancedDateRangePicker.presets.${p.id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar + actions */}
          <div className="p-3 flex flex-col">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(r) => {
                setDraft(r);
                setActivePreset(null);
              }}
              numberOfMonths={typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 1}
              defaultMonth={draft?.from}
              className="p-0"
            />

            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={compareEnabled}
                  onCheckedChange={(v) => setCompareEnabled(!!v)}
                />
                <span className="text-sm">{t("advancedDateRangePicker.compareToPrevious")}</span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {draft?.from ? fmt(draft.from) : "—"}
                  {" — "}
                  {draft?.to ? fmt(draft.to) : draft?.from ? fmt(draft.from) : "—"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                    {t("advancedDateRangePicker.cancel")}
                  </Button>
                  <Button size="sm" onClick={handleUpdate} disabled={!draft?.from}>
                    {t("advancedDateRangePicker.update")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
