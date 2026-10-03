import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMentorAppUrl } from "@/lib/subdomain";
import { ArrowLeft, ArrowRight, Book, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SeoHead } from "@/components/common/SeoHead";
import { organizationJsonLd, platformOfferingsJsonLd, websiteJsonLd } from "@/lib/siteStructuredData";
import SiteNavbar from "@/components/common/SiteNavbar";
import { Magnetic, LazyMount } from "@/components/home/shared";
import SectionSkeleton from "@/components/home/SectionSkeleton";
import useScrollReveal from "@/components/home/useScrollReveal";

const ProductsSection = lazy(() => import("@/components/home/ProductsSection"));
const CapabilitiesSection = lazy(() => import("@/components/home/CapabilitiesSection"));
const StepsSection = lazy(() => import("@/components/home/StepsSection"));
const PricingSection = lazy(() => import("@/components/home/PricingSection"));
const FaqSection = lazy(() => import("@/components/home/FaqSection"));
const CtaSection = lazy(() => import("@/components/home/CtaSection"));
const HomeFooter = lazy(() => import("@/components/home/HomeFooter"));
const ShapeGrid = lazy(() => import("@/components/common/ShapeGrid"));

export default function Index() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const trustStats = [
    { value: t("home.hero.stats.commission"), label: t("home.hero.stats.commissionLabel") },
    { value: t("home.hero.stats.time"), label: t("home.hero.stats.timeLabel") },
    { value: t("home.hero.stats.arabic"), label: t("home.hero.stats.arabicLabel") },
  ];

  // Reveal-on-scroll (fail-open: content stays visible if anything goes wrong)
  useScrollReveal(".home-page");

  // Interactive canvas grid: desktop pointers only, enabled after first paint
  const [showShapeGrid, setShowShapeGrid] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const id = window.requestAnimationFrame(() => setShowShapeGrid(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="home-page min-h-screen text-slate-900 relative overflow-x-hidden font-body"
      dir={i18n.dir()}
      style={
        {
          "--primary": "153 54% 43%",
          "--primary-foreground": "0 0% 100%",
          "--ring": "153 54% 43%",
          "--accent": "229 82% 22%",
          "--accent-foreground": "0 0% 100%",
          "--background": "70 18% 95%",
          "--hero-gradient": "hsl(229 82% 22%)",
          "--hero-gradient-accent": "hsl(127 57% 60%)",
          backgroundColor: "#eef7f1",
        } as React.CSSProperties
      }
    >
      <style>{`
        .home-page h1, .home-page h2, .home-page h3, .home-page h4, .home-page h5, .home-page h6 {
          font-family: "IBM Plex Sans Arabic", "SF Arabic", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        html[lang="en"] .home-page h1, html[lang="en"] .home-page h2, html[lang="en"] .home-page h3,
        html[lang="en"] .home-page h4, html[lang="en"] .home-page h5, html[lang="en"] .home-page h6 {
          font-family: "Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        @media (prefers-reduced-motion: no-preference) {
          .hero-anim-line {
            animation: heroSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
            will-change: transform, opacity;
            backface-visibility: hidden;
          }
          .hero-anim-fade {
            animation: heroFadeSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
            will-change: transform, opacity;
            backface-visibility: hidden;
          }
        }
        @keyframes heroSlideUp { from { opacity: 0.6; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        @keyframes heroFadeSlide { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }

        /* Scroll reveal — only applied by JS after an observer is attached */
        .home-page .reveal-init {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
          will-change: opacity, transform;
        }
        .home-page .reveal-init.reveal-in {
          opacity: 1;
          transform: none;
        }
        @keyframes heroGlow {
          0%, 100% { transform: translate(0, -50%) scale(1); opacity: 0.85; }
          50% { transform: translate(24px, calc(-50% - 18px)) scale(1.08); opacity: 1; }
        }
        .hero-glow { animation: heroGlow 9s ease-in-out infinite; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) {
          .home-page .reveal-init { opacity: 1 !important; transform: none !important; transition: none !important; }
          .hero-glow { animation: none !important; }
        }
      `}</style>

      <SeoHead
        title={t("home.seoTitle")}
        description={t("home.seoDescription")}
        path="/"
        jsonLd={[
          websiteJsonLd(isRtl ? "ar" : "en"),
          organizationJsonLd(isRtl ? "ar" : "en"),
          platformOfferingsJsonLd(isRtl ? "ar" : "en"),
        ]}
      />

      <SiteNavbar variant="transparent-on-top" />

      {/* Ambient glows — pre-softened gradients (no CSS blur filter: iOS Safari
          repaints blurred fixed layers on every scroll frame, which freezes the page) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-[18%] -right-32 w-[480px] h-[480px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(50,168,115,0.35) 0%, rgba(50,168,115,0.14) 45%, transparent 72%)",
            transform: "translate3d(0,0,0)",
          }}
        />
        <div
          className="absolute top-[62%] -left-32 w-[420px] h-[420px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(15,46,34,0.3) 0%, rgba(15,46,34,0.12) 45%, transparent 72%)",
            transform: "translate3d(0,0,0)",
          }}
        />
      </div>


      {/* ══════ HERO ══════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-20 overflow-hidden bg-[#eef7f1]">
        {!showShapeGrid && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#0f2e2220 1px, transparent 1px), linear-gradient(90deg, #0f2e2220 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
            aria-hidden="true"
          />
        )}
        {showShapeGrid && (
          <div className="absolute inset-0 z-0 pointer-events-none sm:pointer-events-auto">
            <Suspense fallback={null}>
              <ShapeGrid
                speed={0.33}
                squareSize={40}
                direction="down"
                borderColor="#0f2e2220"
                hoverFillColor="#d5ebde"
                shape="square"
                hoverTrailAmount={2}
                hoverColor="#d5ebde"
                size={55}
              />
            </Suspense>
          </div>
        )}



        <div
          className="hero-glow hidden md:block absolute top-1/2 -right-48 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.12) 45%, transparent 72%)",
          }}
        />
        <div
          className="hero-glow hidden md:block absolute top-1/2 -left-48 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.12) 45%, transparent 72%)",
            animationDelay: "4.5s",
          }}
        />

        <div className="hidden md:flex absolute top-28 left-12 w-12 h-12 bg-primary/15 border border-primary/25 rounded-xl items-center justify-center pointer-events-none shadow-lg shadow-primary/10">
          <Book className="w-6 h-6 text-primary" />
        </div>
        <div className="hidden md:flex absolute bottom-32 right-16 w-12 h-12 bg-[#0f172a]/10 border border-[#0f172a]/15 rounded-xl items-center justify-center pointer-events-none shadow-lg shadow-slate-200">
          <Award className="w-6 h-6 text-[#0f172a]/70" />
        </div>

        <div className="relative z-10 py-10 max-w-4xl mx-auto px-5 sm:px-8 text-center flex flex-col items-center gap-7">
          <div
            className="hero-anim-fade inline-flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary text-xs sm:text-sm font-bold px-5 py-2 rounded-full shadow-sm"
            style={{ animationDelay: "0s" }}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {t("home.hero.badge")}
          </div>

          <div className="space-y-2">
            <h1 className="font-noto text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.75rem] !leading-[1.45] font-bold text-slate-900 tracking-tight">
              <span className="hero-anim-line inline-block" style={{ animationDelay: "0.05s" }}>
                {t("home.hero.titlePart1")}{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">{t("home.hero.titleHighlight")}</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-4 -z-0"
                    viewBox="0 0 200 20"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 14 C 40 4, 80 20, 120 10 S 190 6, 197 12"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeOpacity="0.55"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                {t("home.hero.titlePart2")}
              </span>
              <br className="hidden sm:block" />
              <span
                className="hero-anim-line text-slate-500 font-[600] text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.5rem] inline-block"
                style={{ animationDelay: "0.14s" }}
              >
                {t("home.hero.subtitle")}
              </span>
            </h1>
          </div>

          <div className="hero-anim-fade flex items-center justify-center w-full" style={{ animationDelay: "0.22s" }}>
            <Magnetic className="w-full sm:w-auto">
              <a href={getMentorAppUrl("/login?signup=1")} className="w-full sm:w-auto block">
                <button className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-base px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow duration-200">
                  {t("common.startFree")}
                  <Arrow
                    className={`w-4 h-4 transition-transform duration-200 ${isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}
                  />
                </button>
              </a>
            </Magnetic>
          </div>

          <p
            className="hero-anim-fade text-sm sm:text-base text-slate-600 font-medium max-w-2xl leading-relaxed"
            style={{ animationDelay: "0.28s" }}
          >
            {t("home.hero.description")}
          </p>
          <p className="hero-anim-fade text-xs text-slate-400 font-medium -mt-3" style={{ animationDelay: "0.32s" }}>
            {t("common.noCardRequired")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-4 pt-6 border-t border-slate-100 w-full max-w-2xl">
            {trustStats.map((s, i) => (
              <div
                key={i}
                className="hero-anim-fade flex flex-col items-center gap-0.5"
                style={{ animationDelay: `${0.36 + i * 0.06}s` }}
              >
                <span className="text-xl sm:text-2xl font-medium text-slate-900">{s.value}</span>
                <span className="text-xs text-slate-400 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-300">
          <span className="text-[10px] font-semibold uppercase tracking-widest">{t("home.hero.scroll")}</span>
          <div className="w-5 h-8 rounded-full border-2 border-slate-200 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-slate-300 animate-bounce" />
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <LazyMount minHeight={500} fallback={<SectionSkeleton variant="cards" />}>
          <ProductsSection />
        </LazyMount>
        <LazyMount minHeight={500} fallback={<SectionSkeleton variant="cards" />}>
          <CapabilitiesSection />
        </LazyMount>
        <LazyMount minHeight={500} fallback={<SectionSkeleton variant="list" />}>
          <StepsSection />
        </LazyMount>
        <LazyMount minHeight={600} fallback={<SectionSkeleton variant="pricing" />}>
          <PricingSection />
        </LazyMount>
        <LazyMount minHeight={400} fallback={<SectionSkeleton variant="faq" />}>
          <FaqSection />
        </LazyMount>
        <LazyMount minHeight={400} fallback={<SectionSkeleton variant="cta" />}>
          <CtaSection />
        </LazyMount>
        <LazyMount minHeight={120} fallback={<SectionSkeleton variant="footer" />}>
          <HomeFooter />
        </LazyMount>
      </Suspense>
    </div>
  );
}
