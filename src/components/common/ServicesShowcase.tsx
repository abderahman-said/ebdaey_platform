import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Video, Package, Calendar, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import PremiumSectionHeading from "@/components/ui/PremiumSectionHeading";

gsap.registerPlugin(ScrollTrigger);

const buildServices = (t: (k: string, o?: any) => string) => [
  {
    number: "01",
    icon: Video,
    badge: t("miscPublic.marketing.services.items.recorded.badge"),
    title: t("miscPublic.marketing.services.items.recorded.title"),
    description: t("miscPublic.marketing.services.items.recorded.description"),
    points: t("miscPublic.marketing.services.items.recorded.points", { returnObjects: true }) as unknown as string[],
    accent: "slate" as const,
  },
  {
    number: "02",
    icon: Package,
    badge: t("miscPublic.marketing.services.items.digital.badge"),
    title: t("miscPublic.marketing.services.items.digital.title"),
    description: t("miscPublic.marketing.services.items.digital.description"),
    points: t("miscPublic.marketing.services.items.digital.points", { returnObjects: true }) as unknown as string[],
    accent: "violet" as const,
  },
  {
    number: "03",
    icon: Calendar,
    badge: t("miscPublic.marketing.services.items.live.badge"),
    title: t("miscPublic.marketing.services.items.live.title"),
    description: t("miscPublic.marketing.services.items.live.description"),
    points: t("miscPublic.marketing.services.items.live.points", { returnObjects: true }) as unknown as string[],
    accent: "emerald" as const,
  },
];

const accentMap = {
  slate: {
    badge: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    glow: "from-slate-400/10 via-slate-400/0",
    line: "bg-slate-400",
    ring: "ring-slate-400/30",
    ghost: "text-slate-900/[0.04]",
    button: "bg-slate-700 text-white hover:bg-slate-800",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    glow: "from-violet-400/10 via-violet-400/0",
    line: "bg-violet-400",
    ring: "ring-violet-400/30",
    ghost: "text-violet-900/[0.05]",
    button: "bg-violet-500 text-white hover:bg-violet-600",
  },
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    glow: "from-emerald-400/10 via-emerald-400/0",
    line: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    ghost: "text-emerald-900/[0.05]",
    button: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
};

// Scrambles a number into place — runs once per card as it enters view
function scrambleNumber(el, final, registerInterval) {
  if (!el) return;
  const chars = "0123456789";
  let frame = 0;
  const totalFrames = 14;
  const id = setInterval(() => {
    frame++;
    if (frame >= totalFrames) {
      el.textContent = final;
      clearInterval(id);
    } else {
      el.textContent = Array.from({ length: final.length }, () => chars[Math.floor(Math.random() * chars.length)]).join(
        "",
      );
    }
  }, 35);
  registerInterval(id);
}

