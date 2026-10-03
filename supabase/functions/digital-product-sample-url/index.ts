import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { file_id } = await req.json();
    if (!file_id) {
      return new Response(JSON.stringify({ error: "missing file_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: file, error } = await service
      .from("digital_product_files")
      .select("id, file_url, file_type, title, is_sample")
      .eq("id", file_id)
      .maybeSingle();

    if (error || !file) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!file.is_sample) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: signed, error: sErr } = await service.storage
      .from("digital-products")
      .createSignedUrl(file.file_url, 60 * 10);
    if (sErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "failed to sign" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Best-effort log
    try {
      await service.rpc("increment_dp_file_download", { _file_id: file.id });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ url: signed.signedUrl, title: file.title, file_type: file.file_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
