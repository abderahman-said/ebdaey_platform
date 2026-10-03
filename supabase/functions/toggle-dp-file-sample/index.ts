import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { file_id, is_sample } = await req.json();
    if (!file_id || typeof is_sample !== "boolean") {
      return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const svc = createClient(url, service);
    const { data: file } = await svc.from("digital_product_files").select("id, tenant_id").eq("id", file_id).maybeSingle();
    if (!file) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: tenant } = await svc.from("tenants").select("id").eq("id", file.tenant_id).eq("owner_id", userData.user.id).maybeSingle();
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!tenant && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { error } = await svc.from("digital_product_files").update({ is_sample }).eq("id", file_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
