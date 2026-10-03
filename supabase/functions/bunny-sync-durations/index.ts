import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });
    const { data: userRes } = authHeader ? await userClient.auth.getUser() : { data: { user: null } };

    const { course_id } = await req.json().catch(() => ({}));
    if (!course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify ownership
    const { data: course } = await admin
      .from("courses")
      .select("id, tenant_id, is_published, tenants!inner(owner_id)")
      .eq("id", course_id)
      .maybeSingle();
    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let isAdmin = false;
    if (userRes?.user?.id) {
      const { data: r } = await admin.from("user_roles").select("role")
        .eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
      isAdmin = !!r;
    }
    if (!isAdmin && (course as any).tenants.owner_id !== userRes?.user?.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sections then lessons
    const { data: sections } = await admin
      .from("course_sections").select("id").eq("course_id", course_id);
    const sectionIds = (sections || []).map((s: any) => s.id);
    if (sectionIds.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lessons } = await admin
      .from("lessons")
      .select("id, video_url, duration_seconds")
      .in("section_id", sectionIds)
      .eq("content_type", "video");

    const targets = (lessons || []).filter((l: any) =>
      l.video_url && l.video_url.startsWith("bunny:") &&
      (!l.duration_seconds || l.duration_seconds === 0)
    );

    let updated = 0;
    await Promise.all(targets.map(async (l: any) => {
      const parts = l.video_url.split(":");
      const libraryId = parts[1];
      const videoId = parts[2];
      try {
        const res = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
          { headers: { AccessKey: BUNNY_API_KEY } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const length = Math.floor(Number(data.length) || 0);
        if (length > 0) {
          await admin.from("lessons").update({ duration_seconds: length }).eq("id", l.id);
          updated++;
        }
      } catch (e) {
        console.warn("Sync failed for lesson", l.id, e);
      }
    }));

    return new Response(JSON.stringify({ updated, scanned: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bunny-sync-durations error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
