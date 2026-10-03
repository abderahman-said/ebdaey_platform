// Public endpoint: returns busy time ranges (from Google Calendar) for a tenant
// within a date range. Used by the consultation booking widget to hide busy slots.
// No auth required — read-only, and only exposes coarse time ranges, never event details.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getBusy, getGcalAccount } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let tenantId = url.searchParams.get("tenant_id") || "";
    let timeMin = url.searchParams.get("time_min") || "";
    let timeMax = url.searchParams.get("time_max") || "";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      tenantId = body.tenant_id || tenantId;
      timeMin = body.time_min || timeMin;
      timeMax = body.time_max || timeMax;
    }

    if (!tenantId || !timeMin || !timeMax) {
      return json({ busy: [], reason: "missing_params" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const account = await getGcalAccount(supabase, tenantId);
    if (!account || !account.busy_sync_enabled) {
      return json({ busy: [], skipped: true });
    }

    const busy = await getBusy(account, timeMin, timeMax);
    return json({ busy });
  } catch (err) {
    console.error("gcal-busy error:", err);
    return json({ busy: [], error: err instanceof Error ? err.message : String(err) });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
