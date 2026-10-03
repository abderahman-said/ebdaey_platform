import { getSubdomainInfo } from "@/lib/subdomain";

/**
 * The English language toggle is only meaningful on our own operator surfaces:
 * marketing homepage, mentor auth, mentor dashboard, admin. Every mentor
 * public storefront (mentor profile, course, product, live, checkout, delivery,
 * lesson viewer, student dashboard, …) must stay Arabic regardless of the
 * user's chosen language, so mentor branding and Arabic typography are
 * preserved.
 */
const MAIN_ALLOWED_EXACT = new Set<string>([
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/refund-policy",
  "/delivery-policy",
  "/auth",
  "/admin-login",
  "/reset-password",
  "/app",
  "/app/dashboard",
]);

const MAIN_ALLOWED_PREFIX = ["/app/"];

export function isLanguageTogglableRoute(pathname: string): boolean {
  const info = getSubdomainInfo();

  // Mentor storefront subdomain — always Arabic.
  if (info.context === "mentor-site") return false;

  // Admin subdomain / admin routes — always Arabic.
  if (info.context === "admin") return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;

  // Mentor dashboard subdomain (app.ebdaey.com) — allow English.
  if (info.context === "mentor-app") return true;

  // Main domain / preview / localhost (path-based).
  if (MAIN_ALLOWED_EXACT.has(pathname)) return true;
  if (MAIN_ALLOWED_PREFIX.some((p) => pathname === p || pathname.startsWith(p))) return true;

  // Path-based tenant routes: `/:mentorSlug/...` and `/mentor/:slug/...` are
  // mentor public pages → Arabic only.
  return false;
}

