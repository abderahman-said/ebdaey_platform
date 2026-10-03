import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  clearInFlight,
  getMentorPublicLanguage,
  getMentorSlugForRoute,
  markInFlight,
  setMentorPublicLanguage,
} from "@/i18n/mentorPublicLanguage";

/**
 * Watches the route and, whenever the user is on a mentor public page whose
 * slug hasn't been loaded yet, fetches that mentor's `public_language` from
 * the database and populates the module-level cache. The language layer then
 * re-applies <html lang/dir> and i18n language for that mentor.
 */
export function MentorPublicLanguageLoader() {
  const { pathname } = useLocation();

  useEffect(() => {
    const slug = getMentorSlugForRoute(pathname);
    if (!slug) return;
    if (getMentorPublicLanguage(slug)) return;
    if (!markInFlight(slug)) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("public_tenants")
          .select("public_language")
          .eq("slug", slug)
          .maybeSingle();
        if (cancelled) return;
        const lang = (data as any)?.public_language === "en" ? "en" : "ar";
        setMentorPublicLanguage(slug, lang);
      } finally {
        clearInFlight(slug);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
