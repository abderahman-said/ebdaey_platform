import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { signBunnyEmbedUrl, fetchBunnyCdn } from "../_shared/bunny-embed-token.ts";

// Module-level cache: CDN host is stable per library — discover once per cold start.
let cachedCdnHost: string | null = null;

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

    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");
    const mode = url.searchParams.get("mode");

    if (!videoId || !/^[a-zA-Z0-9-]{8,64}$/.test(videoId)) {
      return new Response(JSON.stringify({ error: "videoId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { callerOwnsBunnyVideo } = await import("../_shared/bunny-ownership.ts");
    if (!(await callerOwnsBunnyVideo(auth.user!.id, videoId))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Get video info from Bunny API
    const res = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      { headers: { AccessKey: BUNNY_API_KEY } }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("Bunny video lookup failed:", res.status, errBody);
      // Return graceful fallback so client UI shows placeholder instead of crashing.
      // Common cause: video belongs to a previous library (credentials rotated).
      return new Response(
        JSON.stringify({ fallback: true, notFound: true, status: res.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();

    if (mode === "thumbnail") {
      const guid = data.guid;
      const thumbFile = data.thumbnailFileName || "thumbnail.jpg";

      // Always use a referer that is whitelisted in Bunny's allowed-referrers list.
      // The caller's origin (preview hosts, custom mentor domains) is not guaranteed
      // to be whitelisted, which made Bunny reject the thumbnail fetch.
      const origin = "https://ebdaey.com";

      // Step 1: Resolve the CDN hostname (cached across invocations).
      let cdnHost = cachedCdnHost;
      if (!cdnHost) {
        try {
          const embedRes = await fetch(
            await signBunnyEmbedUrl(
              `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${guid}`,
              BUNNY_LIBRARY_ID,
              guid,
            ),
            { headers: { Referer: origin, Accept: "text/html" } }
          );
          if (embedRes.ok) {
            const html = await embedRes.text();
            const cdnMatch = html.match(/https:\/\/(vz-[^/]+\.b-cdn\.net)\//);
            if (cdnMatch) {
              cdnHost = cdnMatch[1];
              cachedCdnHost = cdnHost;
            }
          }
        } catch (e) {
          console.error("Embed fetch error:", e);
        }
      }

      if (!cdnHost) {
        cdnHost = (Deno.env.get("BUNNY_CDN_HOSTNAME") || Deno.env.get("BUNNY_CDN_HOST"))
          ?.replace(/^https?:\/\//, "")
          .replace(/\/$/, "") || "vz-5bdbf08e-f40.b-cdn.net";
      }
      // Step 2: Fetch the thumbnail image directly from the CDN.
      if (cdnHost) {
        try {
          let thumbRes = await fetchBunnyCdn(
            `https://${cdnHost}/${guid}/${thumbFile}`,
            { headers: { Referer: origin } },
            BUNNY_LIBRARY_ID,
          );
          if (!thumbRes.ok) {
            console.warn("[bunny-status] signed thumb failed", thumbRes.status, "retrying unsigned");
            thumbRes = await fetch(`https://${cdnHost}/${guid}/${thumbFile}`, { headers: { Referer: origin } });
          }
          if (thumbRes.ok) {
            const ct = thumbRes.headers.get("Content-Type") || "image/jpeg";
            if (ct.startsWith("image/")) {
              const imageData = await thumbRes.arrayBuffer();
              if (imageData.byteLength > 500) {
                return new Response(imageData, {
                  status: 200,
                  headers: { ...corsHeaders, "Content-Type": ct, "Cache-Control": "public, max-age=86400" },
                });
              }
            }
          }
        } catch (e) {
          console.error("Thumbnail fetch error:", e);
        }
      }

      // Fallback
      return new Response(JSON.stringify({ 
        fallback: true,
        status: data.status,
        encodeProgress: data.encodeProgress,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard status response
    const projectUrl = Deno.env.get("SUPABASE_URL") || "";

    return new Response(JSON.stringify({
      videoId: data.guid,
      status: data.status,
      encodeProgress: data.encodeProgress,
      length: data.length,
      thumbnailUrl: `${projectUrl}/functions/v1/bunny-status?videoId=${data.guid}&mode=thumbnail`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bunny status error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
