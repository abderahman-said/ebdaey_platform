import { useState, useRef, useEffect } from "react";
import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

const popularIcons = [
  "Star", "Heart", "Award", "Trophy", "Target", "Zap", "Shield", "CheckCircle",
  "BookOpen", "GraduationCap", "Lightbulb", "Rocket", "Crown", "Gem", "Medal",
  "ThumbsUp", "Clock", "Users", "Globe", "Lock", "Eye", "Headphones",
  "Video", "Camera", "Mic", "PenTool", "Palette", "Code", "Terminal",
  "Database", "Server", "Wifi", "Smartphone", "Monitor", "Laptop",
  "FileText", "FolderOpen", "Download", "Upload", "Share2", "Link",
  "MessageCircle", "Mail", "Bell", "Calendar", "MapPin", "Navigation",
  "TrendingUp", "BarChart", "PieChart", "Activity", "Layers", "Grid",
  "Settings", "Wrench", "Cog", "Puzzle", "Package", "Box",
  "Sun", "Moon", "Cloud", "Umbrella", "Flame", "Droplet",
  "Music", "Play", "Film", "Image", "Scissors", "Brush",
];

const IconPicker = ({ selectedIcon, onSelect }: IconPickerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const SelectedIcon = (icons as Record<string, LucideIcon>)[selectedIcon] || icons.Star;

  const filteredIcons = search
    ? popularIcons.filter(name => name.toLowerCase().includes(search.toLowerCase()))
    : popularIcons;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-accent transition-colors shrink-0"
        title={t("iconPicker.chooseIcon")}
      >
        <SelectedIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("iconPicker.searchPlaceholder")}
            className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm mb-2"
            dir="ltr"
            autoFocus
          />
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {filteredIcons.map(name => {
              const Icon = (icons as Record<string, LucideIcon>)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onSelect(name); setOpen(false); setSearch(""); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors ${
                    selectedIcon === name ? "bg-primary/10 ring-1 ring-primary" : ""
                  }`}
                  title={name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">{t("iconPicker.noResults")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
