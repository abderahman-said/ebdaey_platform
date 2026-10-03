import { useEffect } from "react";
import { applyPwaManifest, buildSquareIcons, type PwaManifestOptions } from "@/lib/pwaManifest";

/** Converts an HSL token like "142 70% 45%" to a hex color for theme_color. */
export function hslTokenToHex(token?: string | null): string | undefined {
  if (!token) return undefined;
  const m = token.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return token.startsWith("#") ? token : undefined;
  const h = Number(m[1]) / 360;
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Applies an installable app identity (manifest + icons + theme color) while
 * the calling screen is mounted, and restores platform defaults on unmount.
 */
export function usePwaManifest(options: PwaManifestOptions | null) {
  const key = options ? JSON.stringify(options) : null;

  useEffect(() => {
    if (!key) return;
    const opts = JSON.parse(key) as PwaManifestOptions;
    let cleanup = applyPwaManifest(opts);
    let cancelled = false;

    // Normalize the source image into square icons so the installed app icon
    // is never stretched on the home screen.
    if (opts.icon) {
      buildSquareIcons(opts.icon, opts.backgroundColor || "#ffffff").then((squared) => {
        if (cancelled || !squared) return;
        cleanup();
        cleanup = applyPwaManifest({ ...opts, ...squared });
      });
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [key]);
}