const ServicesShowcase = () => {
  const { t, i18n } = useTranslation();
  const services = buildServices(t);
  const isEn = i18n.language?.startsWith("en");
  const sectionRef = useRef(null);
  const lineRef = useRef(null);
  const travelerRef = useRef(null);
  const cardsRef = useRef([]);
  const dotsRef = useRef([]);
  const ghostNumberRefs = useRef([]);
  const pointsListRefs = useRef([]);
  const scrambleIntervals = useRef([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(
          [
            ".heading-container",
            cardsRef.current,
            dotsRef.current,
            lineRef.current,
            ghostNumberRefs.current,
          ],
          { opacity: 1, x: 0, y: 0, scale: 1, scaleY: 1, clearProps: "all" },
        );
        ghostNumberRefs.current.forEach((el, i) => {
          if (el) el.textContent = services[i].number;
        });
        gsap.set(travelerRef.current, { opacity: 0 });
        return;
      }

      // Heading reveal
      gsap.from(".heading-container", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });

      // Vertical line draw + traveling glow node riding the same progress
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            end: "bottom 80%",
            scrub: true,
            onUpdate: (self) => {
              if (travelerRef.current) {
                gsap.set(travelerRef.current, {
                  top: `${self.progress * 100}%`,
                  opacity: self.progress > 0.01 && self.progress < 0.99 ? 1 : 0,
                });
              }
            },
          },
        },
      );

      // Gentle ambient pulse on the traveling node
      gsap.to(travelerRef.current, {
        scale: 1.6,
        opacity: 0,
        duration: 1.4,
        ease: "power1.out",
        repeat: -1,
        transformOrigin: "center",
      });

      // Batch animate cards + dots + ghost numbers + checklist cascade together
      ScrollTrigger.batch(cardsRef.current, {
        start: "top 82%",
        onEnter: (batch) =>
          batch.forEach((card) => {
            const i = cardsRef.current.indexOf(card);
            const fromX = i % 2 === 0 ? 60 : -60;
            const dot = dotsRef.current[i];
            const ghostNumber = ghostNumberRefs.current[i];
            const pointsList = pointsListRefs.current[i];

            gsap.fromTo(
              card,
              { opacity: 0, x: fromX, y: 30 },
              {
                opacity: 1,
                x: 0,
                y: 0,
                duration: 0.9,
                ease: "power3.out",
                clearProps: "transform,opacity",
              },
            );

            if (dot) {
              gsap.fromTo(
                dot,
                { scale: 0, opacity: 0 },
                {
                  scale: 1,
                  opacity: 1,
                  duration: 0.5,
                  ease: "back.out(2.2)",
                  clearProps: "transform",
                },
              );
            }

            if (ghostNumber) {
              gsap.fromTo(
                ghostNumber,
                { opacity: 0, scale: 0.85 },
                { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
              );
              scrambleNumber(ghostNumber, services[i].number, (id) => scrambleIntervals.current.push(id));
            }

            if (pointsList) {
              const items = pointsList.querySelectorAll("li");
              gsap.fromTo(
                items,
                { opacity: 0, x: i % 2 === 0 ? 14 : -14 },
                {
                  opacity: 1,
                  x: 0,
                  duration: 0.5,
                  ease: "power2.out",
                  stagger: 0.1,
                  delay: 0.25,
                  clearProps: "transform,opacity",
                },
              );
            }
          }),
        once: true,
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      scrambleIntervals.current.forEach((id) => clearInterval(id));
    };
  }, []);

  // Magnetic CTA: button drifts toward the cursor, snaps back with a soft elastic release
  const handleMagnetMove = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.3, y: y * 0.5, duration: 0.3, ease: "power2.out" });
    const arrow = btn.querySelector("[data-arrow]");
    if (arrow) gsap.to(arrow, { x: x * 0.15, duration: 0.3, ease: "power2.out" });
  };
  const handleMagnetLeave = (e) => {
    const btn = e.currentTarget;
    gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const arrow = btn.querySelector("[data-arrow]");
    if (arrow) gsap.to(arrow, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  };

  // Icon badge: small elastic spin on hover
  const handleIconEnter = (e) => {
    gsap.to(e.currentTarget, { rotate: 360, scale: 1.12, duration: 0.6, ease: "back.out(1.7)" });
  };
  const handleIconLeave = (e) => {
    gsap.to(e.currentTarget, { rotate: 0, scale: 1, duration: 0.5, ease: "power2.out" });
  };

  return (
    <section ref={sectionRef} dir={isEn ? "ltr" : "rtl"} className="relative overflow-hidden bg-[#e7f8f226] pt-10 pb-20">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -top-10 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-[100px]" />

      {/* Decorative Dots */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-[0.35] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(hsl(var(--primary)) 2px, transparent 2px)', 
          backgroundSize: '30px 30px', 
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 0%, black 30%, transparent 100%)' 
        }} 
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none opacity-[0.35] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(hsl(var(--primary)) 2px, transparent 2px)', 
          backgroundSize: '30px 30px', 
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 0% 100%, black 30%, transparent 100%)' 
        }} 
      />


      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        {/* Heading */}
        <div className="heading-container">
          <PremiumSectionHeading 
            badge={t("miscPublic.marketing.services.badge")}
            title={t("miscPublic.marketing.services.title")}
            subtitle={t("miscPublic.marketing.services.subtitle")}
          />
        </div>

        {/* Timeline */}
        <div className="relative">
          <div ref={lineRef} className="absolute right-1/2 top-0 hidden h-full w-px bg-slate-200 md:block" />
          <div className="absolute right-5 top-0 h-full w-px bg-slate-200 md:hidden" />

          {/* traveling glow node — rides the line-draw progress */}
          <div
            ref={travelerRef}
            className="pointer-events-none absolute right-1/2 z-10 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-[0_0_12px_4px_rgba(95,211,108,0.45)] md:block"
          />

          <div className="space-y-12 md:space-y-20">
            {services.map((exp, i) => {
              const accent = accentMap[exp.accent];
              const isEven = i % 2 === 0;
              return (
                <div
                  key={exp.number}
                  className={`relative flex flex-col items-start md:flex-row ${
                    isEven ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* dot */}
                  <div
                    ref={(el) => (dotsRef.current[i] = el)}
                    className={`absolute right-3 top-2 h-3 w-3 rounded-full ring-4 ring-white md:right-1/2 md:translate-x-1/2 ${accent.line}`}
                  />

                  {/* spacer for desktop */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* card */}
                  <div
                    ref={(el) => (cardsRef.current[i] = el)}
                    className={`relative w-full pr-10 md:w-1/2 md:pr-0 ${isEven ? "md:pr-12" : "md:pl-12"}`}
                  >
                    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/60">
                      <div
                        className={`absolute -top-16 -left-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent.glow} transition-transform duration-700 group-hover:scale-150`}
                      />

                      {/* ghost number — large, faint, scrambles into place on reveal */}
                      <div
                        ref={(el) => (ghostNumberRefs.current[i] = el)}
                        aria-hidden="true"
                        className={`pointer-events-none absolute -top-3 left-4 select-none text-[5.5rem] font-black leading-none ${accent.ghost}`}
                      >
                        {exp.number}
                      </div>

                      <div className="relative">
                        {/* badge + icon */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span
                            onMouseEnter={handleIconEnter}
                            onMouseLeave={handleIconLeave}
                            className={`flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-transparent transition-colors duration-300 group-hover:${accent.ring}`}
                          >
                            <exp.icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider rtl:tracking-normal ${accent.badge}`}
                          >
                            {exp.badge}
                          </span>
                        </div>

                        {/* title */}
                        <h3 className="mb-3 text-xl font-black text-slate-900">{exp.title}</h3>

                        {/* description */}
                        <p className="mb-5 text-sm leading-relaxed text-slate-500">{exp.description}</p>

                        {/* points — cascade in after the card lands */}
                        <ul ref={(el) => (pointsListRefs.current[i] = el)} className="mb-6 space-y-2.5">
                          {exp.points.map((point) => (
                            <li
                              key={point}
                              className="flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600"
                            >
                              <ArrowLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-current" />
                              {point}
                            </li>
                          ))}
                        </ul>

                        {/* CTA — magnetic, follows the cursor within the button's bounds */}
                        <button
                          onMouseMove={handleMagnetMove}
                          onMouseLeave={handleMagnetLeave}
                          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors will-change-transform ${accent.button}`}
                        >
                          {t("miscPublic.marketing.services.cta")}
                          <ArrowLeft data-arrow className="h-4 w-4 will-change-transform" />
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
    </section>
  );
};

export default ServicesShowcase;
