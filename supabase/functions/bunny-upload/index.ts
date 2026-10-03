import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string || "video";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
    const type = (file.type || "").toLowerCase();
    if (!(type.startsWith("video/") || type.startsWith("audio/"))) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Create video in Bunny Stream library
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return new Response(JSON.stringify({ error: `Failed to create video: ${errBody}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    // Step 2: Upload the file to the created video
    const fileBuffer = await file.arrayBuffer();
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return new Response(JSON.stringify({ error: `Failed to upload video: ${errBody}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return the video ID and playback URL
    // Bunny Stream embed URL format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
    // HLS URL: https://vz-{pullzone}.b-cdn.net/{videoId}/playlist.m3u8
    const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;

    return new Response(JSON.stringify({
      success: true,
      videoId,
      embedUrl,
      libraryId: BUNNY_LIBRARY_ID,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bunny upload error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
