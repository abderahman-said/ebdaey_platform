import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ebdaey_visit_sid";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export function useTrackVisit(tenantId: string | undefined | null, pageType: string) {
  useEffect(() => {
    if (!tenantId) return;
    // Skip when previewing inside an iframe (mentor dashboard preview, lovable preview)
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    const path = window.location.pathname + window.location.search;
    const dedupeKey = `ebdaey_pv_${tenantId}_${pageType}_${path}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, "1");
    } catch {}

    const payload = {
      tenant_id: tenantId,
      path,
      page_type: pageType,
      referrer: document.referrer || "",
      session_id: getSessionId(),
      host: window.location.hostname,
      tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })(),
      locale: navigator.language || "",
    };

    // Fire & forget
    supabase.functions.invoke("track-visit", { body: payload }).catch(() => {});
  }, [tenantId, pageType]);
}
