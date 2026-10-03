/**
 * Module-level cache of each mentor's chosen public-site language.
 * The mentor's Site Settings toggle writes here (via a fetch on mount); the
 * language layer reads here so the effective <html lang/dir> and i18n language
 * on mentor public pages follow the mentor's choice instead of the visitor's
 * preference.
 */

import { getSubdomainInfo } from "@/lib/subdomain";

type Lang = "ar" | "en";

const cache = new Map<string, Lang>();
const inFlight = new Set<string>();
const subscribers = new Set<() => void>();

export function getMentorPublicLanguage(slug: string | null | undefined): Lang | null {
  if (!slug) return null;
  return cache.get(slug) ?? null;
}

export function setMentorPublicLanguage(slug: string, lang: Lang) {
  const prev = cache.get(slug);
  cache.set(slug, lang);
  if (prev !== lang) subscribers.forEach((cb) => cb());
}

export function subscribeMentorPublicLanguage(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function markInFlight(slug: string): boolean {
  if (inFlight.has(slug)) return false;
  inFlight.add(slug);
  return true;
}

export function clearInFlight(slug: string) {
  inFlight.delete(slug);
}

// --- slug extraction from pathname / host ------------------------------------

const RESERVED_FIRST_SEGMENTS = new Set([
  "auth",
  "admin-login",
  "reset-password",
  "app",
  "admin",
  "privacy-policy",
  "terms",
  "refund-policy",
  "delivery-policy",
  "contact",
  "about",
  "verify",
  "mentor",
  "zoom-integration",
  "zoom",
]);

export function getMentorSlugForRoute(pathname: string): string | null {
  const info = getSubdomainInfo();
  if (info.context === "mentor-site") return info.mentorSlug;
  if (info.context !== "main") return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === "mentor" && parts[1]) return parts[1];
  if (RESERVED_FIRST_SEGMENTS.has(parts[0])) return null;
  return parts[0];
}
