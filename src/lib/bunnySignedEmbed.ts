import { useEffect, useState } from "react";
import { parseBunnyUrl } from "@/lib/bunny";

/**
 * Signed Bunny embed URLs.
 *
 * Embed links are signed server-side (`bunny-sign-embed`) so that a copied
 * iframe URL stops working after the token expires instead of being replayable
 * forever. If signing is unavailable (no token key configured, offline, etc.)
 * we fall back to the plain embed so playback never breaks.
 */

type SignResult = { token: string; expires: number; streamUrl: string | null } | null;

const cache = new Map<string, { token: string; expires: number; streamUrl: string | null }>();
const inflight = new Map<string, Promise<SignResult>>();

const SAFETY_WINDOW = 60; // refresh a minute before the token dies

const requestSignature = async (bunnyUrl: string): Promise<SignResult> => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/bunny-sign-embed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token || anonKey}`,
      },
      body: JSON.stringify({ url: bunnyUrl }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.signed || !data.token || !data.expires) return null;
  return {
    token: data.token as string,
    expires: data.expires as number,
    streamUrl: typeof data.streamUrl === "string" ? data.streamUrl : null,
  };
};

/** Get a cached or fresh signature for a `bunny:{lib}:{id}` URL. */
export const getBunnyEmbedSignature = async (bunnyUrl: string): Promise<SignResult> => {
  const now = Math.floor(Date.now() / 1000);
  const cached = cache.get(bunnyUrl);
  if (cached && cached.expires - SAFETY_WINDOW > now) return cached;

  const existing = inflight.get(bunnyUrl);
  if (existing) return existing;

  const promise = requestSignature(bunnyUrl)
    .catch((e) => {
      console.warn("[bunnySignedEmbed] signing failed (falling back):", e);
      return null;
    })
    .then((result) => {
      if (result) cache.set(bunnyUrl, result);
      inflight.delete(bunnyUrl);
      return result;
    });
  inflight.set(bunnyUrl, promise);
  return promise;
};

/** Build the final embed URL, appending `token`/`expires` when available. */
export const buildBunnyEmbedUrl = (
  bunnyUrl: string,
  params: Record<string, string> = {},
  signature?: SignResult
): string | null => {
  const parsed = parseBunnyUrl(bunnyUrl);
  if (!parsed) return null;
  const qs = new URLSearchParams({
    preload: "true",
    responsive: "true",
    ...params,
  });
  if (signature) {
    qs.set("token", signature.token);
    qs.set("expires", String(signature.expires));
  }
  return `https://iframe.mediadelivery.net/embed/${parsed.libraryId}/${parsed.videoId}?${qs.toString()}`;
};

/**
 * React hook: returns the embed URL for a Bunny video, signed when possible.
 * `ready` is false only while the first signing attempt is in flight.
 */
export const useSignedBunnyEmbedUrl = (
  bunnyUrl: string | null | undefined,
  params: Record<string, string> = {}
): { url: string | null; ready: boolean } => {
  const paramsKey = JSON.stringify(params);
  const [signature, setSignature] = useState<SignResult>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!bunnyUrl || !parseBunnyUrl(bunnyUrl)) {
      setSignature(null);
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    getBunnyEmbedSignature(bunnyUrl).then((sig) => {
      if (!active) return;
      setSignature(sig);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [bunnyUrl]);

  const url = bunnyUrl && ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ? buildBunnyEmbedUrl(bunnyUrl, JSON.parse(paramsKey), signature)
    : null;

  return { url, ready };
};

/** Returns the direct HLS stream discovered server-side for the current Bunny library. */
export const useBunnyStreamUrl = (
  bunnyUrl: string | null | undefined,
): { url: string | null; ready: boolean } => {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!bunnyUrl || !parseBunnyUrl(bunnyUrl)) {
      setUrl(null);
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    getBunnyEmbedSignature(bunnyUrl).then((signature) => {
      if (!active) return;
      setUrl(signature?.streamUrl ?? null);
      setReady(true);
    });
    return () => { active = false; };
  }, [bunnyUrl]);

  return { url, ready };
};
