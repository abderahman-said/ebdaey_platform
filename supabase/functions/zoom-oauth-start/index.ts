import { safeReturnUrl } from "../_shared/safe-return-url.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const { data: tenant } = await supabase.from("tenants").select("id").eq("owner_id", userId).maybeSingle();
    if (!tenant) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { returnUrl } = await req.json().catch(() => ({ returnUrl: "" }));

    const CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Zoom credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // state = base64({tenantId,returnUrl,ts}).signature
    const payload = btoa(JSON.stringify({ t: tenant.id, r: safeReturnUrl(returnUrl), ts: Date.now() }));
    const sig = await hmacSign(payload, CLIENT_SECRET);
    const state = `${payload}.${sig}`;

    // Read the connected Zoom account id + create/read/update meetings
    // (update+read are required to re-apply host-only/waiting-room settings).
    const SCOPES = "user:read:user meeting:write:meeting";


    const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${encodeURIComponent(state)}`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
