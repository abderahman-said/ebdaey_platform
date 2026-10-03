/**
 * ==============================================================
 *  Toast configuration — Minimal Line preset (single style).
 * ==============================================================
 *  Applies to BOTH sonner (`toast(...)` from "sonner") AND the
 *  legacy Radix toaster (`useToast()` from "@/hooks/use-toast").
 */

export type ToastStyle = "minimal";
export type ToastPosition =
  | "top-right"
  | "top-center"
  | "top-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left";
export type ToastAnimation = "slide" | "scale-fade" | "bounce";

export const TOAST_CONFIG = {
  style: "minimal" as ToastStyle,
  position: "bottom-right" as ToastPosition,
  animation: "slide" as ToastAnimation,
  duration: 5000,
  showProgress: true,
  radius: "rounded-xl",
};

/**
 * Minimal Line:
 * Clean white/dark card, thin 1px border, colored icon on a transparent
 * background, hair-thin progress bar at the bottom. Linear/Vercel vibe.
 */
export const TOAST_STYLES: Record<
  ToastStyle,
  {
    base: string;
    success: string;
    error: string;
    info: string;
    warning: string;
    iconWrap: string;
    progress: string;
  }
> = {
  minimal: {
    base:
      "bg-white text-neutral-900 border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]",
    success: "[&_[data-toast-icon]]:text-emerald-600",
    error: "[&_[data-toast-icon]]:text-rose-600",
    info: "[&_[data-toast-icon]]:text-sky-600",
    warning: "[&_[data-toast-icon]]:text-amber-600",
    iconWrap: "bg-transparent text-neutral-500",
    progress: "bg-neutral-900/70",
  },
};

export const TOAST_ANIMATION_CLASS: Record<ToastAnimation, string> = {
  slide:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-4 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-4 data-[state=closed]:fade-out-0",
  "scale-fade":
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0",
  bounce:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=closed]:fade-out-0",
};
