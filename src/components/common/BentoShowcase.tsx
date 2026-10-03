import { useTranslation } from "react-i18next";
import bento1 from "@/assets/bento/bento-1.jpg";
import bento2 from "@/assets/bento/bento-2.jpg";
import bento3 from "@/assets/bento/bento-3.jpg";
import bento4 from "@/assets/bento/bento-4.jpg";
import bento5 from "@/assets/bento/bento-5.jpg";
import bento6 from "@/assets/bento/bento-6.jpg";
import bento7 from "@/assets/bento/bento-7.jpg";
import bento8 from "@/assets/bento/bento-8.jpg";

const BentoShowcase = () => {
  const { t } = useTranslation();
  const columns = [
    [
      { src: bento1, alt: t("miscPublic.marketing.bento.alts.dashboard") },
      { src: bento5, alt: t("miscPublic.marketing.bento.alts.mobile") },
    ],
    [
      { src: bento3, alt: t("miscPublic.marketing.bento.alts.analytics") },
      { src: bento6, alt: t("miscPublic.marketing.bento.alts.tools") },
    ],
    [
      { src: bento2, alt: t("miscPublic.marketing.bento.alts.certificates") },
      { src: bento7, alt: t("miscPublic.marketing.bento.alts.payments") },
    ],
    [
      { src: bento4, alt: t("miscPublic.marketing.bento.alts.authoring") },
      { src: bento8, alt: t("miscPublic.marketing.bento.alts.community") },
    ],
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Decorative curves */}
      <svg className="absolute top-0 right-0 w-72 h-72 text-primary/10 -translate-y-1/3 translate-x-1/4 pointer-events-none" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="3" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" />
      </svg>

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/8 border border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest rtl:tracking-normal">
            {t("miscPublic.marketing.bento.badge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground">
            {t("miscPublic.marketing.bento.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t("miscPublic.marketing.bento.subtitle")}
          </p>
        </div>

        {/* 4-column marquee grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 h-[520px] sm:h-[700px] overflow-hidden rounded-3xl">
          {columns.map((col, colIdx) => {
            const goesUp = colIdx % 2 === 0;
            const animClass = goesUp ? "animate-scroll-up" : "animate-scroll-down";

            return (
              <div key={colIdx} className="relative overflow-hidden rounded-2xl">
                <div className={`flex flex-col gap-3 sm:gap-4 ${animClass}`}>
                  {[...col, ...col].map((item, i) => (
                    <div
                      key={i}
                      className="group relative rounded-2xl overflow-hidden shrink-0 aspect-[3/4]"
                    >
                      <img
                        src={item.src}
                        alt={item.alt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <span className="text-white font-bold text-xs sm:text-sm translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                          {item.alt}
                        </span>
                      </div>
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 group-hover:ring-primary/30 transition-all duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="absolute top-0 left-0 right-0 h-16 sm:h-20 md:h-24 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10"></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 md:h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10"></div>
        </div>
      </div>
    </section>
  );
};

export default BentoShowcase;
