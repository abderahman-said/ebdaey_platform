/**
 * Parse a Bunny.net Stream URL stored in the format: bunny:{libraryId}:{videoId}
 */
export const parseBunnyUrl = (url: string): { libraryId: string; videoId: string } | null => {
  if (!url.startsWith("bunny:")) return null;
  const parts = url.split(":");
  if (parts.length !== 3) return null;
  return { libraryId: parts[1], videoId: parts[2] };
};

/**
 * Check if a URL is a Bunny.net Stream URL
 */
export const isBunnyUrl = (url: string): boolean => {
  return url.startsWith("bunny:");
};

/**
 * Get the Bunny.net embed URL from a stored bunny URL
 */
export const getBunnyEmbedUrl = (url: string): string | null => {
  const parsed = parseBunnyUrl(url);
  if (!parsed) return null;
  return `https://iframe.mediadelivery.net/embed/${parsed.libraryId}/${parsed.videoId}?autoplay=false&preload=true&responsive=true`;
};

/**
 * Delete a Bunny.net video via the bunny-delete edge function.
 * Accepts a single `bunny:{lib}:{id}` URL or an array of them.
 * Failures are logged but never thrown — deletion of orphan video files
 * must NEVER block a user's primary action (lesson/course delete, video replace).
 */
export const deleteBunnyVideo = async (
  urlOrUrls: string | string[] | null | undefined
): Promise<void> => {
  try {
    const list = Array.isArray(urlOrUrls) ? urlOrUrls : urlOrUrls ? [urlOrUrls] : [];
    const bunnyUrls = list.filter((u): u is string => !!u && isBunnyUrl(u));
    if (bunnyUrls.length === 0) return;

    // Lazy-import to avoid circular deps in tests
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[deleteBunnyVideo] No session — skipping Bunny cleanup");
      return;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/bunny-delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bunnyUrls.length === 1 ? { url: bunnyUrls[0] } : { urls: bunnyUrls }),
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[deleteBunnyVideo] non-OK response:", res.status, txt);
    }
  } catch (e) {
    console.warn("[deleteBunnyVideo] failed (non-blocking):", e);
  }
};
