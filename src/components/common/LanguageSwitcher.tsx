import { forwardRef } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STORAGE_KEY, SUPPORTED_LANGUAGES, markExplicitLanguage, type Language } from "@/i18n";

interface Props {
  variant?: "navbar" | "sidebar";
  className?: string;
  onLanguageChange?: (lang: Language) => void;
}

const LABELS: Record<Language, string> = {
  ar: "العربية",
  en: "English",
};

const FLAG_CODES: Record<Language, string> = {
  ar: "eg",
  en: "us",
};

const FlagIcon = forwardRef<HTMLImageElement, { lang: Language; className?: string }>(function FlagIcon(
  { lang, className = "" },
  ref,
) {
  const code = FLAG_CODES[lang];
  return (
    <img
      ref={ref}
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={20}
      height={20}
      alt=""
      aria-hidden="true"
      className={`inline-block h-4 w-4 rounded-full object-cover shadow-sm ring-1 ring-black/10 ${className}`}
    />

  );
});

export default function LanguageSwitcher({ variant = "navbar", className = "", onLanguageChange }: Props) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.startsWith("en") ? "en" : "ar") as Language;

  const changeLang = (lang: Language) => {
    if (lang === current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      markExplicitLanguage();
    } catch {
      /* ignore */
    }
    i18n.changeLanguage(lang);
    onLanguageChange?.(lang);
  };

  const triggerBase =
    variant === "navbar"
      ? "inline-flex items-center justify-center text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-all duration-150"
      : "inline-flex items-center justify-center text-foreground/80 hover:text-foreground p-2 rounded-lg hover:bg-muted";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={LABELS[current]}
        title={LABELS[current]}
        className={`${triggerBase} ${className}`}
      >
        <FlagIcon lang={current} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => changeLang(lng)}
            className="flex items-center justify-between gap-4 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FlagIcon lang={lng} />
              <span>{LABELS[lng]}</span>
            </span>
            {current === lng ? <Check className="w-4 h-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
