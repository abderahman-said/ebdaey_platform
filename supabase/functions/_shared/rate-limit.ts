// Shared application-layer rate limiting for edge functions.
// Backed by public.check_rate_limit (atomic fixed window, service-role only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOptions {
  /** Logical name of the protected action, e.g. "qa-ask". */
  name: string;
  /** Max allowed requests inside the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Extra identity component (user id, tenant id, email...). Defaults to caller IP. */
  identifier?: string;
}

function callerIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Returns true when the request is allowed.
 * Fails OPEN on infrastructure errors so a DB hiccup can't take the app down.
 */
export async function checkRateLimit(
  req: Request,
  opts: RateLimitOptions,
): Promise<boolean> {
  try {
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Internal / background calls (cron, chained functions) present the
    // service role key. They are trusted and never throttled.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (token && token === service) return true;

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, service);
    const id = (opts.identifier || callerIp(req)).slice(0, 200);
    const { data, error } = await supa.rpc("check_rate_limit", {
      _key: `${opts.name}:${id}`,
      _max_hits: opts.max,
      _window_seconds: opts.windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] rpc error", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[rate-limit] failed", (e as Error).message);
    return true;
  }
}

/** Standard 429 response. */
export function tooManyRequests(
  headers: Record<string, string>,
  retryAfterSeconds = 60,
  message = "طلبات كثيرة جدًا. برجاء المحاولة بعد قليل.",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}

/**
 * Convenience guard: returns a 429 Response when limited, otherwise null.
 */
export async function rateLimitGuard(
  req: Request,
  opts: RateLimitOptions,
  headers: Record<string, string>,
): Promise<Response | null> {
  const allowed = await checkRateLimit(req, opts);
  if (allowed) return null;
  return tooManyRequests(headers, opts.windowSeconds);
}
