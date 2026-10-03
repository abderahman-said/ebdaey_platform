/**
 * Single guarded registration point for the app-shell service worker.
 *
 * A service worker with a fetch handler is what makes Chrome/Edge offer the
 * native "Install app" dialog. It must NEVER register inside Lovable preview,
 * an iframe, or dev — those contexts would serve stale HTML.
 */
const SW_URL = "/sw.js";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    installPromptListeners.forEach((listener) => listener(deferredInstallPrompt));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installPromptListeners.forEach((listener) => listener(null));
  });
}

export const getInstallPrompt = () => deferredInstallPrompt;

export const subscribeToInstallPrompt = (
  listener: (prompt: BeforeInstallPromptEvent | null) => void,
) => {
  installPromptListeners.add(listener);
  listener(deferredInstallPrompt);
  return () => {
    installPromptListeners.delete(listener);
  };
};

export const clearInstallPrompt = () => {
  deferredInstallPrompt = null;
  installPromptListeners.forEach((listener) => listener(null));
};

const isBlockedHost = (host: string) =>
  host.startsWith("id-preview--") ||
  host.startsWith("preview--") ||
  host === "lovableproject.com" ||
  host.endsWith(".lovableproject.com") ||
  host === "lovableproject-dev.com" ||
  host.endsWith(".lovableproject-dev.com") ||
  host === "beta.lovable.dev" ||
  host.endsWith(".beta.lovable.dev");

const unregisterAppSw = async () => {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
};

export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const refused =
    !import.meta.env.PROD || inIframe || swOff || isBlockedHost(window.location.hostname);

  if (refused) {
    void unregisterAppSw();
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* installability is best-effort */
    });
  });
}
