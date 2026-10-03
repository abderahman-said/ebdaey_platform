import { supabase } from "@/integrations/supabase/client";

const KEY = "ebdaey_admin_device_token";

/**
 * Master switch for admin two-step verification.
 * Temporarily off by request — set back to `true` to require the email code again.
 * Brute-force throttling stays active either way.
 */
export const ADMIN_MFA_ENABLED = false;

/** Trusted-device token: localStorage (30 days) or sessionStorage (this session). */
export function readDeviceToken(): string | null {
  try {
    return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function storeDeviceToken(token: string, persistent: boolean) {
  try {
    clearDeviceToken();
    (persistent ? localStorage : sessionStorage).setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearDeviceToken() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Server-side check that this browser already passed two-step verification. */
export async function isDeviceVerified(): Promise<boolean> {
  if (!ADMIN_MFA_ENABLED) return true;
  const token = readDeviceToken();
  if (!token) return false;
  try {
    const { data, error } = await supabase.functions.invoke("admin-login-verify", {
      body: { action: "check_device", device_token: token },
    });
    if (error) return false;
    if ((data as { ok?: boolean } | null)?.ok) return true;
    clearDeviceToken();
    return false;
  } catch {
    return false;
  }
}

export async function precheckAdminLogin(email: string) {
  try {
    const { data } = await supabase.functions.invoke("admin-login-guard", {
      body: { action: "precheck", email },
    });
    return (data as { locked?: boolean; retry_after_seconds?: number } | null) ?? { locked: false };
  } catch {
    return { locked: false } as { locked?: boolean; retry_after_seconds?: number };
  }
}

export async function recordAdminLoginFailure(email: string) {
  try {
    await supabase.functions.invoke("admin-login-guard", {
      body: { action: "record_failure", email },
    });
  } catch {
    /* ignore */
  }
}

export async function sendAdminLoginCode() {
  return await supabase.functions.invoke("admin-login-guard", {
    body: { action: "send_code" },
  });
}

export async function verifyAdminLoginCode(code: string, trustDevice: boolean) {
  return await supabase.functions.invoke("admin-login-verify", {
    body: { action: "verify_code", code, trust_device: trustDevice },
  });
}

export function lockoutMessage(retryAfterSeconds?: number) {
  const minutes = Math.max(1, Math.ceil((retryAfterSeconds || 900) / 60));
  return `تم إيقاف الدخول مؤقتًا بسبب محاولات فاشلة متكررة. حاول بعد ${minutes} دقيقة.`;
}
