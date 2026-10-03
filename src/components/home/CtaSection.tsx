import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Magnetic } from "./shared";

export default function CtaSection() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  return (
    <section className="relative z-10 bg-[#eef7f1] pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="relative bg-[#0f2e22] rounded-[2rem] overflow-hidden" data-aos="fade-up">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#eef7f1 1px, transparent 1px), linear-gradient(90deg, #eef7f1 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-40 pointer-events-none"
            style={{
              background: "radial-gradient(circle,rgba(50,168,115,0.7) 0%,rgba(50,168,115,0.3) 45%,transparent 72%)",
              transform: "translate3d(0,0,0)",
            }}
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 p-10 sm:p-16 items-center">
            <div className="lg:col-span-8">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] mb-6 block" data-aos="fade-up" data-aos-delay="100">
                {t("home.cta.chapter")}
              </span>
              <h2 className="font-noto text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[600] text-[#eef7f1] !leading-[1.4] tracking-tight mb-6" data-aos="fade-up" data-aos-delay="150">
                {t("home.cta.title1")}
                <br />
                <span className="italic text-[#32A873]">{t("home.cta.title2")}</span>
              </h2>
              <p className="text-[#eef7f1]/60 text-base sm:text-lg max-w-lg leading-relaxed" data-aos="fade-up" data-aos-delay="200">
                {t("home.cta.description")}
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4 lg:items-end" data-aos="fade-up" data-aos-delay="250">
              <Magnetic className="w-full lg:w-auto">
                <Link to="/auth?signup=1" className="w-full lg:w-auto block">
                  <button className="group w-full lg:w-auto flex items-center justify-center gap-3 bg-[#32A873] hover:bg-[#2d9765] text-white font-bold text-base px-10 py-5 rounded-2xl shadow-[0_20px_50px_-18px_rgba(50,168,115,0.7)] transition-[background-color,box-shadow] duration-200">
                    {t("common.startFreeCta")}
                    <Arrow className={`w-5 h-5 transition-transform ${isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                  </button>
                </Link>
              </Magnetic>
              <p className="text-[#eef7f1]/40 text-xs font-mono ">{t("common.noCardRequired")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
