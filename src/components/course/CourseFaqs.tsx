import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Faq {
  question: string;
  answer: string;
}

const CourseFaqs = ({ faqs }: { faqs: Faq[] }) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  return (
    <div id="section-faqs" className="scroll-mt-20">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          {t("coursePage.faqs.title")}
        </h2>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="bg-white/70 border border-border/30 rounded-xl overflow-hidden px-4"
          >
            <AccordionTrigger className="text-sm sm:text-base font-semibold text-foreground hover:no-underline py-4">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              <div
                className={`${isEn ? "text-start" : "text-end"} prose prose-sm max-w-none`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.answer || "") }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CourseFaqs;
