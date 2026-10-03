import { useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { TornEdge, Leader, arNum } from "./shared";

export default function PricingSection() {
  const { t } = useTranslation();
  const [price, setPrice] = useState(500);
  const commission = useMemo(() => Math.round(price * 0.08), [price]);
  const net = price - commission;

  return (
    <section className="relative z-10 bg-[#d5ebde] py-16 md:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="mb-8 sm:mb-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.25em] text-[#0f2e22]/60 mb-4" data-aos="fade-left">
            <span className="w-4 h-px bg-[#0f2e22]/60" /> {t("home.pricing.eyebrow")}
          </span>
          <h2 className="font-noto font-[600] text-4xl sm:text-5xl md:text-6xl text-[#0f2e22] !leading-[1.3] tracking-tight" data-aos="fade-up" data-aos-delay="100">
            {t("home.pricing.title1")}
            <br />
            {t("home.pricing.title2")}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-2 order-2 lg:order-1" data-aos="fade-right">
            <label className="block font-mono text-2xl font-medium uppercase tracking-widest text-[#0f2e22]/50 mb-4">
              {t("home.pricing.priceLabel")}
            </label>
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-[#10633e] h-2"
              aria-label={t("home.pricing.sliderAria")}
            />
            <div className="flex justify-between font-mono text-xl text-[#0f2e22]/40 mt-2">
              <span>{arNum(50)}</span>
              <span>{arNum(5000)}</span>
            </div>
            <p className="text-xl text-[#0f2e22]/60 leading-relaxed mt-8">
              <Trans i18nKey="home.pricing.explanation" components={{ b: <strong /> }} />
            </p>
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2" data-aos="fade-left" data-aos-delay="150">
            <div className="relative max-w-md mx-auto">
              <div
                className="pointer-events-none absolute -inset-10 rounded-[2.5rem] opacity-60 animate-pulse"
                style={{ background: "radial-gradient(circle, rgba(50,168,115,0.35) 0%, transparent 70%)", filter: "blur(40px)" }}
                aria-hidden="true"
              />
              <div className="relative shadow-[0_40px_100px_-30px_rgba(15,46,34,0.45)] rounded-sm">
                <TornEdge color="#ffffff" />
                <div className="bg-white px-8 py-8 relative overflow-hidden">
                  <div
                    className="absolute top-6 left-6 w-16 h-16 rounded-full border-2 border-[#b23a2f]/70 flex items-center justify-center text-center"
                    style={{ transform: "rotate(-12deg)" }}
                    aria-hidden="true"
                  >
                    <span className="font-mono text-[8px] leading-tight text-[#b23a2f]/80 uppercase tracking-tight">
                      {t("home.pricing.guaranteed")}
                      <br />
                      {t("home.pricing.hundred")}
                    </span>
                  </div>
                  <div className="text-center mb-6">
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#0f2e22]/40">{t("home.pricing.receipt")}</span>
                  </div>
                  <div className="space-y-3 font-mono text-sm text-[#0f2e22]">
                    <div className="flex items-baseline">
                      <span className="text-[#0f2e22]/60">{t("home.pricing.coursePrice")}</span>
                      <Leader />
                      <span className="tabular-nums">{arNum(price)} {t("home.pricing.currency")}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-[#0f2e22]/60">{t("home.pricing.commission")}</span>
                      <Leader />
                      <span className="tabular-nums">−{arNum(commission)} {t("home.pricing.currency")}</span>
                    </div>
                  </div>
                  <div className="my-6 h-0 border-b-2 border-dashed border-[#0f2e22]/20" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-base font-medium text-[#0f2e22]">{t("home.pricing.net")}</span>
                    <span className="font-display text-4xl sm:text-5xl font-medium text-[#32A873] tabular-nums">{arNum(net)}</span>
                  </div>
                  <p className="font-mono text-sm text-[#0f2e22]/40 mt-1">{t("home.pricing.netNote")}</p>
                  <div className="flex items-end gap-[2px] h-8 mt-8 opacity-70" aria-hidden="true">
                    {[3, 1, 2, 4, 1, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4, 3, 1, 2, 1, 3, 2, 4, 1].map((w, i) => (
                      <span key={i} className="bg-[#0f2e22]" style={{ width: `${w}px`, height: i % 5 === 0 ? "100%" : "70%" }} />
                    ))}
                  </div>
                </div>
                <TornEdge color="#ffffff" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
