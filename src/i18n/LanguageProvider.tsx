import { useEffect } from "react";
import i18n, { isRtl, STORAGE_KEY, EXPLICIT_KEY, isArabCountry, detectDefaultLanguage } from "./index";
import { isLanguageTogglableRoute } from "./routeScope";
import { getSubdomainInfo } from "@/lib/subdomain";
import {
  getMentorPublicLanguage,
  getMentorSlugForRoute,
  subscribeMentorPublicLanguage,
} from "./mentorPublicLanguage";

/**
 * Applies <html dir> and <html lang> to match the effective language.
 *
 * - On operator surfaces (marketing, mentor auth/dashboard, admin) the visitor
 *   picks the language via LanguageSwitcher — respected here.
 * - On a mentor's public storefront the mentor's Site Settings choice takes
 *   over; the visitor cannot switch it.
 *
 * This provider handles the initial paint. Route-driven re-application lives
 * in <LanguageRouteScope /> inside the Router.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = (chosen: string) => {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
      let effective = chosen;
      if (!isLanguageTogglableRoute(pathname)) {
        const slug = getMentorSlugForRoute(pathname);
        effective = getMentorPublicLanguage(slug) ?? "ar";
      }
      const rtl = isRtl(effective);
      document.documentElement.lang = effective;
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      document.documentElement.dataset.lang = effective;
    };
    // Visitors who never manually picked a language (and have no ?lang=) get
    // a geo-based default: Arabic inside Arab countries, English elsewhere.
    // Country comes from the network (Cloudflare trace → real IP / VPN),
    // falling back to browser region/timezone.
    const hasExplicitChoice = (() => {
      try {
        if (window.localStorage.getItem(EXPLICIT_KEY)) return true;
        return new URLSearchParams(window.location.search).has("lang");
      } catch {
        return false;
      }
    })();
    // Geo default only applies to marketing pages for human visitors.
    // Crawlers, bots, and Lighthouse should never be flipped dynamically.
    const isCrawler =
      typeof navigator !== "undefined" &&
      /bot|googlebot|crawler|spider|robot|crawling|lighthouse|pagespeed|pingdom/i.test(navigator.userAgent);
    const path = window.location.pathname;
    const geoEligible =
      !isCrawler &&
      isLanguageTogglableRoute(path) &&
      getSubdomainInfo().context !== "mentor-app" &&
      path !== "/app" &&
      !path.startsWith("/app/");
    if (!hasExplicitChoice && geoEligible) {
      // Instant guess from browser region/timezone; the network lookup below
      // refines it (and wins when it succeeds).
      const fallback = detectDefaultLanguage();
      if (i18n.language !== fallback) i18n.changeLanguage(fallback);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      fetch("/cdn-cgi/trace", { signal: ctrl.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((txt) => {
          const loc = /^loc=([A-Z]{2})$/m.exec(txt)?.[1];
          if (!loc) return;
          const lang = isArabCountry(loc) ? "ar" : "en";
          try {
            if (window.localStorage.getItem(EXPLICIT_KEY)) return;
          } catch { /* ignore */ }
          // Visitor may have navigated off marketing pages meanwhile.
          const now = window.location.pathname;
          if (!isLanguageTogglableRoute(now) || now === "/app" || now.startsWith("/app/")) return;
          if (i18n.language !== lang) i18n.changeLanguage(lang);
        })
        .catch(() => {})
        .finally(() => clearTimeout(timer));
    }
    apply(i18n.language || "ar");
    const handler = (lng: string) => apply(lng);
    i18n.on("languageChanged", handler);
    const unsub = subscribeMentorPublicLanguage(() => apply(i18n.language || "ar"));
    return () => {
      i18n.off("languageChanged", handler);
      unsub();
    };
  }, []);
  return <>{children}</>;
}

// Re-export the storage key so route-scope can read the visitor's own choice.
export { STORAGE_KEY };
