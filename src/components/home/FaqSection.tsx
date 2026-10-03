import { useTranslation } from "react-i18next";
import { FaqItem } from "./shared";

interface Faq { q: string; a: string }

export default function FaqSection() {
  const { t } = useTranslation();
  const faqs = t("home.faq.items", { returnObjects: true }) as Faq[];

  return (
    <section className="relative z-10 bg-[#eef7f1] py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: (Array.isArray(faqs) ? faqs : []).map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.25em] text-[#32A873] mb-4" data-aos="fade-up">
            <span className="w-4 h-px bg-[#32A873]" /> {t("home.faq.eyebrow")}
          </span>
          <h2 className="font-noto font-[600] text-4xl sm:text-5xl text-[#0f2e22] !leading-[1.3] tracking-tight" data-aos="fade-up" data-aos-delay="100">
            {t("home.faq.title")}
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          {(Array.isArray(faqs) ? faqs : []).map((faq, i) => (
            <div key={i} data-aos="fade-up" data-aos-delay={i * 60}>
              <FaqItem {...faq} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
