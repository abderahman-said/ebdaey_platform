import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMentorSlug } from "@/hooks/useMentorSlug";

const nameCache = new Map<string, string>();

/**
 * Sets the browser tab title using the mentor site (academy) name instead of the
 * platform default. Used across student-area pages (dashboard, lesson viewer,
 * content bank, digital product download, ...).
 *
 * @param label   Optional page label, e.g. "Content bank". Rendered as "Label · Site".
 * @param siteName Pass the tenant name when the page already loaded it (skips the fetch).
 */
export function useBrandedPageTitle(label?: string, siteName?: string | null) {
  const mentorSlug = useMentorSlug();
  const [fetchedName, setFetchedName] = useState<string>(() =>
    mentorSlug ? nameCache.get(mentorSlug) ?? "" : "",
  );

  useEffect(() => {
    if (siteName) return;
    if (!mentorSlug) return;
    const cached = nameCache.get(mentorSlug);
    if (cached) {
      setFetchedName(cached);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("public_tenants")
        .select("name")
        .eq("slug", mentorSlug)
        .maybeSingle();
      if (!active || !data?.name) return;
      nameCache.set(mentorSlug, data.name);
      setFetchedName(data.name);
    })();
    return () => {
      active = false;
    };
  }, [mentorSlug, siteName]);

  const site = (siteName || fetchedName || "").trim();

  useEffect(() => {
    if (!site) return;
    const previous = document.title;
    document.title = label ? `${label} · ${site}` : site;
    return () => {
      document.title = previous;
    };
  }, [site, label]);
}
