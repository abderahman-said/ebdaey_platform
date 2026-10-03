import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, id, payload } = body;
    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify ownership (mentor) or admin
    const { data: tenantRow } = await service
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    const userTenantId = tenantRow?.id;

    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    const ensureOwns = async (reviewId: string) => {
      if (isAdmin) return true;
      const { data } = await service.from("reviews").select("tenant_id").eq("id", reviewId).maybeSingle();
      return data?.tenant_id && data.tenant_id === userTenantId;
    };

    const MENTOR_FIELDS = ["course_id", "first_name", "last_name", "rating", "comment", "is_published", "proof_url", "proof_type", "product_type", "product_id", "rating_v2", "verification_status", "rejection_reason"];
    const ADMIN_FIELDS: string[] = [];
    const clean = (p: any) => {
      const allowed = isAdmin ? [...MENTOR_FIELDS, ...ADMIN_FIELDS] : MENTOR_FIELDS;
      const out: Record<string, unknown> = {};
      for (const k of allowed) if (p && k in p) out[k] = p[k];
      for (const k of ["first_name", "last_name", "comment", "proof_url"]) {
        if (typeof out[k] === "string") out[k] = (out[k] as string).slice(0, k === "comment" ? 5000 : 500);
      }
      return out;
    };
    const courseInTenant = async (courseId: unknown, tenantId: string) => {
      if (!courseId) return true;
      const { data } = await service.from("courses").select("id").eq("id", courseId as string).eq("tenant_id", tenantId).maybeSingle();
      return !!data;
    };

    if (action === "insert") {
      if (!payload?.tenant_id || (!isAdmin && payload.tenant_id !== userTenantId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const row = { ...clean(payload), tenant_id: payload.tenant_id };
      if (!(await courseInTenant(row.course_id, payload.tenant_id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await service.from("reviews").insert(row).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      if (!(await ensureOwns(id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const row = clean(payload);
      const { data: existing } = await service.from("reviews").select("tenant_id").eq("id", id).maybeSingle();
      if (!existing || !(await courseInTenant(row.course_id, existing.tenant_id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await service.from("reviews").update(row).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      if (!(await ensureOwns(id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await service.from("reviews").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_publish") {
      if (!(await ensureOwns(id))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await service.from("reviews").update({ is_published: payload.is_published }).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
