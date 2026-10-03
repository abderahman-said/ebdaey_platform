import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "react-phone-number-input/style.css";
import "./i18n";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { registerPwa } from "./lib/registerPwa";
// Space Grotesk / DM Sans are only used on /about — imported lazily there
// to keep the main entry lean.

// Auto-recover from stale chunk errors after a redeploy (guard against reload loops)
const RELOAD_KEY = "__chunk_reload_ts";
const shouldReload = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
    if (Date.now() - last < 10000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
};
const isChunkError = (msg?: string) =>
  !!msg &&
  (msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed"));

window.addEventListener("vite:preloadError", () => {
  if (shouldReload()) window.location.reload();
});
window.addEventListener("error", (e) => {
  if (isChunkError(e.message) && shouldReload()) window.location.reload();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e.reason && (e.reason.message || String(e.reason))) || "";
  if (isChunkError(msg) && shouldReload()) window.location.reload();
});

const rootEl = document.getElementById("root")!;
const tree = (
  <HelmetProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </HelmetProvider>
);

// react-snap prerenders to static HTML at build time — hydrate instead of re-render
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, tree, {
    onRecoverableError(error) {
      if (import.meta.env.DEV) {
        console.warn("Hydration recoverable warning:", error);
      }
    },
  });
} else {
  createRoot(rootEl).render(tree);
}

registerPwa();
