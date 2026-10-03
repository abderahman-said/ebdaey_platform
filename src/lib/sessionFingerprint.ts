/**
 * Stable, short session fingerprint used in content watermarks.
 * Persisted per browser tab session so a leaked recording can be traced
 * back to a specific viewing session (not just a specific account).
 */
const STORAGE_KEY = "ebdaey_session_fp";

function hash32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

export function getSessionFingerprint(seed?: string | null): string {
  const seedKey = hash32(seed || "anon");
  const storageKey = `${STORAGE_KEY}_${seedKey}`;

  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(storageKey);
  } catch {
    stored = null;
  }

  if (!stored) {
    const parts = [
      seed || "anon",
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
      typeof navigator !== "undefined" ? navigator.userAgent.length.toString(36) : "0",
      typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "0",
      new Date().getTimezoneOffset().toString(),
    ].join("|");
    stored = hash32(parts);
    try {
      // Drop fingerprints belonging to previously signed-in accounts in this tab
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(`${STORAGE_KEY}`) && k !== storageKey) {
          sessionStorage.removeItem(k);
        }
      }
      sessionStorage.setItem(storageKey, stored);
    } catch {
      /* ignore */
    }
  }

  return stored;
}

