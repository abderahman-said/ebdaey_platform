import { useEffect, useState, useRef } from "react";

export const useInView = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "200px" }
    );

    if (ref.current) observer.observe(ref.current);

    // Fallback: ensure content renders even if the observed wrapper has
    // zero height (empty placeholder before children mount), which can
    // prevent IntersectionObserver from ever firing on some browsers.
    const fallback = window.setTimeout(() => setInView(true), 400);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return { ref, inView };
};
