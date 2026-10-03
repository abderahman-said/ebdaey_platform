import { createClient } from "npm:@supabase/supabase-js@2";
import { requireRole } from "../_shared/require-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only the owning mentor (or an admin / internal service call) may trigger
    // a migration — it downloads and re-uploads video at real cost.
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID || !SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return new Response(JSON.stringify({ error: "Missing credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { lesson_id, course_id, field } = await req.json();

    let videoUrl: string | null = null;
    let title = "video";
    let updateTable = "";
    let updateId = "";

    // Resolve the caller's permissions once (service role / admin skip checks).
    const isService = auth.user?.id === "service_role";
    let isAdmin = false;
    let callerTenantId: string | null = null;
    if (!isService) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", auth.user!.id);
      isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin");
      const { data: tn } = await supabase
        .from("tenants").select("id").eq("owner_id", auth.user!.id).maybeSingle();
      callerTenantId = (tn as any)?.id ?? null;
    }
    const mayTouchTenant = (tenantId: string | null | undefined) =>
      isService || isAdmin || (!!tenantId && tenantId === callerTenantId);
    const forbidden = () =>
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (lesson_id) {
      const { data: lesson, error: lessonErr } = await supabase
        .from("lessons")
        .select("id, title, video_url, course_sections!inner(courses!inner(tenant_id))")
        .eq("id", lesson_id)
        .single();
      if (lessonErr || !lesson) {
        return new Response(JSON.stringify({ error: "Lesson not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const lessonTenantId =
        (lesson as any)?.course_sections?.courses?.tenant_id ?? null;
      if (!mayTouchTenant(lessonTenantId)) return forbidden();
      videoUrl = lesson.video_url;
      title = lesson.title || "video";
      updateTable = "lessons";
      updateId = lesson_id;
    } else if (course_id && field === "banner_video_url") {
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("id, title, banner_video_url, tenant_id")
        .eq("id", course_id)
        .single();
      if (courseErr || !course) {
        return new Response(JSON.stringify({ error: "Course not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!mayTouchTenant((course as any).tenant_id)) return forbidden();
      videoUrl = course.banner_video_url;
      title = `banner-${course.title}`;
      updateTable = "courses";
      updateId = course_id;
    } else {
      return new Response(JSON.stringify({ error: "lesson_id or course_id+field required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!videoUrl || videoUrl.startsWith("bunny:")) {
      return new Response(
        JSON.stringify({ message: "Already on Bunny or no video", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Migrating ${updateTable} ${updateId}: ${title}`);

    // Step 1: Download the video
    console.log(`Downloading from: ${videoUrl}`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download video: ${videoRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoBuffer = await videoRes.arrayBuffer();
    console.log(`Downloaded ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);

    // Step 2: Create video entry in Bunny
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title }),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to create Bunny video: ${errBody}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;
    console.log(`Created Bunny video: ${videoId}`);

    // Step 3: Upload to Bunny
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: videoBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to upload to Bunny: ${errBody}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploaded to Bunny successfully`);

    // Step 4: Update the record
    const bunnyUrl = `bunny:${BUNNY_LIBRARY_ID}:${videoId}`;
    const updateData = updateTable === "lessons"
      ? { video_url: bunnyUrl }
      : { banner_video_url: bunnyUrl };

    const { error: updateErr } = await supabase
      .from(updateTable)
      .update(updateData)
      .eq("id", updateId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: `Failed to update ${updateTable}: ${updateErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${updateTable} updated to: ${bunnyUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        id: updateId,
        table: updateTable,
        old_url: videoUrl,
        new_url: bunnyUrl,
        videoId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
