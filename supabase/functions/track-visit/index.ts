import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { detectCountry } from "../_shared/geo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseUA(ua: string): { device: string; os: string } {
  const u = (ua || "").toLowerCase();
  let device = "desktop";
  if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast/.test(u)) device = "smarttv";
  else if (/tablet|ipad|playbook|silk/.test(u) || (/android/.test(u) && !/mobile/.test(u))) device = "tablet";
  else if (/mobi|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/.test(u)) device = "mobile";

  let os = "Other";
  if (/iphone|ipad|ipod/.test(u)) os = "iOS";
  else if (/android/.test(u)) os = "Android";
  else if (/windows/.test(u)) os = "Windows";
  else if (/mac os x|macintosh/.test(u)) os = "macOS";
  else if (/linux/.test(u)) os = "Linux";
  return { device, os };
}

function deriveSource(referrer: string, currentHost: string): string {
  if (!referrer) return "direct";
  try {
    const u = new URL(referrer);
    if (u.hostname === currentHost) return "direct";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tenant_id, path, page_type, referrer, session_id, host, tz, locale } = body || {};
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "track-visit", max: 120, windowSeconds: 60 }, corsHeaders);
  if (limited) return limited;


    if (typeof tenant_id !== "string" || !/^[0-9a-f-]{36}$/i.test(tenant_id)) {
      return new Response(JSON.stringify({ error: "invalid tenant_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ua = req.headers.get("user-agent") || "";
    const { device, os } = parseUA(ua);
    const country = detectCountry(req, { tz, locale });
    const source = deriveSource(referrer || "", host || "");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenantRow } = await supa.from("tenants").select("id").eq("id", tenant_id).eq("is_active", true).maybeSingle();
    if (!tenantRow) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supa.from("page_views").insert({
      tenant_id,
      path: (path || "").slice(0, 500),
      page_type: typeof page_type === "string" ? page_type.slice(0, 50) : null,
      referrer: (referrer || "").slice(0, 500),
      source: source.slice(0, 200),
      country,
      device,
      os,
      session_id: typeof session_id === "string" ? session_id.slice(0, 100) : null,
    });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
