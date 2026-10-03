// Best-effort country detection for analytics (no external API calls).
// Priority: edge geo headers -> browser locale region -> IANA timezone map.

const TZ_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "EG",
  "Africa/Algiers": "DZ",
  "Africa/Casablanca": "MA",
  "Africa/Tunis": "TN",
  "Africa/Tripoli": "LY",
  "Africa/Khartoum": "SD",
  "Africa/Juba": "SS",
  "Africa/Nairobi": "KE",
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN",
  "Africa/Johannesburg": "ZA",
  "Africa/Addis_Ababa": "ET",
  "Africa/Mogadishu": "SO",
  "Africa/Djibouti": "DJ",
  "Africa/Nouakchott": "MR",
  "Asia/Riyadh": "SA",
  "Asia/Dubai": "AE",
  "Asia/Muscat": "OM",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Kuwait": "KW",
  "Asia/Baghdad": "IQ",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Asia/Damascus": "SY",
  "Asia/Jerusalem": "IL",
  "Asia/Gaza": "PS",
  "Asia/Hebron": "PS",
  "Asia/Aden": "YE",
  "Asia/Tehran": "IR",
  "Asia/Istanbul": "TR",
  "Europe/Istanbul": "TR",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kabul": "AF",
  "Asia/Tashkent": "UZ",
  "Asia/Almaty": "KZ",
  "Asia/Baku": "AZ",
  "Asia/Tbilisi": "GE",
  "Asia/Yerevan": "AM",
  "Asia/Jakarta": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH",
  "Asia/Manila": "PH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Saigon": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Shanghai": "CN",
  "Asia/Taipei": "TW",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Athens": "GR",
  "Europe/Kyiv": "UA",
  "Europe/Kiev": "UA",
  "Europe/Moscow": "RU",
  "Europe/Minsk": "BY",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Phoenix": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Mexico_City": "MX",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Santiago": "CL",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Caracas": "VE",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Pacific/Auckland": "NZ",
};

function fromLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const parts = String(locale).split("-");
  for (const p of parts.slice(1)) {
    if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase();
  }
  return null;
}

export function detectCountry(
  req: Request,
  hints: { tz?: string | null; locale?: string | null } = {},
): string | null {
  const header =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-country-code") ||
    null;
  if (header && /^[A-Za-z]{2}$/.test(header) && header.toUpperCase() !== "XX") {
    return header.toUpperCase();
  }

  const tz = hints.tz ? String(hints.tz) : "";
  if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];

  return fromLocale(hints.locale);
}
