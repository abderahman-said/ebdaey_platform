// Shared helpers for admin login hardening (attempt throttling + email 2FA).
import { createClient } from "npm:@supabase/supabase-js@2";

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_SECONDS = 15 * 60;
export const CODE_TTL_SECONDS = 10 * 60;
export const CODE_MAX_ATTEMPTS = 5;
export const TRUSTED_DEVICE_DAYS = 30;
export const SESSION_DEVICE_HOURS = 12;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function callerIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/** Peppered SHA-256 — codes and device tokens are never stored in clear text. */
export async function hashSecret(value: string): Promise<string> {
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bytes = new TextEncoder().encode(`${pepper}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

export function generateDeviceToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifies the bearer token belongs to a signed-in admin. */
export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const supa = serviceClient();
  const { data, error } = await supa.auth.getUser(authHeader.slice(7));
  if (error || !data?.user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const { data: isAdmin } = await supa.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  if (!isAdmin) return { ok: false as const, status: 403, error: "forbidden" };
  return {
    ok: true as const,
    user: { id: data.user.id, email: data.user.email ?? "" },
    supa,
  };
}

/** Records a login attempt (never throws). */
export async function recordAttempt(
  supa: any,
  email: string,
  ip: string,
  success: boolean,
) {
  await supa
    .from("admin_login_attempts")
    .insert({ email: email.toLowerCase().slice(0, 200), ip, success })
    .then(undefined, () => {});
}

export interface LockState {
  locked: boolean;
  retryAfterSeconds: number;
  failures: number;
}

/** Counts recent failures for this email and this IP. */
export async function lockState(
  supa: any,
  email: string,
  ip: string,
): Promise<LockState> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_SECONDS * 1000).toISOString();
  const { data } = await supa
    .from("admin_login_attempts")
    .select("email, ip, created_at")
    .eq("success", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = data || [];
  const normalized = email.toLowerCase();
  const byEmail = rows.filter((r: any) => (r.email || "") === normalized);
  const byIp = ip === "unknown" ? [] : rows.filter((r: any) => r.ip === ip);
  const worst = Math.max(byEmail.length, byIp.length);
  if (worst < MAX_FAILED_ATTEMPTS) {
    return { locked: false, retryAfterSeconds: 0, failures: worst };
  }
  const group = byEmail.length >= byIp.length ? byEmail : byIp;
  const oldestInWindow = group[Math.min(group.length, MAX_FAILED_ATTEMPTS) - 1];
  const unlockAt = new Date(oldestInWindow.created_at).getTime() +
    ATTEMPT_WINDOW_SECONDS * 1000;
  const retry = Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000));
  return { locked: true, retryAfterSeconds: retry, failures: worst };
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#f6f7f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:14px;padding:28px;border:1px solid #eaecef">
    <h2 style="margin:0 0 12px;font-size:19px;color:#111">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:22px;font-size:12px;color:#8b8f96">منصة إبداعي — رسالة أمان تلقائية</p>
  </div></body></html>`;
}
