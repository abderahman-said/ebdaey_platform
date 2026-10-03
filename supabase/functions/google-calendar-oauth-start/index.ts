import { safeReturnUrl } from "../_shared/safe-return-url.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_BASE = "https://connector-gateway.lovable.dev";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];


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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const { data: tenant } = await supabase
      .from("tenants").select("id").eq("owner_id", userId).maybeSingle();
    if (!tenant) return json({ error: "No tenant" }, 400);

    const { returnUrl } = await req.json().catch(() => ({ returnUrl: "" }));

    const clientKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!clientKey || !lovableKey) return json({ error: "Connector not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Look up any stored connection for this tenant.
    const admin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: existing } = await admin
      .from("mentor_google_calendar_accounts")
      .select("connection_api_key, app_user_id")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    // Reconnect: the gateway requires the stored lovack_* key.
    // First connect (or a connection we no longer hold a key for): use a fresh
    // app_user_id so the gateway treats it as a brand-new connection.
    const isReconnect = Boolean(existing?.connection_api_key);
    const appUserId = isReconnect
      ? (existing!.app_user_id || userId)
      : `${userId}:${crypto.randomUUID().slice(0, 8)}`;

    // Bind the tenant + app_user_id + return url into a signed, short-lived state
    // token so the callback cannot be pointed at a tenant the caller does not own.
    const statePayload = btoa(
      JSON.stringify({ t: tenant.id, u: appUserId, r: safeReturnUrl(returnUrl), ts: Date.now() }),
    );
    const stateSig = await hmacSign(statePayload, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const state = `${statePayload}.${stateSig}`;
    const callbackUrl =
      `${supabaseUrl}/functions/v1/google-calendar-oauth-callback?state=${encodeURIComponent(state)}`;

    const gwHeaders: Record<string, string> = {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Client-Api-Key": clientKey,
      "Content-Type": "application/json",
    };
    if (isReconnect) {
      gwHeaders["X-Connection-Api-Key"] = existing!.connection_api_key!;
    }

    const gwRes = await fetch(`${GATEWAY_BASE}/api/v1/app-users/oauth2/authorize`, {
      method: "POST",
      headers: gwHeaders,
      body: JSON.stringify({
        connector_id: "google_calendar",
        app_user_id: appUserId,
        return_url: callbackUrl,
        credentials_configuration: { scopes: SCOPES },
      }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error("Gateway authorize failed:", text);
      return json({ error: "Failed to start OAuth", details: text }, 500);
    }
    const { authorization_url } = await gwRes.json();
    return json({ authUrl: authorization_url });
  } catch (err) {
    console.error("oauth-start error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
