import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");
    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return new Response(JSON.stringify({ error: "Bunny.net credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requireRole } = await import("../_shared/require-role.ts");
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title } = await req.json();

    // Create video entry in Bunny Stream (lightweight, no file data)
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title || "video" }),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return new Response(JSON.stringify({ error: `Failed to create video: ${errBody}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoData = await createRes.json();
    try {
      const { recordBunnyVideoOwner } = await import("../_shared/bunny-ownership.ts");
      await recordBunnyVideoOwner(auth.user!.id, String(videoData.guid), String(BUNNY_LIBRARY_ID));
    } catch (e) { console.error("record owner failed", e); }

    // If file data is provided via the request body as base64 or via a subsequent PUT,
    // we handle the upload server-side so the API key never leaves the server.

    return new Response(JSON.stringify({
      success: true,
      videoId: videoData.guid,
      libraryId: BUNNY_LIBRARY_ID,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bunny create-video error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
