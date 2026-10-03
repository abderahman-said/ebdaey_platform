// Derive country + continent from an international phone number's dialing code.
// Orders don't store a country, but customer phones are always stored in
// international format (locked country codes), so the dial code is reliable.

type GeoEntry = { ar: string; en: string; continent: string };

const CONTINENTS = {
  AF: { ar: "أفريقيا", en: "Africa" },
  AS: { ar: "آسيا", en: "Asia" },
  EU: { ar: "أوروبا", en: "Europe" },
  NA: { ar: "أمريكا الشمالية", en: "North America" },
  SA: { ar: "أمريكا الجنوبية", en: "South America" },
  OC: { ar: "أوقيانوسيا", en: "Oceania" },
} as const;

// Longest dial codes first at lookup time.
const DIAL_CODES: Record<string, GeoEntry> = {
  "20": { ar: "مصر", en: "Egypt", continent: "AF" },
  "212": { ar: "المغرب", en: "Morocco", continent: "AF" },
  "213": { ar: "الجزائر", en: "Algeria", continent: "AF" },
  "216": { ar: "تونس", en: "Tunisia", continent: "AF" },
  "218": { ar: "ليبيا", en: "Libya", continent: "AF" },
  "220": { ar: "غامبيا", en: "Gambia", continent: "AF" },
  "221": { ar: "السنغال", en: "Senegal", continent: "AF" },
  "222": { ar: "موريتانيا", en: "Mauritania", continent: "AF" },
  "223": { ar: "مالي", en: "Mali", continent: "AF" },
  "224": { ar: "غينيا", en: "Guinea", continent: "AF" },
  "225": { ar: "ساحل العاج", en: "Ivory Coast", continent: "AF" },
  "226": { ar: "بوركينا فاسو", en: "Burkina Faso", continent: "AF" },
  "227": { ar: "النيجر", en: "Niger", continent: "AF" },
  "228": { ar: "توغو", en: "Togo", continent: "AF" },
  "229": { ar: "بنين", en: "Benin", continent: "AF" },
  "230": { ar: "موريشيوس", en: "Mauritius", continent: "AF" },
  "231": { ar: "ليبيريا", en: "Liberia", continent: "AF" },
  "232": { ar: "سيراليون", en: "Sierra Leone", continent: "AF" },
  "233": { ar: "غانا", en: "Ghana", continent: "AF" },
  "234": { ar: "نيجيريا", en: "Nigeria", continent: "AF" },
  "235": { ar: "تشاد", en: "Chad", continent: "AF" },
  "236": { ar: "أفريقيا الوسطى", en: "Central African Republic", continent: "AF" },
  "237": { ar: "الكاميرون", en: "Cameroon", continent: "AF" },
  "241": { ar: "الغابون", en: "Gabon", continent: "AF" },
  "243": { ar: "الكونغو الديمقراطية", en: "DR Congo", continent: "AF" },
  "244": { ar: "أنغولا", en: "Angola", continent: "AF" },
  "249": { ar: "السودان", en: "Sudan", continent: "AF" },
  "250": { ar: "رواندا", en: "Rwanda", continent: "AF" },
  "251": { ar: "إثيوبيا", en: "Ethiopia", continent: "AF" },
  "252": { ar: "الصومال", en: "Somalia", continent: "AF" },
  "253": { ar: "جيبوتي", en: "Djibouti", continent: "AF" },
  "254": { ar: "كينيا", en: "Kenya", continent: "AF" },
  "255": { ar: "تنزانيا", en: "Tanzania", continent: "AF" },
  "256": { ar: "أوغندا", en: "Uganda", continent: "AF" },
  "260": { ar: "زامبيا", en: "Zambia", continent: "AF" },
  "263": { ar: "زيمبابوي", en: "Zimbabwe", continent: "AF" },
  "27": { ar: "جنوب أفريقيا", en: "South Africa", continent: "AF" },
  "30": { ar: "اليونان", en: "Greece", continent: "EU" },
  "31": { ar: "هولندا", en: "Netherlands", continent: "EU" },
  "32": { ar: "بلجيكا", en: "Belgium", continent: "EU" },
  "33": { ar: "فرنسا", en: "France", continent: "EU" },
  "34": { ar: "إسبانيا", en: "Spain", continent: "EU" },
  "351": { ar: "البرتغال", en: "Portugal", continent: "EU" },
  "352": { ar: "لوكسمبورغ", en: "Luxembourg", continent: "EU" },
  "353": { ar: "أيرلندا", en: "Ireland", continent: "EU" },
  "355": { ar: "ألبانيا", en: "Albania", continent: "EU" },
  "357": { ar: "قبرص", en: "Cyprus", continent: "EU" },
  "358": { ar: "فنلندا", en: "Finland", continent: "EU" },
  "359": { ar: "بلغاريا", en: "Bulgaria", continent: "EU" },
  "36": { ar: "المجر", en: "Hungary", continent: "EU" },
  "370": { ar: "ليتوانيا", en: "Lithuania", continent: "EU" },
  "371": { ar: "لاتفيا", en: "Latvia", continent: "EU" },
  "372": { ar: "إستونيا", en: "Estonia", continent: "EU" },
  "380": { ar: "أوكرانيا", en: "Ukraine", continent: "EU" },
  "381": { ar: "صربيا", en: "Serbia", continent: "EU" },
  "385": { ar: "كرواتيا", en: "Croatia", continent: "EU" },
  "39": { ar: "إيطاليا", en: "Italy", continent: "EU" },
  "40": { ar: "رومانيا", en: "Romania", continent: "EU" },
  "41": { ar: "سويسرا", en: "Switzerland", continent: "EU" },
  "420": { ar: "التشيك", en: "Czechia", continent: "EU" },
  "421": { ar: "سلوفاكيا", en: "Slovakia", continent: "EU" },
  "43": { ar: "النمسا", en: "Austria", continent: "EU" },
  "44": { ar: "المملكة المتحدة", en: "United Kingdom", continent: "EU" },
  "45": { ar: "الدنمارك", en: "Denmark", continent: "EU" },
  "46": { ar: "السويد", en: "Sweden", continent: "EU" },
  "47": { ar: "النرويج", en: "Norway", continent: "EU" },
  "48": { ar: "بولندا", en: "Poland", continent: "EU" },
  "49": { ar: "ألمانيا", en: "Germany", continent: "EU" },
  "51": { ar: "بيرو", en: "Peru", continent: "SA" },
  "52": { ar: "المكسيك", en: "Mexico", continent: "NA" },
  "53": { ar: "كوبا", en: "Cuba", continent: "NA" },
  "54": { ar: "الأرجنتين", en: "Argentina", continent: "SA" },
  "55": { ar: "البرازيل", en: "Brazil", continent: "SA" },
  "56": { ar: "تشيلي", en: "Chile", continent: "SA" },
  "57": { ar: "كولومبيا", en: "Colombia", continent: "SA" },
  "58": { ar: "فنزويلا", en: "Venezuela", continent: "SA" },
  "60": { ar: "ماليزيا", en: "Malaysia", continent: "AS" },
  "61": { ar: "أستراليا", en: "Australia", continent: "OC" },
  "62": { ar: "إندونيسيا", en: "Indonesia", continent: "AS" },
  "63": { ar: "الفلبين", en: "Philippines", continent: "AS" },
  "64": { ar: "نيوزيلندا", en: "New Zealand", continent: "OC" },
  "65": { ar: "سنغافورة", en: "Singapore", continent: "AS" },
  "66": { ar: "تايلاند", en: "Thailand", continent: "AS" },
  "7": { ar: "روسيا / كازاخستان", en: "Russia / Kazakhstan", continent: "EU" },
  "81": { ar: "اليابان", en: "Japan", continent: "AS" },
  "82": { ar: "كوريا الجنوبية", en: "South Korea", continent: "AS" },
  "84": { ar: "فيتنام", en: "Vietnam", continent: "AS" },
  "86": { ar: "الصين", en: "China", continent: "AS" },
  "880": { ar: "بنغلاديش", en: "Bangladesh", continent: "AS" },
  "90": { ar: "تركيا", en: "Türkiye", continent: "AS" },
  "91": { ar: "الهند", en: "India", continent: "AS" },
  "92": { ar: "باكستان", en: "Pakistan", continent: "AS" },
  "93": { ar: "أفغانستان", en: "Afghanistan", continent: "AS" },
  "94": { ar: "سريلانكا", en: "Sri Lanka", continent: "AS" },
  "95": { ar: "ميانمار", en: "Myanmar", continent: "AS" },
  "960": { ar: "المالديف", en: "Maldives", continent: "AS" },
  "961": { ar: "لبنان", en: "Lebanon", continent: "AS" },
  "962": { ar: "الأردن", en: "Jordan", continent: "AS" },
  "963": { ar: "سوريا", en: "Syria", continent: "AS" },
  "964": { ar: "العراق", en: "Iraq", continent: "AS" },
  "965": { ar: "الكويت", en: "Kuwait", continent: "AS" },
  "966": { ar: "السعودية", en: "Saudi Arabia", continent: "AS" },
  "967": { ar: "اليمن", en: "Yemen", continent: "AS" },
  "968": { ar: "عُمان", en: "Oman", continent: "AS" },
  "970": { ar: "فلسطين", en: "Palestine", continent: "AS" },
  "971": { ar: "الإمارات", en: "United Arab Emirates", continent: "AS" },
  "972": { ar: "إسرائيل", en: "Israel", continent: "AS" },
  "973": { ar: "البحرين", en: "Bahrain", continent: "AS" },
  "974": { ar: "قطر", en: "Qatar", continent: "AS" },
  "975": { ar: "بوتان", en: "Bhutan", continent: "AS" },
  "977": { ar: "نيبال", en: "Nepal", continent: "AS" },
  "98": { ar: "إيران", en: "Iran", continent: "AS" },
  "1": { ar: "الولايات المتحدة / كندا", en: "United States / Canada", continent: "NA" },
};

