import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
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

    // Get videoId from URL search params
    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");
    if (!videoId || !/^[a-f0-9-]+$/i.test(videoId)) {
      return new Response(JSON.stringify({ error: "Invalid videoId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Size limit (Content-Length required).
    const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
    const len = Number(req.headers.get("content-length") || "0");
    if (!Number.isFinite(len) || len <= 0 || len > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large or missing size" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (!(ct.startsWith("video/") || ct.startsWith("audio/") || ct === "application/octet-stream")) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { callerOwnsBunnyVideo } = await import("../_shared/bunny-ownership.ts");
    if (!(await callerOwnsBunnyVideo(auth.user!.id, videoId))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Only fresh, still-empty video slots (just created via bunny-create-video)
    // may receive an upload — existing videos can never be overwritten.
    const infoRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      { headers: { AccessKey: BUNNY_API_KEY } },
    );
    if (!infoRes.ok) {
      return new Response(JSON.stringify({ error: "Video not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const info = await infoRes.json();
    const createdAt = Date.parse(info?.dateUploaded || "");
    const fresh = Number.isFinite(createdAt) && Date.now() - createdAt < 24 * 3600 * 1000;
    if (Number(info?.status) !== 0 || Number(info?.storageSize || 0) > 0 || !fresh) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the request body directly to Bunny
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: req.body,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return new Response(JSON.stringify({ error: `Upload failed: ${errBody}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bunny upload-chunk error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
