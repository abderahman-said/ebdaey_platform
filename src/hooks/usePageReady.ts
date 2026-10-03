import { useEffect } from "react";

/**
 * Signals route transition readiness. While any page is loading its initial
 * data, AppRoutes keeps showing the previous page so navigation feels instant
 * with no blank intermediate state.
 */

const READY_EVENT = "lovable:page-ready";
const PENDING_EVENT = "lovable:page-pending";

export const emitPageReady = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(READY_EVENT));
  }
};

export const emitPagePending = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PENDING_EVENT));
  }
};

export const onPageReady = (cb: () => void) => {
  window.addEventListener(READY_EVENT, cb);
  return () => window.removeEventListener(READY_EVENT, cb);
};

export const onPagePending = (cb: () => void) => {
  window.addEventListener(PENDING_EVENT, cb);
  return () => window.removeEventListener(PENDING_EVENT, cb);
};

/**
 * Use inside a page: pass `loading` (true while fetching initial data).
 * Emits "pending" on mount and "ready" when loading flips to false.
 */
export const usePageReady = (loading: boolean) => {
  useEffect(() => {
    if (loading) {
      emitPagePending();
    } else {
      emitPageReady();
    }
  }, [loading]);

  // Always emit ready on unmount as a safety net
  useEffect(() => {
    return () => emitPageReady();
  }, []);
};
