// Only allow redirects back to the platform's own sites.
const ALLOWED_SUFFIXES = [".ebdaey.com", ".lovable.app", ".lovableproject.com"];
const ALLOWED_HOSTS = ["ebdaey.com", "localhost"];

export function safeReturnUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && u.hostname === "localhost")) return "";
    const h = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(h) || ALLOWED_SUFFIXES.some((s) => h.endsWith(s))) return u.toString();
  } catch { /* invalid */ }
  return "";
}