export type PhoneGeo = { country: string; continent: string };

export function getGeoFromPhone(
  phone: string | null | undefined,
  lang: "ar" | "en" = "ar",
): PhoneGeo | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  for (let len = 4; len >= 1; len--) {
    const prefix = digits.slice(0, len);
    const entry = DIAL_CODES[prefix];
    if (entry) {
      const continent = CONTINENTS[entry.continent as keyof typeof CONTINENTS];
      return { country: entry[lang], continent: continent ? continent[lang] : "-" };
    }
  }
  return null;
}

// ── Real purchase country (ISO2 captured from the buyer's browser at checkout) ──

const ISO2_CONTINENT: Record<string, keyof typeof CONTINENTS> = {
  EG: "AF", DZ: "AF", MA: "AF", TN: "AF", LY: "AF", SD: "AF", SS: "AF", KE: "AF",
  NG: "AF", GH: "AF", CI: "AF", SN: "AF", ZA: "AF", ET: "AF", SO: "AF", DJ: "AF",
  MR: "AF", TZ: "AF", UG: "AF", ZM: "AF", ZW: "AF", CM: "AF", RW: "AF", AO: "AF",
  SA: "AS", AE: "AS", OM: "AS", QA: "AS", BH: "AS", KW: "AS", IQ: "AS", JO: "AS",
  LB: "AS", SY: "AS", IL: "AS", PS: "AS", YE: "AS", IR: "AS", TR: "AS", PK: "AS",
  IN: "AS", BD: "AS", LK: "AS", AF: "AS", UZ: "AS", KZ: "AS", AZ: "AS", GE: "AS",
  AM: "AS", ID: "AS", MY: "AS", SG: "AS", TH: "AS", PH: "AS", VN: "AS", HK: "AS",
  CN: "AS", TW: "AS", JP: "AS", KR: "AS", NP: "AS", MV: "AS", BT: "AS", MM: "AS",
  GB: "EU", IE: "EU", FR: "EU", ES: "EU", PT: "EU", DE: "EU", IT: "EU", NL: "EU",
  BE: "EU", CH: "EU", AT: "EU", SE: "EU", NO: "EU", DK: "EU", FI: "EU", PL: "EU",
  CZ: "EU", HU: "EU", RO: "EU", BG: "EU", GR: "EU", HR: "EU", RS: "EU", AL: "EU",
  CY: "EU", LT: "EU", LV: "EU", EE: "EU", UA: "EU", RU: "EU", SK: "EU", LU: "EU",
  US: "NA", CA: "NA", MX: "NA", CU: "NA", PA: "NA", CR: "NA", DO: "NA", GT: "NA",
  BR: "SA", AR: "SA", CL: "SA", CO: "SA", PE: "SA", VE: "SA", UY: "SA", EC: "SA",
  BO: "SA", PY: "SA",
  AU: "OC", NZ: "OC", FJ: "OC",
};

export function getGeoFromCountryCode(
  code: string | null | undefined,
  lang: "ar" | "en" = "ar",
): PhoneGeo | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const iso = code.toUpperCase();
  let country = iso;
  try {
    const dn = new Intl.DisplayNames([lang], { type: "region" });
    country = dn.of(iso) || iso;
  } catch {
    /* keep ISO code */
  }
  const key = ISO2_CONTINENT[iso];
  const continent = key ? CONTINENTS[key][lang] : "-";
  return { country, continent };
}
