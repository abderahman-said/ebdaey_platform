import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Parse "bunny:{lib}:{id}" or accept { libraryId, videoId } directly
function parseBunny(url?: string): { libraryId: string; videoId: string } | null {
  if (!url || !url.startsWith("bunny:")) return null;
  const parts = url.split(":");
  if (parts.length !== 3) return null;
  return { libraryId: parts[1], videoId: parts[2] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const DEFAULT_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");
    if (!BUNNY_API_KEY) {
      return new Response(JSON.stringify({ error: "Bunny.net credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requireRole, callerOwnsTenant } = await import("../_shared/require-role.ts");
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let { url, libraryId, videoId, urls } = body as {
      url?: string; libraryId?: string; videoId?: string; urls?: string[];
    };

    // Batch mode
    const targets: Array<{ libraryId: string; videoId: string }> = [];
    if (Array.isArray(urls)) {
      for (const u of urls) {
        const p = parseBunny(u);
        if (p) targets.push(p);
      }
    } else if (url) {
      const p = parseBunny(url);
      if (p) targets.push(p);
    } else if (videoId) {
      targets.push({ libraryId: libraryId || DEFAULT_LIBRARY_ID || "", videoId });
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ success: true, deleted: 0, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant isolation: if a target video is referenced by any tenant's content,
    // only that tenant's owner (or an admin / internal service call) may delete it.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const ownershipCache = new Map<string, boolean>();
    const mayDelete = async (t: { libraryId: string; videoId: string }): Promise<boolean> => {
      const stored = `bunny:${t.libraryId}:${t.videoId}`;
      if (ownershipCache.has(stored)) return ownershipCache.get(stored)!;

      const lookups: Array<Promise<{ data: { tenant_id: string }[] | null }>> = [
        admin.from("lessons").select("tenant_id").or(`video_url.eq.${stored},audio_url.eq.${stored}`),
        admin.from("courses").select("tenant_id").eq("banner_video_url", stored),
        admin.from("live_courses").select("tenant_id").eq("banner_video_url", stored),
        admin.from("digital_products").select("tenant_id").eq("banner_video_url", stored),
      ];
      const results = await Promise.all(
        lookups.map((q) => Promise.resolve(q).catch(() => ({ data: null }))),
      );
      const tenantIds = new Set<string>();
      for (const r of results) for (const row of r.data || []) if (row?.tenant_id) tenantIds.add(row.tenant_id);

      // Unreferenced videos have no provable owner: only admins/internal calls may delete them.
      let allowed = await callerOwnsTenant(auth.user?.id, "__admin_only__");
      if (tenantIds.size > 0) {
        allowed = true;
        for (const tid of tenantIds) {
          if (!(await callerOwnsTenant(auth.user?.id, tid))) { allowed = false; break; }
        }
      }
      ownershipCache.set(stored, allowed);
      return allowed;
    };


    const results: Array<{ libraryId: string; videoId: string; ok: boolean; status: number }> = [];
    for (const t of targets) {
      if (!t.libraryId || !t.videoId) {
        results.push({ ...t, ok: false, status: 0 });
        continue;
      }
      if (!(await mayDelete(t))) {
        console.warn(`Bunny delete forbidden for ${t.libraryId}/${t.videoId}`);
        results.push({ ...t, ok: false, status: 403 });
        continue;
      }

      try {
        const res = await fetch(
          `https://video.bunnycdn.com/library/${t.libraryId}/videos/${t.videoId}`,
          { method: "DELETE", headers: { AccessKey: BUNNY_API_KEY } }
        );
        // 200 = deleted, 404 = already gone (idempotent success)
        const ok = res.ok || res.status === 404;
        results.push({ ...t, ok, status: res.status });
        if (!ok) {
          const txt = await res.text().catch(() => "");
          console.error(`Bunny delete failed ${t.libraryId}/${t.videoId}:`, res.status, txt);
        }
      } catch (e) {
        console.error(`Bunny delete error ${t.libraryId}/${t.videoId}:`, e);
        results.push({ ...t, ok: false, status: 0 });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deleted: results.filter(r => r.ok).length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bunny delete error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
