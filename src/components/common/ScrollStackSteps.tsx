import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Share2,
  ShoppingCart,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PremiumSectionHeading from "@/components/ui/PremiumSectionHeading";

gsap.registerPlugin(ScrollTrigger);

const stepsMeta = [
  {
    num: "01",
    key: "1",
    icon: Share2,
    color: "from-indigo-600 to-violet-600",
    lightBg: "bg-indigo-50",
    textColor: "text-indigo-600",
    pillBg: "bg-indigo-50",
    pillBorder: "border-indigo-200",
    glow: "rgba(99, 102, 241, 0.15)",
    accent: "#6366F1",
    image: "https://img.freepik.com/free-vector/website-setup-concept-illustration_114360-4256.jpg",
  },
  {
    num: "02",
    key: "2",
    icon: ShoppingCart,
    color: "from-sky-500 to-indigo-600",
    lightBg: "bg-sky-50",
    textColor: "text-sky-600",
    pillBg: "bg-sky-50",
    pillBorder: "border-sky-200",
    glow: "rgba(14, 165, 233, 0.15)",
    accent: "#0EA5E9",
    image: "https://img.freepik.com/free-vector/money-income-concept-illustration_114360-4960.jpg",
  },
  {
    num: "03",
    key: "3",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-50",
    textColor: "text-emerald-600",
    pillBg: "bg-emerald-50",
    pillBorder: "border-emerald-200",
    glow: "rgba(16, 185, 129, 0.15)",
    accent: "#10B981",
    image: "https://img.freepik.com/free-vector/online-tutorials-concept-illustration_114360-5915.jpg",
  },
];

// Simple decorative illustration matching the reference image's vibe:
// a "screen" card with a colored icon badge, abstract gear/dot shapes, and a chart-ish accent.
function StepIllustration({ step }: { step: (typeof stepsMeta)[number] & { title: string } }) {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      {/* Big faded number */}
      <span
        className="absolute -top-16 -left-10 md:-left-3 text-[7rem] sm:text-[9rem] font-black leading-none select-none pointer-events-none z-10"
        style={{ color: step.accent, opacity: 0.1 }}
      >
        {step.num}
      </span>

      {/* Decorative blobs */}
      <div
        className="absolute top-4 right-6 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-2xl"
        style={{ backgroundColor: step.accent, opacity: 0.12 }}
      />
      <div
        className="absolute bottom-6 left-6 w-20 h-20 sm:w-28 sm:h-28 rounded-full blur-2xl"
        style={{ backgroundColor: step.accent, opacity: 0.1 }}
      />

      {/* Image card */}
      <img
        src={step.image}
        alt={step.title}
        className="w-full relative h-full object-contain rounded-4xl"
        loading="lazy"
      />
    </div>
  );
}

