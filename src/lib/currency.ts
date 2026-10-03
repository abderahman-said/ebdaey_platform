import i18n from "@/i18n";

export const CURRENCIES = ["EGP", "USD", "AED", "SAR", "GBP", "EUR", "QAR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_NAMES: Record<Currency, { ar: string; en: string; symAr: string; symEn: string }> = {
  EGP: { ar: "جنيه مصري", en: "Egyptian pound", symAr: "ج.م", symEn: "EGP" },
  USD: { ar: "دولار أمريكي", en: "US dollar", symAr: "دولار", symEn: "$" },
  AED: { ar: "درهم إماراتي", en: "UAE dirham", symAr: "د.إ", symEn: "AED" },
  SAR: { ar: "ريال سعودي", en: "Saudi riyal", symAr: "ر.س", symEn: "SAR" },
  GBP: { ar: "جنيه استرليني", en: "British pound", symAr: "جنيه استرليني", symEn: "£" },
  EUR: { ar: "يورو", en: "Euro", symAr: "يورو", symEn: "€" },
  QAR: { ar: "ريال قطري", en: "Qatari riyal", symAr: "ر.ق", symEn: "QAR" },
};

/** Official Saudi riyal sign (Unicode U+20C1), shown on public routes only. */
export const SAR_SYMBOL = "\u20C1";

/** Public visitor-facing routes show the new riyal sign; dashboards/editors keep the name. */
export function isPublicRoute(): boolean {
  try {
    const p = window.location.pathname;
    return !p.startsWith("/admin") && !p.startsWith("/app") && !p.startsWith("/dashboard");
  } catch {
    return false;
  }
}

export const PRICE_COUNTRIES: { code: string; ar: string; en: string }[] = [
  { code: "EG", ar: "مصر", en: "Egypt" },
  { code: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { code: "AE", ar: "الإمارات", en: "UAE" },
  { code: "QA", ar: "قطر", en: "Qatar" },
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "BH", ar: "البحرين", en: "Bahrain" },
  { code: "OM", ar: "عُمان", en: "Oman" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "LB", ar: "لبنان", en: "Lebanon" },
  { code: "IQ", ar: "العراق", en: "Iraq" },
  { code: "MA", ar: "المغرب", en: "Morocco" },
  { code: "DZ", ar: "الجزائر", en: "Algeria" },
  { code: "TN", ar: "تونس", en: "Tunisia" },
  { code: "LY", ar: "ليبيا", en: "Libya" },
  { code: "GB", ar: "المملكة المتحدة", en: "United Kingdom" },
  { code: "US", ar: "الولايات المتحدة", en: "United States" },
  { code: "CA", ar: "كندا", en: "Canada" },
  { code: "DE", ar: "ألمانيا", en: "Germany" },
  { code: "FR", ar: "فرنسا", en: "France" },
  { code: "NL", ar: "هولندا", en: "Netherlands" },
  { code: "IT", ar: "إيطاليا", en: "Italy" },
  { code: "ES", ar: "إسبانيا", en: "Spain" },
  { code: "TR", ar: "تركيا", en: "Turkey" },
  { code: "AU", ar: "أستراليا", en: "Australia" },
];

export function currencyName(c: string) {
  const n = CURRENCY_NAMES[c as Currency];
  if (!n) return c;
  return i18n.language === "en" ? n.en : n.ar;
}

export function countryName(code: string | null) {
  if (!code) return i18n.language === "en" ? "All countries" : "جميع الدول";
  const c = PRICE_COUNTRIES.find((x) => x.code === code);
  return c ? (i18n.language === "en" ? c.en : c.ar) : code;
}

/** Format an amount in any supported currency, respecting the current language. */
export function formatMoney(amount: number, currency: string = "EGP"): string {
  const n = CURRENCY_NAMES[currency as Currency];
  const val = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  if (i18n.language === "en") {
    const sym = currency === "SAR" && isPublicRoute() ? SAR_SYMBOL : (n?.symEn ?? currency);
    return sym.length === 1 ? `${sym}${val}` : `${val} ${sym}`;
  }
  const ar = val.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]).replace(/\./g, "٫");
  return `${ar} ${currency === "SAR" && isPublicRoute() ? SAR_SYMBOL : (n?.symAr ?? currency)}`;
}

export type PriceRow = {
  id?: string;
  country_code: string | null;
  currency: string;
  price: number;
  compare_at_price: number | null;
};

/** Pick the row for a visitor's country, else the default row. */
export function resolvePrice(rows: PriceRow[], country: string | null): PriceRow | null {
  const cc = (country || "").toUpperCase();
  return rows.find((r) => r.country_code === cc) ?? rows.find((r) => r.country_code === null) ?? null;
}

/** Short currency label for price displays (e.g. "ج.م" / "EGP", "دولار" / "$"). */
export function currencySymbol(c?: string | null): string {
  const n = CURRENCY_NAMES[(c || "EGP") as Currency];
  if (!n) return c || "";
  if (c === "SAR" && isPublicRoute()) return SAR_SYMBOL;
  return i18n.language === "en" ? n.symEn : n.symAr;
}
