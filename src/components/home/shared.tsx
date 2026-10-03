import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";


export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const arNum = (n: number) => {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "ar";
  return n.toLocaleString(lang === "en" ? "en-US" : "ar-EG");
};

/* ── DASHED LEADER ─────────────────────────────────────── */
export function Leader() {
  return (
    <span
      className="flex-1 mx-3 h-0 border-b border-dashed border-[#0f2e22]/25 translate-y-[-4px]"
      aria-hidden="true"
    />
  );
}

/* ── TORN EDGE ─────────────────────────────────────────── */
export function TornEdge({ color = "#ffffff" }: { color?: string }) {
  return (
    <div
      className="h-4 w-full"
      style={{
        backgroundImage: `radial-gradient(circle at 10px 4px, transparent 7px, ${color} 7.5px)`,
        backgroundSize: "20px 16px",
        backgroundRepeat: "repeat-x",
        backgroundPosition: "top",
      }}
      aria-hidden="true"
    />
  );
}

/* ── MAGNETIC BUTTON (pure CSS hover, no GSAP) ─────────── */
export function Magnetic({
  children,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  return (
    <div className={`inline-block transition-transform duration-300 hover:-translate-y-0.5 ${className}`}>
      {children}
    </div>
  );
}

/* ── FAQ ITEM (CSS-only accordion) ─────────────────────── */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState("0px");

  useEffect(() => {
    if (!bodyRef.current) return;
    setMaxH(open ? `${bodyRef.current.scrollHeight}px` : "0px");
  }, [open]);

  return (
    <div
      onClick={() => setOpen(!open)}
      className="cursor-pointer bg-white border border-[#0f2e22]/10 rounded-2xl px-6 py-5 select-none group hover:border-[#32A873]/40 hover:shadow-[0_20px_45px_-30px_rgba(15,46,34,0.35)] hover:-translate-y-0.5 transition-[border-color,box-shadow,transform] duration-300"
    >
      <div className="flex items-center justify-between gap-6">
        <span className="font-display font-medium text-base sm:text-lg text-[#0f2e22] leading-snug">{q}</span>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full border border-dashed flex items-center justify-center transition-all duration-300 ${
            open ? "bg-[#32A873] border-[#32A873] text-white rotate-180" : "text-[#0f2e22]"
          }`}
          style={!open ? { borderColor: "rgba(15,46,34,0.25)" } : undefined}
        >
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </div>
      <div
        ref={bodyRef}
        style={{ maxHeight: maxH, opacity: open ? 1 : 0 }}
        className="overflow-hidden transition-all duration-500 ease-out"
      >
        <p className="text-[#0f2e22]/65 text-sm sm:text-base leading-relaxed border-t border-dashed border-[#0f2e22]/15 pt-4 mt-4">
          {a}
        </p>
      </div>
    </div>
  );
}

/* ── LAZY MOUNT WRAPPER ────────────────────────────────── */
const isPrerendered =
  typeof document !== "undefined" &&
  Boolean(document.getElementById("root")?.hasChildNodes());

export function LazyMount({
  children,
  minHeight = 300,
  rootMargin = "400px",
  fallback = null,
}: {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => isPrerendered);

  useEffect(() => {
    if (visible) return;
    // Fail-open: if IntersectionObserver is unavailable, render immediately.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 1500);
    if (!ref.current) return () => window.clearTimeout(t);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [rootMargin, visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }} suppressHydrationWarning>
      {visible ? children : fallback}
    </div>
  );
}
