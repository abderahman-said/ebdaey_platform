import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_BASE = "https://connector-gateway.lovable.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const { data: tenant } = await supabaseAuth
      .from("tenants").select("id").eq("owner_id", userId).maybeSingle();
    if (!tenant) return json({ error: "No tenant" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-effort revoke on gateway
    const { data: acc } = await supabase
      .from("mentor_google_calendar_accounts")
      .select("connection_api_key")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (acc?.connection_api_key) {
      const clientKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (clientKey && lovableKey) {
        await fetch(`${GATEWAY_BASE}/api/v1/app-users/connections`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Client-Api-Key": clientKey,
            "X-Connection-Api-Key": acc.connection_api_key,
          },
        }).catch(() => {});
      }
    }

    const { error: delErr } = await supabase
      .from("mentor_google_calendar_accounts")
      .delete()
      .eq("tenant_id", tenant.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
