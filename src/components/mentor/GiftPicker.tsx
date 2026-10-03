// GiftPicker.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ChevronDown, Gift, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fetchGiftOptions,
  GiftItem,
  GiftKind,
  GiftOption,
  GiftOptions,
} from "@/lib/giftItems";

interface Props {
  tenantId: string;
  exclude?: { kind: GiftKind; id: string };
  value: GiftItem[];
  onChange: (next: GiftItem[]) => void;
}

const KIND_ORDER: GiftKind[] = ["course", "live_course", "digital_product", "consultation"];

const GiftPicker = ({ tenantId, exclude, value, onChange }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const kindLabel = (k: GiftKind) => t(`giftPicker.kinds.${k}`);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<GiftKind>("course");
  const [options, setOptions] = useState<GiftOptions>({
    course: [], live_course: [], digital_product: [], consultation: [],
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchGiftOptions(tenantId, exclude).then((opts) => {
      if (alive) { setOptions(opts); setLoading(false); }
    });
    return () => { alive = false; };
  }, [tenantId, exclude?.kind, exclude?.id]);

  const isChecked = (k: GiftKind, id: string) =>
    value.some((g) => g.kind === k && g.id === id);

  const toggle = (k: GiftKind, id: string) => {
    if (isChecked(k, id)) onChange(value.filter((g) => !(g.kind === k && g.id === id)));
    else onChange([...value, { kind: k, id }]);
  };

  const countByKind = (k: GiftKind) => value.filter((g) => g.kind === k).length;
  const list = options[activeKind];
const getTitle = (k: GiftKind, id: string) =>
  options[k].find((o) => o.id === id)?.title ?? "";

const MAX_VISIBLE = 2;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold">{t("giftPicker.label")}</Label>

      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
  <button
    type="button"
    className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-foreground/40 transition-colors"
  >
    <span className="flex items-center gap-2 min-w-0 flex-1">
      <Gift className="w-4 h-4 text-muted-foreground shrink-0" />
      {value.length > 0 ? (
        <span className="flex items-center gap-1.5 flex-wrap min-w-0">
          {value.slice(0, MAX_VISIBLE).map((g) => (
            <span
              key={`${g.kind}-${g.id}`}
              className="inline-flex items-center bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full truncate max-w-[140px]"
            >
              {getTitle(g.kind, g.id)}
            </span>
          ))}
          {value.length > MAX_VISIBLE && (
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
              +{value.length - MAX_VISIBLE}
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">{t("giftPicker.placeholder")}</span>
      )}
    </span>
    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
</PopoverTrigger>

        <PopoverContent
          className="w-[calc(100vw-2.5rem)] max-w-[560px] p-0"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          dir={dir}
        >
          {/* kind selector — wraps to 2x2 grid on mobile so all tabs are visible */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-2 border-b border-border">
            {KIND_ORDER.map((k) => {
              const count = countByKind(k);
              const active = activeKind === k;
              return (
                <button
                  key={k}
                  onClick={() => setActiveKind(k)}
                  className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{kindLabel(k)}</span>
                  {count > 0 && (
                    <span className={`px-1.5 rounded-full text-[10px] shrink-0 ${active ? "bg-background/20" : "bg-primary/10 text-primary"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* options list */}
          <div className="max-h-72 overflow-y-auto p-2">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !list.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t("giftPicker.empty", { kind: kindLabel(activeKind) })}
              </p>
            ) : (
              <div className="space-y-1">
                {list.map((o: GiftOption) => {
                  const checked = isChecked(activeKind, o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(activeKind, o.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-end transition-colors ${
                        checked ? "bg-primary/10 font-bold" : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{o.title}</span>
                      {checked && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {value.length > 0 && (
            <div className="flex items-center justify-between p-2 border-t border-border">
              <button
                onClick={() => onChange([])}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                {t("giftPicker.clearAll")}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold bg-foreground text-background px-3 py-1.5 rounded-lg"
              >
                {t("giftPicker.done")}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GiftPicker;