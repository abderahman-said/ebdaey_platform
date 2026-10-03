import { safeReturnUrl } from "../_shared/safe-return-url.ts";
import { escapeHtml } from "../_shared/internal-auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ensureSessionZoomMeeting } from "../_shared/zoom.ts";

const REDIRECT_URI = Deno.env.get("ZOOM_REDIRECT_URI")
  || "https://ebdaey.com/zoom/oauth/callback";

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function htmlRedirect(url: string, _message?: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

function htmlError(message: string): Response {
  return new Response(
    `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>خطأ</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;margin:0;text-align:center;padding:20px}</style>
    </head><body><div><h2>فشل ربط Zoom</h2><p>${escapeHtml(message)}</p><a href="javascript:history.back()" style="color:#60a5fa">العودة</a></div></body></html>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    if (errorParam) return htmlError(`Zoom رفض الطلب: ${errorParam}`);
    if (!code || !state) return htmlError("بيانات غير مكتملة من Zoom");

    const CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID")!;
    const CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET")!;

    // Verify state
    const [payload, sig] = state.split(".");
    if (!payload || !sig) return htmlError("توقيع غير صالح");
    const expected = await hmacSign(payload, CLIENT_SECRET);
    if (sig !== expected) return htmlError("توقيع غير صحيح");

    const decoded = JSON.parse(atob(payload));
    const tenantId = decoded.t;
    const returnUrl = safeReturnUrl(decoded.r) || "https://app.ebdaey.com/";
    const ts = decoded.ts;
    if (Date.now() - ts > 10 * 60 * 1000) return htmlError("انتهت صلاحية الجلسة، حاول مرة أخرى");

    // Exchange code for tokens
    const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const tokenRes = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Zoom token exchange failed:", errText);
      return htmlError("فشل تبادل الرموز مع Zoom");
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Fetch user info
    const userRes = await fetch("https://api.zoom.us/v2/users/me", {
      headers: { "Authorization": `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error("Zoom user fetch failed");
      return htmlError("فشل جلب بيانات الحساب");
    }

    const user = await userRes.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + (expires_in - 60) * 1000).toISOString();

    const { error: upsertErr } = await supabase
      .from("mentor_zoom_accounts")
      .upsert({
        tenant_id: tenantId,
        zoom_user_id: user.id,
        zoom_email: user.email,
        zoom_account_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        scopes: scope,
      }, { onConflict: "tenant_id" });

    if (upsertErr) {
      console.error("Upsert failed:", upsertErr);
      return htmlError("فشل حفظ بيانات الربط");
    }

    // A mentor may connect Zoom after creating sessions. Backfill every future
    // Zoom session without a link so connection order cannot break the flow.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const { data: pendingSessions, error: pendingError } = await supabase
      .from("live_course_sessions")
      .select("id, tenant_id, live_course_id, title, session_date, session_time, duration_minutes, zoom_join_url, zoom_start_url")
      .eq("tenant_id", tenantId)
      .gte("session_date", today)
      .is("zoom_join_url", null);
    if (pendingError) console.error("Zoom session backfill query failed:", pendingError.message);
    for (const session of pendingSessions || []) {
      const { data: course } = await supabase.from("live_courses").select("title, attendance_type, meeting_link").eq("id", (session as any).live_course_id).maybeSingle();
      if (course?.attendance_type !== "zoom" || course?.meeting_link) continue;
      const result = await ensureSessionZoomMeeting(supabase, session as any, course.title || "");
      if (!result.ok) {
        await supabase.from("live_course_sessions").update({
          zoom_generation_error: `${result.code}: ${result.message}`.slice(0, 1000),
          zoom_generation_attempted_at: new Date().toISOString(),
        }).eq("id", (session as any).id);
      }
    }

    const finalUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}zoom_connected=1`;
    return htmlRedirect(finalUrl, `مرحباً ${user.email}`);
  } catch (err) {
    console.error("Callback error:", err);
    return htmlError(err instanceof Error ? err.message : "خطأ غير معروف");
  }
});
