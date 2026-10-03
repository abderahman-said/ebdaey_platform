import { createClient } from "npm:@supabase/supabase-js@2";
import { requireRole } from "../_shared/require-role.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admins only. Mentors must never be able to mint a login link for someone else.
    const auth = await requireRole(req, ["admin"]);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const limited = await rateLimitGuard(req, { name: "admin-mentor-magic-link", max: 20, windowSeconds: 600, identifier: auth.user?.id }, corsHeaders);
    if (limited) return limited;

    const { tenant_id, slug, redirect_to } = await req.json().catch(() => ({}));
    if (!tenant_id && !slug) return json({ error: "tenant_id or slug required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    let q = admin.from("tenants").select("id, name, slug, owner_id").limit(1);
    q = tenant_id ? q.eq("id", tenant_id) : q.eq("slug", slug);
    const { data: tenant, error: tErr } = await q.maybeSingle();
    if (tErr || !tenant) return json({ error: "Mentor not found" }, 404);
    if (!tenant.owner_id) return json({ error: "Mentor has no owner account" }, 400);

    const { data: ownerData, error: oErr } = await admin.auth.admin.getUserById(tenant.owner_id);
    const email = ownerData?.user?.email;
    if (oErr || !email) return json({ error: "Mentor account email not found" }, 404);

    const redirectTo = typeof redirect_to === "string" && redirect_to.startsWith("https://app.ebdaey.com")
      ? redirect_to
      : "https://app.ebdaey.com/";

    const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (lErr || !linkData?.properties?.action_link) {
      return json({ error: lErr?.message || "Failed to generate link" }, 500);
    }


    // Audit trail
    await admin.from("activity_logs").insert({
      action: "إنشاء رابط دخول سريع للمدرب",
      actor_id: auth.user?.id === "service_role" ? null : auth.user?.id,
      actor_type: "admin",
      target_type: "tenant",
      target_id: tenant.id,
      details: { name: tenant.name, slug: tenant.slug },
    }).then(undefined, () => {});

    return json({
      link: linkData.properties.action_link,
      mentor: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      expires_in_hours: 1,
      single_use: true,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
