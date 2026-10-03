import { UserPlus, Briefcase, Wallet, ShoppingCart, LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Step = {
  key: "s1" | "s2" | "s3" | "s4";
  Icon: LucideIcon;
  offset?: boolean;
  dark?: boolean;
};

const steps: Step[] = [
  { key: "s1", Icon: UserPlus },
  { key: "s2", Icon: Briefcase, offset: true },
  { key: "s3", Icon: Wallet },
  { key: "s4", Icon: ShoppingCart, offset: true, dark: true },
];

function TicketCard({ step, delay }: { step: Step; delay: number }) {
  const { t } = useTranslation();
  const { Icon, dark } = step;
  return (
    <div
      data-aos="fade-up"
      data-aos-delay={delay}
      className={[
        "relative flex flex-col group transition-colors duration-300",
        step.offset ? "md:mt-8" : "",
        dark ? "bg-[#0f2e22] border border-[#0f2e22]" : "bg-white border border-[#0f2e22]/10 hover:border-[#32A873]",
      ].join(" ")}
    >
      <div className="p-6 pb-4">
        <span className="font-mono text-xs block mb-4 tracking-widest text-[#32A873]">
          {t(`home.steps.items.${step.key}.label`)}
        </span>
        <h3 className={["font-noto text-xl font-bold mb-1", dark ? "text-white" : "text-[#0f2e22]"].join(" ")}>
          {t(`home.steps.items.${step.key}.title`)}
        </h3>
      </div>

      <div className="relative flex items-center py-2" aria-hidden="true">
        <div className="absolute right-0 translate-x-1/2 w-4 h-4 rounded-full bg-[#eef7f1] border border-[#0f2e22]/10 z-10" />
        <div className={["w-full border-t border-dashed mx-4", dark ? "border-white/20" : "border-[#0f2e22]/20"].join(" ")} />
        <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-[#eef7f1] border border-[#0f2e22]/10 z-10" />
      </div>

      <div className="p-6 pt-4 flex-grow flex items-start gap-3">
        <span className={["flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", dark ? "bg-[#32A873]/15" : "bg-[#e6f4ec]"].join(" ")}>
          <Icon className="w-4 h-4 text-[#32A873]" strokeWidth={2} />
        </span>
        <p className={["text-sm leading-relaxed", dark ? "text-white/80" : "text-[#0f2e22]/70"].join(" ")}>
          {t(`home.steps.items.${step.key}.desc`)}
        </p>
      </div>

      {dark && (
        <div className="absolute bottom-2 left-2" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#32A873]">
            <path d="M2 22V14M2 22H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function StepsSection() {
  const { t, i18n } = useTranslation();
  return (
    <section className="relative z-10 bg-[#eef7f1] py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" dir={i18n.dir()}>
        <div className="mb-14 border-r-2 border-[#0f2e22] pr-6" data-aos="fade-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm text-[#0f2e22]/60 tracking-tighter">{t("home.steps.chapter")}</span>
            <div className="h-px w-12 bg-[#0f2e22]/20" />
          </div>
          <h2 className="font-noto text-4xl sm:text-5xl md:text-6xl font-[600] text-[#0f2e22] !leading-[1.2] tracking-tight">
            {t("home.steps.title1")}
            <br />
            <span className="text-[#32A873] italic font-normal">{t("home.steps.title2")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <TicketCard key={s.key} step={s} delay={i * 100} />
          ))}
        </div>

        <div className="mt-10 flex justify-end" data-aos="fade-up">
          <p className="font-mono text-[10px] uppercase text-[#0f2e22]/40 tracking-[0.2em]">{t("home.steps.footer")}</p>
        </div>
      </div>
    </section>
  );
}
