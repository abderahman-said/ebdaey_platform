import { safeReturnUrl } from "../_shared/safe-return-url.ts";
import { escapeHtml } from "../_shared/internal-auth.ts";
// Public callback (verify_jwt=false). Receives ?code=... from the Lovable connector gateway
// after the user completes OAuth with Google. We exchange the code for a per-user
// connection_api_key, fetch the user's email via Google userinfo, then upsert the row.
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_BASE = "https://connector-gateway.lovable.dev";

function htmlError(msg: string): Response {
  return new Response(
    `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>خطأ</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;margin:0;text-align:center;padding:20px}</style>
    </head><body><div><h2>فشل ربط Google Calendar</h2><p>${escapeHtml(msg)}</p><a href="javascript:history.back()" style="color:#60a5fa">العودة</a></div></body></html>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function htmlRedirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}


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

const STATE_MAX_AGE_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    if (errorParam) return htmlError(`Google رفض الطلب: ${errorParam}`);
    if (!code || !state) return htmlError("بيانات غير مكتملة من Google");

    // Verify the signed state issued by google-calendar-oauth-start.
    const [statePayload, stateSig] = state.split(".");
    if (!statePayload || !stateSig) return htmlError("حالة الطلب غير صالحة");
    const expectedSig = await hmacSign(
      statePayload,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (stateSig !== expectedSig) return htmlError("حالة الطلب غير صالحة");

    let tenantId = "";
    let returnUrl = "";
    let appUserId = "";
    try {
      const parsed = JSON.parse(atob(statePayload)) as { t?: string; u?: string; r?: string; ts?: number };
      if (!parsed.t || !parsed.ts || Date.now() - parsed.ts > STATE_MAX_AGE_MS) {
        return htmlError("انتهت صلاحية الطلب، حاول مرة أخرى");
      }
      tenantId = parsed.t;
      returnUrl = safeReturnUrl(parsed.r);
      appUserId = parsed.u || "";
    } catch {
      return htmlError("حالة الطلب غير صالحة");
    }

    const clientKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!clientKey || !lovableKey) return htmlError("Connector غير مُهيأ");

    // Exchange one-time code for the persistent connection API key
    const exchangeRes = await fetch(`${GATEWAY_BASE}/api/v1/app-users/oauth2/exchange`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "X-Client-Api-Key": clientKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });
    if (!exchangeRes.ok) {
      const t = await exchangeRes.text();
      console.error("Exchange failed:", t);
      return htmlError("فشل تبادل الرموز");
    }
    const exchangeData = await exchangeRes.json();
    const connectionApiKey: string | undefined =
      exchangeData.connection_api_key || exchangeData.api_key || exchangeData.connectionApiKey;
    const scopes: string | undefined =
      exchangeData.scopes || exchangeData.scope || undefined;

    if (!connectionApiKey) {
      console.error("Exchange response missing connection key:", exchangeData);
      return htmlError("لم يتم استلام مفتاح الاتصال");
    }

    // Fetch google email via gateway proxied userinfo endpoint
    let googleEmail = exchangeData.email || exchangeData.user_email || "";
    if (!googleEmail) {
      const infoRes = await fetch(
        `${GATEWAY_BASE}/google_calendar/oauth2/v2/userinfo`,
        {
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Client-Api-Key": clientKey,
            "X-Connection-Api-Key": connectionApiKey,
          },
        },
      );
      if (infoRes.ok) {
        const info = await infoRes.json();
        googleEmail = info.email || "";
      }
    }
    if (!googleEmail) googleEmail = "unknown@google";

    // Upsert
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: upsertErr } = await supabase
      .from("mentor_google_calendar_accounts")
      .upsert(
        {
          tenant_id: tenantId,
          app_user_id: appUserId || null,
          google_email: googleEmail,
          connection_api_key: connectionApiKey,
          scopes: scopes ?? null,
          calendar_id: "primary",
          busy_sync_enabled: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
    if (upsertErr) {
      console.error("Upsert failed:", upsertErr);
      return htmlError("فشل حفظ بيانات الربط");
    }

    const target = returnUrl || "https://app.ebdaey.com/";
    const finalUrl = target + (target.includes("?") ? "&" : "?") + "gcal_connected=1";
    return htmlRedirect(finalUrl);
  } catch (err) {
    console.error("callback error:", err);
    return htmlError(err instanceof Error ? err.message : "خطأ غير معروف");
  }
});
