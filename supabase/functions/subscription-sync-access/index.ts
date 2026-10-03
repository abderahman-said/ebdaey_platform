// Grants a signed-in student access to any product added by the mentor after
// their subscription started. Called by the student dashboard on load.
import { createClient } from "npm:@supabase/supabase-js@2";
import { syncActiveSubscriptions } from "../_shared/grant-subscription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const { data: students } = await supabase
      .from("students").select("id").eq("user_id", userData.user.id);
    const ids = (students || []).map((s: any) => s.id);
    if (!ids.length) return json({ ok: true, synced: 0 });

    await syncActiveSubscriptions(supabase, ids);
    return json({ ok: true, synced: ids.length });
  } catch (e) {
    console.error("subscription-sync-access error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