export default function ScrollStackSteps() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const steps = stepsMeta.map((s) => ({
    ...s,
    title: t(`miscPublic.marketing.steps.items.${s.key}.title`),
    desc: t(`miscPublic.marketing.steps.items.${s.key}.desc`),
    tags: t(`miscPublic.marketing.steps.items.${s.key}.tags`, { returnObjects: true }) as unknown as string[],
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        if (!triggerRef.current) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerRef.current,
            start: "top top",
            end: "+=1800",
            scrub: 0.5,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              setScrollProgress(progress);
              if (progress < 0.35) {
                setActiveStep(0);
              } else if (progress < 0.7) {
                setActiveStep(1);
              } else {
                setActiveStep(2);
              }
            },
          },
        });

        cardsRef.current.forEach((card, idx) => {
          if (!card) return;
          if (idx === 0) {
            gsap.set(card, { yPercent: 0, scale: 1, opacity: 1, rotate: 0 });
          } else {
            gsap.set(card, {
              yPercent: 120,
              scale: 0.95,
              opacity: 0,
              rotate: idx === 1 ? 1 : -1,
            });
          }
        });

        tl.to(
          cardsRef.current[1],
          { yPercent: 0, opacity: 1, scale: 1, rotate: 0, ease: "none" },
          0,
        )
          .to(
            cardsRef.current[0],
            { scale: 0.94, y: -25, opacity: 0.45, ease: "none" },
            0,
          )
          .to(
            cardsRef.current[2],
            { yPercent: 0, opacity: 1, scale: 1, rotate: 0, ease: "none" },
            1,
          )
          .to(
            cardsRef.current[1],
            { scale: 0.94, y: -25, opacity: 0.45, ease: "none" },
            1,
          )
          .to(
            cardsRef.current[0],
            { scale: 0.88, y: -50, opacity: 0.2, ease: "none" },
            1,
          );
      });
    }, triggerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={triggerRef}
      className="relative bg-gradient-to-b from-white via-slate-50 to-slate-100 overflow-hidden py-16"
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="absolute top-1/4 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-6 h-full flex flex-col justify-center">
        {/* Section header */}
        <PremiumSectionHeading 
          badge={t("miscPublic.marketing.steps.badge")}
          title={t("miscPublic.marketing.steps.title")}
          subtitle={t("miscPublic.marketing.steps.subtitle")}
        />

        {/* Mobile View: stacked cards, image-style layout */}
        <div className="lg:hidden flex flex-col gap-12 relative pb-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200/80 flex flex-col gap-6"
            >
              <StepIllustration step={step} />

              <div className="flex items-start justify-between gap-3">
                <span
                  className={`text-2xl font-black ${step.textColor} opacity-30 leading-none`}
                >
                  {step.num}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-md`}
                >
                  <step.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  {step.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {step.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${step.pillBg} ${step.textColor} border ${step.pillBorder}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {t("miscPublic.marketing.steps.startFree")}
                </span>
                <button
                  className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${step.textColor} hover:opacity-80 transition-opacity`}
                >
                  {t("miscPublic.marketing.steps.moreDetails")}
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: GSAP pinning stack, image-style cards */}
        <div className="hidden lg:flex items-center justify-center  relative">
          {/* Stacked image-style cards, full width */}
          <div className="w-full flex items-center justify-center relative h-[520px]">
            <div className="relative w-full max-w-[1000px] h-[480px]">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;

                return (
                  <div
                    key={step.num}
                    ref={(el) => (cardsRef.current[idx] = el)}
                    className="absolute inset-0 w-full h-full origin-bottom"
                    style={{
                      zIndex: idx,
                      boxShadow: isActive
                        ? `0 25px 60px -15px ${step.glow}`
                        : "none",
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-[32px] border border-slate-200/80 shadow-2xl flex flex-col lg:flex-row-reverse overflow-hidden transition-shadow duration-300">
                      {/* Illustration side */}
                      <div className="lg:w-[46%] bg-slate-50 flex items-center justify-center p-6 sm:p-8">
                        <StepIllustration step={step} />
                      </div>

                      {/* Content side */}
                      <div className="lg:w-[54%] p-7 sm:p-10 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-6">
                          <div
                            className={`w-14 h-14 rounded-[18px] bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-lg`}
                          >
                            <step.icon className="w-7 h-7" strokeWidth={1.5} />
                          </div>
                          <span
                            className={`text-5xl font-black ${step.textColor} opacity-15 leading-none`}
                          >
                            {step.num}
                          </span>
                        </div>

                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4">
                          {step.title}
                        </h3>
                        <p className="text-slate-500 text-base leading-relaxed mb-6">
                          {step.desc}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-8">
                          {step.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className={`text-sm font-bold px-4 py-2 rounded-full ${step.pillBg} ${step.textColor} border ${step.pillBorder}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-400">
                            {t("miscPublic.marketing.steps.startFree")}
                          </span>
                          <button
                            className={`inline-flex items-center gap-2 text-sm font-extrabold ${step.textColor} hover:opacity-85 transition-opacity`}
                          >
                            {t("miscPublic.marketing.steps.moreDetails")}
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
