/**
 * Dynamic web app manifest injection (manifest-only PWA / installability).
 *
 * Two installable app identities:
 *   - Mentor app  → app.ebdaey.com (or /app in dev), Ebdaey branding
 *   - Student app → <mentor>.ebdaey.com, mentor branding (name + avatar)
 *
 * No service worker is registered — this is installability metadata only.
 */

import { getAppDisplayName, setAppDisplayName } from "./appIdentity";

export interface PwaManifestOptions {
  name: string;
  shortName: string;
  /** Absolute or root-relative icon URL (png preferred). Must be square. */
  icon?: string | null;
  /** Square icon with safe-zone padding, used for Android maskable icons. */
  maskableIcon?: string | null;
  themeColor?: string;
  backgroundColor?: string;
  /** Root-relative start path, e.g. "/dashboard". */
  startPath: string;
  dir?: "rtl" | "ltr";
  lang?: string;
}

const FALLBACK_ICONS = [
  { src: "/android-chrome-192x192.png?v=green-2", sizes: "192x192", type: "image/png" },
  { src: "/android-chrome-512x512.png?v=green-2", sizes: "512x512", type: "image/png" },
];

const abs = (url: string) => new URL(url, window.location.origin).href;

let currentBlobUrl: string | null = null;

const setMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
};

const setAppleIcon = (href: string) => {
  let el = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!el) {
    el = document.createElement("link");
    el.rel = "apple-touch-icon";
    document.head.appendChild(el);
  }
  el.href = href;
};

/**
 * Injects a manifest for the current app identity.
 * Returns a cleanup function that restores the platform default manifest.
 */
export function applyPwaManifest(options: PwaManifestOptions): () => void {
  if (typeof window === "undefined") return () => {};

  const manifestLink =
    document.querySelector<HTMLLinkElement>("link[rel='manifest']") ??
    (() => {
      const link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
      return link;
    })();

  const previousHref = manifestLink.getAttribute("href") || "/site.webmanifest?v=green-2";
  const previousAppleIcon =
    document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")?.getAttribute("href") ||
    "/apple-touch-icon.png?v=green-2";
  const previousTheme =
    document.querySelector<HTMLMetaElement>("meta[name='theme-color']")?.content || "#00d655";
  const previousApplicationName =
    document.querySelector<HTMLMetaElement>("meta[name='application-name']")?.content || "إبداعي";
  const previousAppleTitle =
    document.querySelector<HTMLMetaElement>("meta[name='apple-mobile-web-app-title']")?.content || "إبداعي";
  const previousDisplayName = getAppDisplayName();


  // Always keep at least one real fetchable PNG icon in the list: some mobile
  // browsers refuse to offer installation when every icon is a data: URL.
  const fallbackIcons = FALLBACK_ICONS.map((i) => ({ ...i, src: abs(i.src) }));
  const icons = options.icon
    ? [
        { src: abs(options.icon), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: abs(options.icon), sizes: "512x512", type: "image/png", purpose: "any" },
        ...(options.maskableIcon
          ? [{ src: abs(options.maskableIcon), sizes: "512x512", type: "image/png", purpose: "maskable" }]
          : []),
        ...fallbackIcons,
      ]
    : fallbackIcons;


  const manifest = {
    name: options.name,
    short_name: options.shortName.slice(0, 12),
    id: abs(options.startPath),
    start_url: abs(options.startPath),
    scope: abs("/"),
    display: "standalone",
    orientation: "portrait",
    theme_color: options.themeColor || "#00d655",
    background_color: options.backgroundColor || "#ffffff",
    dir: options.dir || "rtl",
    lang: options.lang || "ar",
    icons,
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
  currentBlobUrl = URL.createObjectURL(blob);
  manifestLink.setAttribute("href", currentBlobUrl);

  const appleIcon = options.icon ? abs(options.icon) : abs("/apple-touch-icon.png?v=green-2");
  setAppleIcon(appleIcon);
  setMeta("theme-color", manifest.theme_color);
  setMeta("application-name", manifest.short_name);
  setMeta("apple-mobile-web-app-capable", "yes");
  setMeta("apple-mobile-web-app-title", manifest.short_name);
  setMeta("apple-mobile-web-app-status-bar-style", "default");

  // Keep every install prompt in the UI on the same name the visitor sees.
  setAppDisplayName(options.name);

  return () => {
    manifestLink.setAttribute("href", previousHref);
    setAppleIcon(previousAppleIcon);
    setMeta("theme-color", previousTheme);
    setMeta("application-name", previousApplicationName);
    setMeta("apple-mobile-web-app-title", previousAppleTitle);
    setAppDisplayName(previousDisplayName);
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
  };
}

/** True when the page is already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
}

/** True on phones/tablets, where a manual "add to home screen" path always exists. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return isIos() || /Android|Mobile|IEMobile|Opera Mini/i.test(ua);
}

/**
 * Renders any source image into square PNG data URLs so home-screen icons are
 * never stretched: the image is center-cropped ("cover") into a square canvas,
 * plus a padded variant for Android's maskable safe zone.
 */

export async function buildSquareIcons(
  src: string,
  backgroundColor = "#ffffff",
): Promise<{ icon: string; maskableIcon: string } | null> {
  if (typeof window === "undefined" || !src) return null;

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = src;
  });
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const render = (size: number, inset: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    const box = size - inset * 2;
    // "cover" crop: fill the box without distorting the aspect ratio.
    const scale = Math.max(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, inset + (box - w) / 2, inset + (box - h) / 2, w, h);
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const icon = render(512, 0);
  // Android masks the outer ~10% of the icon, so keep content inside the safe zone.
  const maskableIcon = render(512, 56);
  if (!icon) return null;
  return { icon, maskableIcon: maskableIcon || icon };
}
