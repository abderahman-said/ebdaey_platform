import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Signs Bunny Stream embed URLs so copied links expire and can't be replayed.
// Returns { signed: false } when no token key is configured, so the player
// falls back to the unsigned embed instead of breaking playback.

const DEFAULT_TTL_SECONDS = 60 * 60 * 4; // 4 hours — long enough for a lesson
const MAX_TTL_SECONDS = 60 * 60 * 12;
const ANON_TTL_SECONDS = 60 * 15; // public previews / promo videos

// libraryId -> token auth key (module cache, per cold start)
const keyCache = new Map<string, string | null>();

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const getTokenKeyCandidates = async (libraryId: string): Promise<string[]> => {
  const cached = keyCache.get(libraryId);
  if (cached) return [cached];

  const candidates = [
    Deno.env.get(`BUNNY_API_KEY_${libraryId}`),
    Deno.env.get("BUNNY_API_KEY"),
    Deno.env.get(`BUNNY_TOKEN_AUTH_KEY_${libraryId}`),
    Deno.env.get("BUNNY_TOKEN_AUTH_KEY"),
  ].filter((value): value is string => Boolean(value));

  // Some Bunny accounts expose a distinct token key in the library settings.
  const accountKey = Deno.env.get("BUNNY_ACCOUNT_KEY");
  if (accountKey) {
    try {
      const res = await fetch(`https://api.bunny.net/videolibrary/${libraryId}`, {
        headers: { AccessKey: accountKey, accept: "application/json" },
      });
      if (res.ok) {
        const lib = await res.json();
        const key =
          lib?.TokenAuthenticationKey ||
          lib?.tokenAuthenticationKey ||
          null;
        if (key) candidates.push(key);
        console.warn("[bunny-sign-embed] library has no token authentication key", libraryId);
      } else {
        console.warn("[bunny-sign-embed] videolibrary lookup failed", libraryId, res.status);
      }
    } catch (e) {
      console.warn("[bunny-sign-embed] videolibrary lookup error", String(e));
    }
  }

  return [...new Set(candidates)];
};

const signWithWorkingKey = async (
  libraryId: string,
  videoId: string,
  expires: number,
): Promise<string | null> => {
  const candidates = await getTokenKeyCandidates(libraryId);
  for (const key of candidates) {
    const token = await sha256Hex(`${key}${videoId}${expires}`);
    try {
      const probe = await fetch(
        `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`,
        { headers: { Referer: "https://ebdaey.com/" } },
      );
      const html = await probe.text();
      if (probe.ok && !/<title>\s*403\s*<\/title>/i.test(html)) {
        keyCache.set(libraryId, key);
        return token;
      }
    } catch (error) {
      console.warn("[bunny-sign-embed] token validation failed", String(error));
    }
  }
  keyCache.set(libraryId, null);
  return null;
};

// Only sign videos the caller may actually watch.
const checkAccess = async (libraryId: string, videoId: string, userId: string | null): Promise<boolean> => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stored = `bunny:${libraryId}:${videoId}`;

  // Public promo banners.
  const banners = await Promise.all([
    admin.from("courses").select("id").eq("banner_video_url", stored).limit(1),
    admin.from("live_courses").select("id").eq("banner_video_url", stored).limit(1),
    admin.from("digital_products").select("id").eq("banner_video_url", stored).limit(1),
  ]);
  if (banners.some((r) => (r.data || []).length > 0)) return true;

  const { data: lessons } = await admin
    .from("lessons")
    .select("id, tenant_id, is_preview, section_id")
    .or(`video_url.eq.${stored},audio_url.eq.${stored}`)
    .limit(50);

  if (!lessons || lessons.length === 0) {
    // Not attached to any lesson yet (e.g. a mentor previewing a fresh upload):
    // only the mentor who owns the upload (or an admin) may sign it.
    if (!userId) return false;
    const { callerOwnsBunnyVideo } = await import("../_shared/bunny-ownership.ts");
    return await callerOwnsBunnyVideo(userId, videoId);
  }
  if (lessons.some((l: any) => l.is_preview)) return true;
  if (!userId) return false;

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if ((roles || []).some((r: any) => r.role === "admin")) return true;

  const tenantIds = [...new Set(lessons.map((l: any) => l.tenant_id).filter(Boolean))];
  if (tenantIds.length) {
    const { data: owned } = await admin.from("tenants").select("id").in("id", tenantIds).eq("owner_id", userId).limit(1);
    if ((owned || []).length) return true;
  }

  const sectionIds = [...new Set(lessons.map((l: any) => l.section_id).filter(Boolean))];
  if (!sectionIds.length) return false;
  const { data: sections } = await admin.from("course_sections").select("course_id").in("id", sectionIds);
  const courseIds = [...new Set((sections || []).map((s: any) => s.course_id).filter(Boolean))];
  if (!courseIds.length) return false;
  const { data: students } = await admin.from("students").select("id").eq("user_id", userId);
  const studentIds = (students || []).map((s: any) => s.id);
  if (!studentIds.length) return false;
  const { data: enr } = await admin.from("enrollments").select("id")
    .in("student_id", studentIds).in("course_id", courseIds).limit(1);
  return (enr || []).length > 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Resolve the caller (optional — public promo videos are allowed anonymously).
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData } = await supabase.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      const sub = claimsData?.claims?.sub;
      userId = typeof sub === "string" && claimsData?.claims?.role === "authenticated" ? sub : null;
    }
    const authenticated = !!userId;

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const raw = typeof body.url === "string" ? body.url : "";
    let libraryId = typeof body.libraryId === "string" ? body.libraryId : "";
    let videoId = typeof body.videoId === "string" ? body.videoId : "";

    if (raw.startsWith("bunny:")) {
      const parts = raw.split(":");
      if (parts.length === 3) {
        libraryId = parts[1];
        videoId = parts[2];
      }
    }

    if (!/^\d+$/.test(libraryId) || !/^[a-zA-Z0-9-]{8,64}$/.test(videoId)) {
      return json({ error: "libraryId and videoId are required" }, 400);
    }

    const access = await checkAccess(libraryId, videoId, userId);
    if (!access) return json({ error: "Forbidden" }, 403);

    const cap = authenticated ? MAX_TTL_SECONDS : ANON_TTL_SECONDS;
    const ttlRaw = Number(body.ttlSeconds);
    const ttl = Number.isFinite(ttlRaw) && ttlRaw > 0
      ? Math.min(Math.floor(ttlRaw), cap)
      : Math.min(DEFAULT_TTL_SECONDS, cap);

    const expires = Math.floor(Date.now() / 1000) + ttl;
    const token = await signWithWorkingKey(libraryId, videoId, expires);
    if (!token) {
      return json({ signed: false, reason: "no_valid_token_key" });
    }

    const cdnHost = (Deno.env.get("BUNNY_CDN_HOST") || Deno.env.get("BUNNY_CDN_HOSTNAME"))
      ?.replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    return json({
      signed: true,
      token,
      expires,
      libraryId,
      videoId,
      streamUrl: cdnHost ? `https://${cdnHost}/${videoId}/playlist.m3u8` : null,
    });
  } catch (e) {
    console.error("[bunny-sign-embed] error", e);
    return json({ error: "Internal error" }, 500);
  }
});
