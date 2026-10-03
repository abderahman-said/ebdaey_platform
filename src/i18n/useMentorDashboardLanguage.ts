import { useEffect, useRef } from "react";
import i18n, { STORAGE_KEY, SUPPORTED_LANGUAGES, type Language } from "./index";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persists a mentor's dashboard language preference server-side on the
 * tenants row so it follows them across devices and sessions.
 *
 * - On mount (once tenantId is known), reads `dashboard_language` and applies
 *   it to i18n if it differs from the currently active language.
 * - Then, any language change performed while the mentor is on their
 *   dashboard is written back to the tenants row.
 */
export function useMentorDashboardLanguage(tenantId: string | null) {
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("dashboard_language")
        .eq("id", tenantId)
        .maybeSingle();
      if (cancelled) return;
      const saved = (data as any)?.dashboard_language;
      const lang: Language = saved === "en" ? "en" : "ar";
      appliedRef.current = lang;
      if (i18n.language !== lang) {
        try {
          window.localStorage.setItem(STORAGE_KEY, lang);
          window.localStorage.setItem("ebdaey_lang_explicit", "1");
        } catch {
          /* ignore */
        }
        i18n.changeLanguage(lang);
      }
    })();

    const handler = (lng: string) => {
      const normalized: Language = lng?.startsWith("en") ? "en" : "ar";
      if (!SUPPORTED_LANGUAGES.includes(normalized)) return;
      if (appliedRef.current === normalized) return;
      appliedRef.current = normalized;
      supabase
        .from("tenants")
        .update({ dashboard_language: normalized } as any)
        .eq("id", tenantId)
        .then(() => {
          /* fire-and-forget */
        });
    };
    i18n.on("languageChanged", handler);

    return () => {
      cancelled = true;
      i18n.off("languageChanged", handler);
    };
  }, [tenantId]);
}
