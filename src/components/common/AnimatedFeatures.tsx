import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookOpen, Shield, Globe, Wallet, Users, BarChart3, Lock, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import step1Illustration from "@/assets/step-1-illustration.png.asset.json";
import PremiumSectionHeading from "@/components/ui/PremiumSectionHeading";

gsap.registerPlugin(ScrollTrigger);

const iconMap = { Shield, Globe, Wallet, Users, BarChart3, Lock, Zap, BookOpen };

const featureMeta = [
  { id: 1, icon: Shield, image: step1Illustration.url, tagIcons: [Lock, Zap, Globe] },
  { id: 2, icon: Globe, image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop", tagIcons: [Shield, Wallet, Globe] },
  { id: 3, icon: Wallet, image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop", tagIcons: [BarChart3, Zap] },
  { id: 4, icon: Users, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop", tagIcons: [Users, Globe] },
  { id: 5, icon: BarChart3, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop", tagIcons: [BarChart3, BookOpen] },
];

export default function AnimatedFeatures() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const features = featureMeta.map((f) => {
    const tagLabels = t(`miscPublic.marketing.features.items.${f.id}.tags`, { returnObjects: true }) as unknown as string[];
    return {
      id: f.id,
      icon: f.icon,
      image: f.image,
      title: t(`miscPublic.marketing.features.items.${f.id}.title`),
      desc: t(`miscPublic.marketing.features.items.${f.id}.desc`),
      tags: tagLabels.map((text, i) => ({ text, icon: f.tagIcons[i] ?? f.icon })),
    };
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const track = trackRef.current;
        const container = containerRef.current;
        if (!container || !track) return;

        const getScrollDistance = () => track.scrollWidth - window.innerWidth;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            end: () => "+=" + (getScrollDistance() + 400), // 400px scroll buffer
          },
        });

        tl.to(track, {
          x: () => getScrollDistance(),
          ease: "none",
          duration: 1,
        });

        // Add a hold/pause at the end so the user can look at the last card and GSAP scrub lag catches up smoothly
        tl.to({}, { duration: 0.25 });
      });

      mm.add("(max-width: 1023px)", () => {
        const sections = gsap.utils.toArray(".feature-panel");
        sections.forEach((section: any) => {
          gsap.fromTo(
            section,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              scrollTrigger: {
                trigger: section,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative lg:h-screen bg-gray-50 overflow-hidden lg:flex lg:flex-col"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Header — sits in normal flow to prevent overlap */}
      <div className="relative w-full z-20 px-5 pt-12 lg:pt-20 pb-4 shrink-0">
        <PremiumSectionHeading 
          badge={t("miscPublic.marketing.features.badge")}
          title={t("miscPublic.marketing.features.title")}
          subtitle={t("miscPublic.marketing.features.subtitle")}
       margin="0"
       />
      </div>

      {/* Scrolling Track — takes up remaining height and centers cards vertically */}
      <div
        ref={trackRef}
        className="flex flex-col lg:flex-row w-full lg:w-max lg:flex-grow lg:min-h-0 lg:will-change-transform py-6 lg:py-0 gap-6 px-5 lg:px-12 items-center"
      >
        {/* Leading spacer so cards start centered vertically under header */}
        <div className="hidden lg:block shrink-0 w-4" />

        {features.map((feature) => (
          <div
            key={feature.id}
            className="feature-panel shrink-0 w-full lg:w-[42vw] lg:max-w-[740px] lg:h-[390px] self-center"
          >
            {/* 
              Card layout: flex-row
              Right side  → image (55% width)
              Left side   → content (45% width)
            */}
            <div className="relative flex flex-col sm:flex-row w-full h-full min-h-[300px] rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all duration-500 group">
              {/* ── Image Side (right in RTL) ── */}
              <div className="relative w-full sm:w-[55%] h-52 sm:h-full overflow-hidden shrink-0 order-1">
                {/* Step pill */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow-sm">
                    {t("miscPublic.marketing.features.step", { n: feature.id })}
                  </div>
                </div>

                <img
                  src={feature.image}
                  alt={feature.title}
                  className="parallax-img w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />

                {/* Subtle right-to-left fade overlay so the image blends into the white content side in RTL */}
                <div className="absolute inset-0 -left-1 bg-gradient-to-r from-white via-white/20 to-transparent pointer-events-none hidden sm:block" />
              </div>

              {/* ── Content Side (left in RTL) ── */}
              <div className="relative flex flex-col justify-center gap-5 w-full sm:w-[45%] p-6 lg:p-8 order-2 bg-white">
                {/* Icon circle - now styled with primary dark color for premium feel */}
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                  <feature.icon className="w-5 h-5" />
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2 leading-tight">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>

                {/* Tags - updated to match the site's branding with custom hover states */}
                <div className="flex flex-wrap gap-2">
                  {feature.tags.map((tag, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1.5 rounded-xl transition-all duration-300 hover:bg-primary/10 hover:border-primary/20 cursor-default"
                    >
                      <tag.icon className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-xs font-semibold">{tag.text}</span>
                    </div>
                  ))}
                </div>

                {/* Decorative faint background icon */}
                <feature.icon className="absolute bottom-4 left-4 w-24 h-24 text-gray-100/40 pointer-events-none" />
              </div>
            </div>
          </div>
        ))}

        {/* Trailing spacer */}
        <div className="hidden lg:block shrink-0 w-12" />
      </div>
    </section>
  );
}
