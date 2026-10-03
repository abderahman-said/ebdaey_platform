import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface PremiumSectionHeadingProps {
  badge: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  align?: "left" | "center" | "right";
  margin?: string;
}

export default function PremiumSectionHeading({
  badge,
  title,
  subtitle,
  icon,
  align = "center",
  margin = "16",
}: PremiumSectionHeadingProps) {
  return (
    <div
      className={`relative mb-${margin} ${
        align === "center"
          ? "text-center mx-auto"
          : align === "right"
            ? "text-end"
            : "text-start"
      } max-w-3xl`}
    >
      {/* Background Glow Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-primary/10 blur-[80px] rounded-full pointer-events-none -z-10" />

      {/* Floating particles */}
      <div className="absolute -top-6 -right-6 w-3 h-3 rounded-full bg-primary/20 animate-pulse hidden md:block" />
      <div className="absolute -bottom-4 -left-8 w-2 h-2 rounded-full bg-slate-300 animate-bounce hidden md:block" />

      {/* Badge */}
      <div
        className={`inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest rtl:tracking-normal mb-6 shadow-sm`}
      >
        {icon || <Sparkles className="w-3.5 h-3.5" />}
        {badge}
      </div>

      {/* Title */}
      <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-5">
        <span className="bg-gradient-to-l from-slate-900 via-slate-800 to-primary/80 bg-clip-text text-transparent">
          {title}
        </span>

        {/* Star Divider */}
        <div
          className={`mt-4 flex items-center gap-3 w-40 ${
            align === "center" ? "mx-auto" : align === "right" ? "mr-0 ml-auto" : "ml-0 mr-auto"
          }`}
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-900" />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className="text-primary shrink-0"
            fill="currentColor"
          >
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
          </svg>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-900" />
        </div>
      </h2>

      {/* Subtitle */}
      <p className="text-slate-500 text-center text-base sm:text-lg font-medium leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}