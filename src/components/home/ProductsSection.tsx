import { FileText, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

const PlayCircleSolid = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);
const UserChatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    <circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="currentColor" />
  </svg>
);

const items = [
  { key: "recorded", icon: PlayCircleSolid, sku: "PRD—01" },
  { key: "digital", icon: FileText, sku: "PRD—02" },
  { key: "live", icon: Video, sku: "PRD—03" },
  { key: "consulting", icon: UserChatIcon, sku: "PRD—04" },
] as const;

export default function ProductsSection() {
  const { t } = useTranslation();
  return (
    <section className="relative z-10 bg-[#eef7f1] py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="mb-8 sm:mb-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 font-mono text-md uppercase tracking-[0.25em] text-[#32A873] mb-4" data-aos="fade-left">
            <span className="w-4 h-px bg-[#32A873]" /> {t("home.products.eyebrow")}
          </span>
          <h2 className="font-noto font-[600] text-4xl sm:text-5xl md:text-6xl text-[#0f2e22] !leading-[1.3] tracking-tight" data-aos="fade-up" data-aos-delay="100">
            {t("home.products.title1")}
            <br />
            <span className="text-[#32A873]">{t("home.products.title2")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {items.map((p, i) => (
            <div
              key={p.sku}
              data-aos="fade-up"
              data-aos-delay={i * 100}
              className="relative flex bg-white rounded-2xl overflow-hidden border border-[#0f2e22]/10 hover:border-[#32A873]/40 hover:-translate-y-1 hover:shadow-[0_34px_70px_-28px_rgba(15,46,34,0.35)] transition-all duration-300"
            >
              <div className="relative flex-shrink-0 w-24 bg-[#0f2e22] flex flex-col items-center justify-center gap-3 py-6">
                <div className="w-11 h-11 rounded-full bg-[#32A873] flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-mono text-[10px] text-[#eef7f1]/50 tracking-widest" style={{ writingMode: "vertical-rl" }}>
                  {p.sku}
                </span>
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#eef7f1]" />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#eef7f1]" />
              </div>
              <div className="relative flex-1 p-6 flex flex-col justify-center">
                <h3 className="font-noto text-xl font-medium text-[#0f2e22] mb-2">{t(`home.products.items.${p.key}.title`)}</h3>
                <p className="text-sm text-[#0f2e22]/60 leading-relaxed">{t(`home.products.items.${p.key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
