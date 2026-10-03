import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import SocialPlatformIcon from "./SocialPlatformIcon";
import { SITE_SOCIALS, type SocialPlatform } from "@/lib/siteSocials";

/** Brand colour used on hover for each platform */
const BRAND_HOVER: Record<SocialPlatform, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  youtube: "#FF0000",
  tiktok: "#111111",
};

interface SiteSocialLinksProps {
  /** "dark" = on the dark green footer, "light" = on a white card */
  variant?: "dark" | "light";
  /** Show a "Follow us" caption before the icons */
  withLabel?: boolean;
  className?: string;
}

const VARIANTS = {
  dark: {
    label: "text-[#eef7f1]/60",
    button: "bg-white/10 text-[#eef7f1]/75 hover:bg-[var(--brand)] hover:text-white",
  },
  light: {
    label: "text-muted-foreground",
    button: "bg-muted text-muted-foreground hover:bg-[var(--brand)] hover:text-white",
  },
} as const;

export default function SiteSocialLinks({
  variant = "dark",
  withLabel = false,
  className = "",
}: SiteSocialLinksProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const styles = VARIANTS[variant];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {withLabel && (
        <span className={`text-xs ${styles.label}`}>
          {t("home.footer.follow")}
        </span>
      )}
      <ul className="flex items-center gap-2">
        {SITE_SOCIALS.map((social) => (
          <li key={social.id}>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              title={
                isEn
                  ? `Ebdaey on ${social.labelEn}`
                  : `إبداعي على ${social.label}`
              }
              aria-label={
                isEn
                  ? `Ebdaey on ${social.labelEn}`
                  : `إبداعي على ${social.label}`
              }
              className={`grid h-8 w-8 place-items-center rounded-full transition-colors duration-200 ${styles.button}`}
              style={{ "--brand": BRAND_HOVER[social.id] } as CSSProperties}
            >
              <SocialPlatformIcon platform={social.id} className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
