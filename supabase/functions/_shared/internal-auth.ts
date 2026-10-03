// Helpers for functions that must only be called by other backend functions.

/** True when the request carries the service-role key as its bearer token. */
export function isServiceCall(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return !!service && auth === `Bearer ${service}`;
}

/** Escapes text for safe interpolation into HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
