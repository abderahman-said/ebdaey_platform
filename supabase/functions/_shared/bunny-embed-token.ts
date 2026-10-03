// Signs Bunny Stream embed URLs for server-side use.
// Bunny's "Embed view token authentication" rejects unsigned embed pages,
// so internal jobs (transcription, thumbnails) must sign them too.

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const getBunnyEmbedKey = (libraryId: string): string | null =>
  Deno.env.get(`BUNNY_API_KEY_${libraryId}`) ||
  Deno.env.get("BUNNY_API_KEY") ||
  null;

const getBunnyCdnTokenKey = (libraryId: string): string | null =>
  Deno.env.get(`BUNNY_TOKEN_AUTH_KEY_${libraryId}`) ||
  Deno.env.get("BUNNY_TOKEN_AUTH_KEY") ||
  null;

/** Returns "token=..&expires=.." or "" when no key is configured. */
export const bunnyEmbedTokenQuery = async (
  libraryId: string,
  videoId: string,
  ttlSeconds = 60 * 30,
): Promise<string> => {
  const key = getBunnyEmbedKey(libraryId);
  if (!key) return "";
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = await sha256Hex(`${key}${videoId}${expires}`);
  return `token=${token}&expires=${expires}`;
};

/** Appends a signed token to an embed URL (no-op without a key). */
export const signBunnyEmbedUrl = async (
  url: string,
  libraryId: string,
  videoId: string,
  ttlSeconds = 60 * 30,
): Promise<string> => {
  const qs = await bunnyEmbedTokenQuery(libraryId, videoId, ttlSeconds);
  if (!qs) return url;
  return url + (url.includes("?") ? "&" : "?") + qs;
};

const base64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/**
 * Signs a Bunny CDN file URL (playlist, segment, key, mp4) for "CDN token
 * authentication". Path-scoped: hash = SHA256(key + path + expires).
 * No-op when no token key is configured.
 */
export const signBunnyCdnUrl = async (
  url: string,
  libraryId?: string,
  ttlSeconds = 60 * 60,
): Promise<string> => {
  const key = getBunnyCdnTokenKey(libraryId ?? "");
  if (!key) return url;
  const u = new URL(url);
  u.searchParams.delete("token");
  u.searchParams.delete("expires");
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${key}${u.pathname}${expires}`),
  );
  u.searchParams.set("token", base64Url(new Uint8Array(digest)));
  u.searchParams.set("expires", String(expires));
  return u.toString();
};

/** fetch() that signs Bunny CDN file URLs first. */
export const fetchBunnyCdn = async (
  url: string,
  init?: RequestInit,
  libraryId?: string,
): Promise<Response> => fetch(await signBunnyCdnUrl(url, libraryId), init);
