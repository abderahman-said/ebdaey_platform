import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import { publicAr, publicEn } from "./locales/public";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const STORAGE_KEY = "ebdaey_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: { ...ar, ...publicAr }, ...publicAr },
      en: { translation: { ...en, ...publicEn }, ...publicEn },
    },
    ns: ["translation", "mentorPublic", "coursePage", "liveCourse", "digitalProduct", "miscPublic"],
    defaultNS: "translation",
    fallbackLng: "ar",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    detection: {
      order: ["querystring", "localStorage"],
      lookupQuerystring: "lang",
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export const isRtl = (lang: string) => lang === "ar";

/** Set only when the visitor manually picks a language (switcher / dashboard). */
export const EXPLICIT_KEY = "ebdaey_lang_explicit";
export function markExplicitLanguage() {
  try { window.localStorage.setItem(EXPLICIT_KEY, "1"); } catch { /* ignore */ }
}
export const isArabCountry = (code: string) => ARAB_COUNTRIES.has(code.toUpperCase());

/** Arab League country codes — visitors from these keep Arabic by default. */
const ARAB_COUNTRIES = new Set([
  "EG", "SA", "AE", "DZ", "MA", "TN", "LY", "SD", "SS", "IQ", "JO", "LB",
  "SY", "PS", "YE", "OM", "QA", "BH", "KW", "MR", "SO", "DJ", "KM",
]);

const TZ_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "EG", "Africa/Algiers": "DZ", "Africa/Casablanca": "MA",
  "Africa/Tunis": "TN", "Africa/Tripoli": "LY", "Africa/Khartoum": "SD",
  "Africa/Juba": "SS", "Africa/Nouakchott": "MR", "Africa/Mogadishu": "SO",
  "Africa/Djibouti": "DJ", "Africa/Comoro": "KM",
  "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Muscat": "OM",
  "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Kuwait": "KW",
  "Asia/Baghdad": "IQ", "Asia/Amman": "JO", "Asia/Beirut": "LB",
  "Asia/Damascus": "SY", "Asia/Gaza": "PS", "Asia/Hebron": "PS", "Asia/Aden": "YE",
};

/**
 * Default language for a first-time visitor (no stored choice, no ?lang=):
 * Arabic for visitors in Arab countries, English for everyone else.
 * Detection: browser locale region first, then IANA timezone.
 */
export function detectDefaultLanguage(): Language {
  try {
    const locale = navigator.language || "";
    const region = locale.split("-").slice(1).find((p) => /^[A-Za-z]{2}$/.test(p));
    if (region) return ARAB_COUNTRIES.has(region.toUpperCase()) ? "ar" : "en";
  } catch {
    /* ignore */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const country = TZ_COUNTRY[tz];
    if (country) return "ar";
    if (tz) return "en";
  } catch {
    /* ignore */
  }
  return "ar";
}

export default i18n;
