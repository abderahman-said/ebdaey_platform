import { useMemo, useRef, useState } from "react";
import { Check, Palette, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThemeOption {
  nameKey: string;
  value: string; // "H S% L%"
  gradient: string;
  accent: string; // tailwind text/border accent
}

const themes: ThemeOption[] = [
  { nameKey: "themeColorPicker.themes.classicBlack", value: "0 0% 10%", gradient: "linear-gradient(135deg, hsl(0 0% 20%), hsl(0 0% 4%))", accent: "slate" },
  { nameKey: "themeColorPicker.themes.emeraldGreen", value: "168 65% 38%", gradient: "linear-gradient(135deg, hsl(168 65% 45%), hsl(168 65% 28%))", accent: "emerald" },
  { nameKey: "themeColorPicker.themes.vividPurple", value: "270 60% 50%", gradient: "linear-gradient(135deg, hsl(270 60% 58%), hsl(270 60% 38%))", accent: "purple" },
  { nameKey: "themeColorPicker.themes.cherryRed", value: "350 70% 50%", gradient: "linear-gradient(135deg, hsl(350 70% 58%), hsl(350 70% 38%))", accent: "rose" },
  { nameKey: "themeColorPicker.themes.royalBlue", value: "220 70% 50%", gradient: "linear-gradient(135deg, hsl(220 70% 58%), hsl(220 70% 38%))", accent: "blue" },
  { nameKey: "themeColorPicker.themes.warmOrange", value: "30 80% 50%", gradient: "linear-gradient(135deg, hsl(30 80% 58%), hsl(30 80% 40%))", accent: "orange" },
  { nameKey: "themeColorPicker.themes.elegantPink", value: "330 70% 55%", gradient: "linear-gradient(135deg, hsl(330 70% 62%), hsl(330 70% 45%))", accent: "pink" },
  { nameKey: "themeColorPicker.themes.deepIndigo", value: "240 55% 45%", gradient: "linear-gradient(135deg, hsl(240 55% 55%), hsl(240 55% 33%))", accent: "indigo" },
  { nameKey: "themeColorPicker.themes.luxuryGold", value: "45 85% 47%", gradient: "linear-gradient(135deg, hsl(45 85% 55%), hsl(45 85% 38%))", accent: "amber" },
];

// hex <-> "H S% L%" utils
const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslStringToHex = (hslStr: string): string => {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#6366f1";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

interface ThemeColorPickerProps {
  tenantId: string;
  currentColor: string | null;
  onColorSaved: (color: string) => void;
}

const ThemeColorPicker = ({ tenantId, currentColor, onColorSaved }: ThemeColorPickerProps) => {
  const initial = currentColor || "220 70% 50%";
  const [selected, setSelected] = useState(initial);
  const isPreset = themes.some((t) => t.value === initial);
  const [customHex, setCustomHex] = useState<string>(isPreset ? "#6366f1" : hslStringToHex(initial));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isCustomSelected = useMemo(() => !themes.some((t) => t.value === selected), [selected]);

  const pickCustom = (hex: string) => {
    setCustomHex(hex);
    setSelected(hexToHsl(hex));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({ primary_color: selected } as any)
      .eq("id", tenantId);
    setSaving(false);
    if (error) {
      toast({ title: t("themeColorPicker.errorTitle"), description: t("themeColorPicker.errorDesc"), variant: "destructive" });
    } else {
      toast({ title: t("themeColorPicker.successTitle"), description: t("themeColorPicker.successDesc") });
      queryClient.setQueryData(["cert-theme-color", tenantId], `hsl(${selected})`);
      queryClient.invalidateQueries({ queryKey: ["cert-theme-color", tenantId] });
      // Keep the certificate editor preview in sync immediately (same key it reads).
      queryClient.setQueryData(["cert-tenant-settings", tenantId], (prev: any) =>
        prev ? { ...prev, themeColor: `hsl(${selected})` } : prev
      );
      queryClient.invalidateQueries({ queryKey: ["cert-tenant-settings", tenantId] });
      onColorSaved(selected);
    }
  };

  const renderCard = (theme: ThemeOption) => {
    const isSelected = selected === theme.value;
    return (
      <button
        key={theme.value}
        type="button"
        onClick={() => setSelected(theme.value)}
        className={`group relative rounded-2xl p-3 text-start transition-all border-2 ${
          isSelected
            ? "border-foreground bg-muted/30 ring-4 ring-muted shadow-sm"
            : "border-border/60 bg-card hover:border-foreground/40 hover:shadow-md"
        }`}
      >
        {isSelected && (
          <span className="absolute -top-2 -end-2 z-10 bg-foreground text-background p-1 rounded-full shadow-md ring-2 ring-background">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        )}
        <div className="h-14 w-full rounded-lg mb-3" style={{ background: theme.gradient }} />
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
          <div className="h-2 w-10 bg-muted rounded-full" />
          <span
            className="ms-auto px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ background: `hsl(${theme.value})` }}
          >
            {t("themeColorPicker.productsLabel")}
          </span>
        </div>
        <span className={`text-xs font-semibold block text-center transition-colors ${
          isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        }`}>
          {t(theme.nameKey)}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/60">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">{t("themeColorPicker.title")}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{t("themeColorPicker.subtitle")}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {themes.map(renderCard)}

        {/* Custom color card */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className={`group relative rounded-2xl p-3 text-start transition-all border-2 border-dashed ${
            isCustomSelected
              ? "border-foreground bg-muted/30 ring-4 ring-muted"
              : "border-border/70 bg-card hover:border-foreground/50 hover:bg-muted/20"
          }`}
        >
          {isCustomSelected && (
            <span className="absolute -top-2 -end-2 z-10 bg-foreground text-background p-1 rounded-full shadow-md ring-2 ring-background">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          )}
          <div
            className="h-14 w-full rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
            style={{
              background: isCustomSelected
                ? `linear-gradient(135deg, ${customHex}, ${customHex}cc)`
                : "conic-gradient(from 180deg, #f43f5e, #f59e0b, #10b981, #3b82f6, #a855f7, #f43f5e)",
            }}
          >
            {!isCustomSelected && <div className="absolute inset-0 bg-card/60" />}
            <Plus
              className={`w-6 h-6 relative z-10 ${
                isCustomSelected ? "text-white" : "text-foreground/70 group-hover:text-foreground"
              }`}
              strokeWidth={2.5}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={customHex}
              onChange={(e) => pickCustom(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={t("themeColorPicker.customPickLabel")}
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
            <div className="h-2 w-10 bg-muted rounded-full" />
            <span
              className="ms-auto px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold text-white"
              style={{ background: isCustomSelected ? customHex : "hsl(var(--muted-foreground))" }}
            >
              {customHex.toUpperCase()}
            </span>
          </div>
          <span className={`text-xs font-semibold block text-center transition-colors ${
            isCustomSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          }`}>
            {t("themeColorPicker.themes.custom")}
          </span>
        </button>
      </div>


      <div className="mt-6 flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground border-0 px-8 hover:bg-primary/90"
        >

          {saving ? t("themeColorPicker.saving") : t("themeColorPicker.save")}
        </Button>
      </div>
    </div>
  );
};

export default ThemeColorPicker;
