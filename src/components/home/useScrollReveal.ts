import { useEffect } from "react";

/**
 * Lightweight, fail-open scroll reveal for the marketing homepage.
 *
 * Replaces the AOS library, which relied on document-height math measured at
 * init time. With lazy-mounted sections that math went stale on some browsers
 * and whole sections stayed at opacity 0 forever ("disappearing sections").
 *
 * Behaviour here:
 * - Content is visible by default. Elements are only hidden AFTER JS has
 *   successfully attached an observer, so any failure leaves the page readable.
 * - Uses IntersectionObserver (no scroll listeners, no layout thrashing).
 * - Respects prefers-reduced-motion by skipping animation entirely.
 */
export function useScrollReveal(rootSelector = ".home-page") {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.querySelector(rootSelector);
    if (!root) return;

    const seen = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.aosDelay ?? 0);
          el.style.transitionDelay = delay ? `${Math.min(delay, 400)}ms` : "";
          el.classList.add("reveal-in");
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    const attach = () => {
      const nodes = root.querySelectorAll<HTMLElement>("[data-aos]");
      nodes.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Hidden only once the observer is guaranteed to run.
        el.classList.add("reveal-init");
        observer.observe(el);
        // Safety net: never leave an element hidden for long.
        window.setTimeout(() => el.classList.add("reveal-in"), 2500);
      });
    };

    attach();

    // Lazy-mounted sections arrive later — pick them up as they appear.
    const mo = new MutationObserver(() => attach());
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, [rootSelector]);
}

export default useScrollReveal;
