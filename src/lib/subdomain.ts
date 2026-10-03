/**
 * Subdomain-based routing utility.
 *
 * Production hosts:
 *   ebdaey.com / www.ebdaey.com  → marketing + legacy path-based fallback
 *   <mentor>.ebdaey.com          → mentor public site
 *   app.ebdaey.com               → mentor app (dashboard / student dashboard)
 *   admin.ebdaey.com             → admin dashboard
 *
 * Anywhere else (localhost, *.lovable.app preview, etc.) falls back to the
 * legacy path-based scheme so dev and preview still work.
 */

export type AppContext = "main" | "admin" | "mentor-app" | "mentor-site";

interface SubdomainInfo {
  context: AppContext;
  mentorSlug: string | null;
  isSubdomainMode: boolean;
}

const BASE_DOMAIN = "ebdaey.com";
const RESERVED_SUBS = new Set(["", "www", "app", "admin", "api", "mail", "email", "static", "assets"]);

function parseHost(rawHost: string): SubdomainInfo {
  const host = (rawHost || "").toLowerCase().split(":")[0];

  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { context: "main", mentorSlug: null, isSubdomainMode: true };
  }
  if (host === `app.${BASE_DOMAIN}`) {
    return { context: "mentor-app", mentorSlug: null, isSubdomainMode: true };
  }
  if (host === `admin.${BASE_DOMAIN}`) {
    return { context: "admin", mentorSlug: null, isSubdomainMode: true };
  }
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = host.slice(0, -BASE_DOMAIN.length - 1);
    if (sub && !sub.includes(".") && !RESERVED_SUBS.has(sub)) {
      return { context: "mentor-site", mentorSlug: sub, isSubdomainMode: true };
    }
  }
  // localhost / preview / unknown → path-based legacy mode
  return { context: "main", mentorSlug: null, isSubdomainMode: false };
}

let cached: SubdomainInfo | null = null;

export function getSubdomainInfo(): SubdomainInfo {
  if (cached) return cached;
  if (typeof window === "undefined") {
    return { context: "main", mentorSlug: null, isSubdomainMode: false };
  }
  cached = parseHost(window.location.host);
  return cached;
}

/** Full URL to a mentor's public site. Subdomain in prod, path on dev. */
export function getMentorSiteUrl(mentorSlug: string, path: string = "/"): string {
  const info = getSubdomainInfo();
  const tail = path === "/" ? "" : path;
  if (info.isSubdomainMode) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}//${mentorSlug}.${BASE_DOMAIN}${tail}`;
  }
  return `/${mentorSlug}${tail}`;
}

export function getMentorPath(path: string, mentorSlug?: string): string {
  const info = getSubdomainInfo();
  if (info.context === "mentor-site") return path;
  return `/${mentorSlug}${path}`;
}

export function getAdminUrl(path: string = "/"): string {
  const info = getSubdomainInfo();
  const tail = path === "/" ? "" : path;
  if (info.isSubdomainMode) {
    if (info.context === "admin") return tail || "/";
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}//admin.${BASE_DOMAIN}${tail}`;
  }
  return `/admin${tail}`;
}

/** Appends the visitor's current language so it survives cross-subdomain hops
 *  (localStorage is per-origin, so app.ebdaey.com can't see ebdaey.com's choice). */
export function withCurrentLang(url: string): string {
  if (typeof document === "undefined") return url;
  const lang = document.documentElement.lang;
  if (lang !== "ar" && lang !== "en") return url;
  if (/[?&]lang=/.test(url)) return url;
  const [base, hash] = url.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}lang=${lang}${hash !== undefined ? `#${hash}` : ""}`;
}

export function getMentorAppUrl(path: string = "/"): string {
  const info = getSubdomainInfo();
  const tail = path === "/" ? "" : path;
  if (info.isSubdomainMode) {
    if (info.context === "mentor-app") return tail || "/";
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return withCurrentLang(`${protocol}//app.${BASE_DOMAIN}${tail}`);
  }
  return withCurrentLang(`/app${tail}`);
}

export function getMainUrl(path: string = "/"): string {
  const info = getSubdomainInfo();
  if (info.isSubdomainMode && info.context !== "main") {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}//${BASE_DOMAIN}${path === "/" ? "" : path}`;
  }
  return path;
}

export function getCurrentMentorSlug(): string | null {
  return getSubdomainInfo().mentorSlug;
}
