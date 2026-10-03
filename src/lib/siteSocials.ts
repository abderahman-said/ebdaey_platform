export type SocialPlatform = "facebook" | "instagram" | "youtube" | "tiktok";

export interface SiteSocial {
  id: SocialPlatform;
  /** Arabic display name */
  label: string;
  /** English display name */
  labelEn: string;
  /** Full https URL of the official Ebdaey account */
  url: string;
}

/**
 * Official Ebdaey social accounts shown on public pages (footer, contact).
 * Add a new platform here once its real URL is available.
 */
export const SITE_SOCIALS: SiteSocial[] = [
  {
    id: "facebook",
    label: "فيسبوك",
    labelEn: "Facebook",
    url: "https://www.facebook.com/ebdaey/",
  },
  {
    id: "instagram",
    label: "إنستغرام",
    labelEn: "Instagram",
    url: "https://www.instagram.com/ebdaey.app/",
  },
];
