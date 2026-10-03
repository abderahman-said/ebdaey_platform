import { Palette, Shield, BarChart3, CreditCard, Award, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const capabilities = [
  { key: "design", icon: Palette },
  { key: "protection", icon: Shield },
  { key: "analytics", icon: BarChart3 },
  { key: "payments", icon: CreditCard },
  { key: "certificates", icon: Award },
  { key: "notifications", icon: Zap },
] as const;
const rotations = [-6, 4, -3, 7, -5, 3];

export default function CapabilitiesSection() {
  const { t } = useTranslation();
  return (
    <section className="relative z-10 bg-[#0f2e22] text-[#eef7f1] py-16 md:py-20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#eef7f1 1px, transparent 1px), linear-gradient(90deg, #eef7f1 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(50,168,115,0.5) 0%, rgba(50,168,115,0.2) 45%, transparent 72%)",
          transform: "translate3d(0,0,0)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="mb-16 sm:mb-20 max-w-2xl">
          <span className="inline-flex items-center gap-2 font-mono text-md uppercase tracking-[0.25em] text-[#32A873] mb-4" data-aos="fade-left">
            <span className="w-4 h-px bg-[#32A873]" /> {t("home.capabilities.eyebrow")}
          </span>
          <h2 className="font-noto font-[600] text-4xl sm:text-5xl md:text-6xl !leading-[1.3] tracking-tight" data-aos="fade-up" data-aos-delay="100">
            {t("home.capabilities.title1")}
            <br />
            <span className="text-[#eef7f1]/40">{t("home.capabilities.title2")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
          {capabilities.map((c, i) => (
            <div
              key={c.key}
              data-aos="zoom-in"
              data-aos-delay={i * 80}
              className="flex flex-col items-center text-center gap-3 group"
              style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
            >
              <div
                className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-[#32A873]"
                style={{ borderColor: "rgba(50,168,115,0.5)" }}
              >
                <c.icon className="w-7 h-7 text-[#32A873]" />
              </div>
              <span className="font-display text-xs sm:text-sm font-medium leading-snug text-[#eef7f1]/80">
                {t(`home.capabilities.items.${c.key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
