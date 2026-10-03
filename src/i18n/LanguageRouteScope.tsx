import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import i18n, { isRtl, STORAGE_KEY, SUPPORTED_LANGUAGES, type Language } from "./index";
import { isLanguageTogglableRoute } from "./routeScope";
import {
  getMentorPublicLanguage,
  getMentorSlugForRoute,
  subscribeMentorPublicLanguage,
} from "./mentorPublicLanguage";

/**
 * Watches route changes and re-applies <html lang/dir> plus the active i18n
 * language so that:
 *   - Marketing / mentor dashboard / admin follow the visitor's own choice.
 *   - Mentor public pages force-apply the mentor's chosen public_language.
 *
 * The visitor's own preference is preserved: while on a mentor public page we
 * temporarily switch i18n.language, then restore the visitor's choice when
 * they leave.
 */
export function LanguageRouteScope() {
  const { pathname } = useLocation();
  const visitorPrefRef = useRef<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const chosen = (typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null) || i18n.language || "ar";

      let effective: string;
      if (isLanguageTogglableRoute(pathname)) {
        effective = chosen;
        // Visitor is back on their own surface — restore their preference.
        if (visitorPrefRef.current && i18n.language !== visitorPrefRef.current) {
          i18n.changeLanguage(visitorPrefRef.current);
          visitorPrefRef.current = null;
          return; // languageChanged handler in provider will re-apply <html>.
        }
        visitorPrefRef.current = null;
      } else {
        const slug = getMentorSlugForRoute(pathname);
        effective = getMentorPublicLanguage(slug) ?? "ar";
        // Remember the visitor's own choice before overriding.
        if (!visitorPrefRef.current) visitorPrefRef.current = chosen;
        if (
          SUPPORTED_LANGUAGES.includes(effective as Language) &&
          i18n.language !== effective
        ) {
          i18n.changeLanguage(effective);
          return;
        }
      }

      const rtl = isRtl(effective);
      document.documentElement.lang = effective;
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      document.documentElement.dataset.lang = effective;
    };
    apply();
    const unsub = subscribeMentorPublicLanguage(apply);
    return () => {
      unsub();
    };
  }, [pathname]);
  return null;
}
