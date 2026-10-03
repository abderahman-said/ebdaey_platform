import { useState, type ReactNode } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import pgMastercard from "@/assets/pg-mastercard.svg.asset.json";
import pgVisa from "@/assets/pg-visa.png.asset.json";
import pgMeeza from "@/assets/pg-meeza.png.asset.json";
import pgEtisalat from "@/assets/pg-etisalat.png.asset.json";
import pgOrange from "@/assets/pg-orange.png.asset.json";
import pgVodafone from "@/assets/pg-vodafone.jpeg.asset.json";
import applePayLogo from "@/assets/apple-pay-logo.png.asset.json";
import googlePayLogo from "@/assets/google-pay-logo.png.asset.json";
import googlePayWordmark from "@/assets/google-pay-wordmark.png.asset.json";
import wepayLogo from "@/assets/wepay-logo.png.asset.json";

const PAYMENT_METHODS = [
  { name: "Mastercard", logo: pgMastercard.url },
  { name: "VISA", logo: pgVisa.url },
  { name: "Meeza", logo: pgMeeza.url },
  { name: "e& cash", logo: pgEtisalat.url },
  { name: "We Pay", logo: wepayLogo.url },
  { name: "Orange Cash", logo: pgOrange.url },
  { name: "Vodafone Cash", logo: pgVodafone.url },
  { name: "Apple Pay", logo: applePayLogo.url },
];

export default function PaymentGatewaysTab() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const terms = t("paymentGatewaysTab.termsList", { returnObjects: true }) as string[];

  return (
    <div className="max-w-5xl mx-auto" dir={dir}>
      <div className="grid md:grid-cols-2 gap-5 items-stretch">
        <GatewayCard
          title={t("paymentGatewaysTab.title")}
          subtitle={t("paymentGatewaysTab.subtitle")}
          description={t("paymentGatewaysTab.description")}
          methods={PAYMENT_METHODS.map((m) => ({ ...m, full: m.name === "Apple Pay" }))}
          feePercent="2.00%"
          feeFixed={`2.00 ${t("paymentGatewaysTab.feeCurrency")}`}
          feeLabel={t("paymentGatewaysTab.feeLabel")}
          feeNote={t("paymentGatewaysTab.feeNote")}
          termsLabel={t("paymentGatewaysTab.terms")}
          terms={terms.map((line) => <span key={line}>{line}</span>)}
        />
        <StripeGatewayCard />
      </div>
    </div>
  );
}

function GatewayCard({
  title,
  subtitle,
  description,
  methods,
  feePercent,
  feeFixed,
  feeLabel,
  feeNote,
  termsLabel,
  terms,
  activeLabel,
  extra,
}: {
  title: string;
  subtitle: string;
  description: string;
  methods: { name: string; logo: string; full?: boolean; contain?: boolean }[];
  feePercent: string;
  feeFixed: string;
  feeLabel: string;
  feeNote: string;
  termsLabel: string;
  terms: ReactNode[];
  activeLabel?: string;
  extra?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="relative flex flex-col rounded-3xl border border-emerald-100 bg-card shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100/60 hover:-translate-y-0.5">
      <div className="h-1.5 w-full bg-gradient-to-l from-primary via-emerald-500 to-emerald-700" />

      <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/50">
        <div>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shrink-0 mt-0.5">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
          {activeLabel ?? t("paymentGatewaysTab.active")}
        </span>
      </header>

      <div className="flex flex-col flex-1 px-6 py-5 gap-5">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-2.5">
            {t("paymentGatewaysTab.methodsLabel")}
          </p>
          <MethodGrid methods={methods} />
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-emerald-700/70 mb-1">{feeLabel}</p>
            <div className="flex items-baseline gap-1.5 text-emerald-900">
              <span className="text-2xl font-black tracking-tight">{feePercent}</span>
              <span className="text-xs text-emerald-600 font-semibold">+</span>
              <span className="text-lg font-bold">{feeFixed}</span>
            </div>
          </div>
          <span className="text-[11px] text-emerald-800/70 max-w-[160px] leading-relaxed">{feeNote}</span>
        </div>

        <div>
          <TermsHeader label={termsLabel} />
          <ul className="space-y-2.5 text-sm">
            {terms.map((node, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <TermCheck />
                <span className="text-foreground/80 leading-relaxed">{node}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {extra}
    </section>
  );
}

function StripeGatewayCard() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? STRIPE_COPY.en : STRIPE_COPY.ar;
  const isEn = i18n.language === "en";
  const [countriesOpen, setCountriesOpen] = useState(false);
  const methods = [
    { name: "VISA", logo: pgVisa.url },
    { name: "Mastercard", logo: pgMastercard.url },
    { name: "Apple Pay", logo: applePayLogo.url, full: true },
    { name: "Google Pay", logo: googlePayWordmark.url, full: true, contain: true },
  ];

  return (
    <GatewayCard
      title="Stripe"
      subtitle={c.sub}
      description={c.desc}
      methods={methods}
      feePercent="4.40%"
      feeFixed="0.30 US$"
      feeLabel={c.feeLabel}
      feeNote={c.feeNote}
      termsLabel={c.terms}
      terms={[
        <span key="t1">
          <CountriesTrigger text={c.t1} onOpen={() => setCountriesOpen(true)} />
        </span>,
        <span key="t2">{c.t2}</span>,
        <span key="t3">{c.t3}</span>,
        <span key="t4">{c.t4}</span>,
        <span key="f2"><Rich parts={c.f2} /></span>,
        <span key="w"><Rich parts={c.w} /></span>,
      ]}
      activeLabel={c.active}
      extra={<CountriesDialog open={countriesOpen} onOpenChange={setCountriesOpen} isEn={isEn} />}
    />
  );
}

function MethodGrid({
  methods,
}: {
  methods: { name: string; logo: string; full?: boolean; contain?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {methods.map((m) => (
        <div
          key={m.name}
          className={`aspect-[5/3] rounded-lg border border-border/70 bg-white dark:bg-white hover:border-primary/40 hover:bg-white dark:hover:bg-white transition-colors flex items-center justify-center overflow-hidden ${m.full ? (m.contain ? "p-1" : "p-0") : "p-1"}`}
          title={m.name}
        >
          <img
            src={m.logo}
            alt={m.name}
            className={m.full ? `w-full h-full ${m.contain ? "object-contain" : "object-cover"}` : "max-h-full max-w-full object-contain"}
          />
        </div>
      ))}
    </div>
  );
}

function TermsHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
        <FileText className="w-3.5 h-3.5 text-emerald-600" />
      </div>
      <h2 className="font-bold text-sm">{label}</h2>
    </div>
  );
}

function TermCheck() {
  return (
    <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
    </div>
  );
}

export const SUPPORTED_COUNTRIES = [
  { code: "ae", ar: "الإمارات العربية المتحدة", en: "United Arab Emirates" },
  { code: "at", ar: "النمسا", en: "Austria" },
  { code: "be", ar: "بلجيكا", en: "Belgium" },
  { code: "bg", ar: "بلغاريا", en: "Bulgaria" },
  { code: "bh", ar: "البحرين", en: "Bahrain" },
  { code: "bn", ar: "بروناي دار السلام", en: "Brunei" },
  { code: "cy", ar: "قبرص", en: "Cyprus" },
  { code: "cz", ar: "التشيك", en: "Czechia" },
  { code: "de", ar: "ألمانيا", en: "Germany" },
  { code: "dk", ar: "الدنمارك", en: "Denmark" },
  { code: "dz", ar: "الجزائر", en: "Algeria" },
  { code: "ee", ar: "إستونيا", en: "Estonia" },
  { code: "eg", ar: "مصر", en: "Egypt" },
  { code: "es", ar: "إسبانيا", en: "Spain" },
  { code: "fi", ar: "فنلندا", en: "Finland" },
  { code: "fr", ar: "فرنسا", en: "France" },
  { code: "gr", ar: "اليونان", en: "Greece" },
  { code: "hr", ar: "كرواتيا", en: "Croatia" },
  { code: "hu", ar: "المجر", en: "Hungary" },
  { code: "ie", ar: "أيرلندا", en: "Ireland" },
  { code: "it", ar: "إيطاليا", en: "Italy" },
  { code: "jo", ar: "الأردن", en: "Jordan" },
  { code: "kw", ar: "الكويت", en: "Kuwait" },
  { code: "lv", ar: "لاتفيا", en: "Latvia" },
  { code: "lt", ar: "ليتوانيا", en: "Lithuania" },
  { code: "lu", ar: "لوكسمبورغ", en: "Luxembourg" },
  { code: "ma", ar: "المغرب", en: "Morocco" },
  { code: "mt", ar: "مالطا", en: "Malta" },
  { code: "nl", ar: "هولندا", en: "Netherlands" },
  { code: "om", ar: "عمان", en: "Oman" },
  { code: "pl", ar: "بولندا", en: "Poland" },
  { code: "pt", ar: "البرتغال", en: "Portugal" },
  { code: "qa", ar: "قطر", en: "Qatar" },
  { code: "ro", ar: "رومانيا", en: "Romania" },
  { code: "sa", ar: "السعودية", en: "Saudi Arabia" },
  { code: "se", ar: "السويد", en: "Sweden" },
  { code: "si", ar: "سلوفينيا", en: "Slovenia" },
  { code: "sk", ar: "سلوفاكيا", en: "Slovakia" },
  { code: "tn", ar: "تونس", en: "Tunisia" },
  { code: "tr", ar: "تركيا", en: "Turkey" },
  { code: "gb", ar: "المملكة المتحدة", en: "United Kingdom" },
];

const STRIPE_COPY = {
  ar: {
    active: "مفعل",
    sub: "بطاقات عالمية و Apple Pay",
    desc: "يمكن لعملائك الدفع عن طريق بطاقات ماستركارد وفيزا وأيضاً الدفع بـ Apple Pay و Google Pay",
    methodsLabel: "طرق الدفع المتاحة",
    feeLabel: "رسوم بوابة الدفع",
    feeNote: "تُخصم عند كل عملية دفع ناجحة فقط",
    terms: "الشروط والأحكام",
    t1: "يجب أن يكون حسابك البنكي في إحدى الدول المدعومة",
    t2: "سيتم إرسال المبالغ المحصلة إلى حساب بنكي بالعملة المحلية للدولة المختارة",
    t3: "يجب أن يكون مصرحاً لك بالعمل في الدولة المختارة",
    t4: "سيتم خصم الرسوم التالية عند كل عملية بيع بالإضافة إلى عمولة المنصة",
    f2: ["رسوم تحويل عملة ", "1.00%", " عند التحصيل بعملات غير الدولار الأمريكي"],
    w: ["سيتم خصم رسوم سحب ", "2.50%", " بحد أدنى ", "15.00 US$", " عن كل عملية تحويل إلى حسابك البنكي"],
  },
  en: {
    active: "Active",
    sub: "Global cards with Apple Pay",
    desc: "Your customers can pay with Mastercard and Visa cards, as well as Apple Pay and Google Pay",
    methodsLabel: "Available payment methods",
    feeLabel: "Gateway fee",
    feeNote: "Charged on each successful payment only",
    terms: "Terms & conditions",
    t1: "Your bank account must be in one of the supported countries",
    t2: "Collected funds are paid out to a bank account in the local currency of the selected country",
    t3: "You must be authorized to do business in the selected country",
    t4: "The following fees are deducted from each sale in addition to the platform commission",
    f2: ["Currency conversion fee of ", "1.00%", " when collecting in currencies other than USD"],
    w: ["A withdrawal fee of ", "2.50%", " (minimum ", "US$15.00", ") applies to each transfer to your bank account"],
  },
};

function Rich({ parts }: { parts: string[] }) {
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i} className="font-bold text-foreground">{p}</strong> : <span key={i}>{p}</span>))}</>;
}

function CountriesTrigger({ text, onOpen }: { text: string; onOpen: () => void }) {
  const { i18n } = useTranslation();
  const phrase = i18n.language === "en" ? "supported countries" : "الدول المدعومة";
  const idx = text.indexOf(phrase);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <button
        type="button"
        onClick={onOpen}
        className="text-primary font-bold underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-colors"
      >
        {phrase}
      </button>
      {text.slice(idx + phrase.length)}
    </>
  );
}

function CountriesDialog({
  open,
  onOpenChange,
  isEn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEn: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEn ? "Supported countries" : "الدول المدعومة"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {SUPPORTED_COUNTRIES.map((ct) => (
            <div
              key={ct.code}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <img
                src={`https://flagcdn.com/w40/${ct.code}.png`}
                alt={isEn ? ct.en : ct.ar}
                loading="lazy"
                className="w-6 h-4 object-cover rounded-sm border border-border/40 shrink-0"
              />
              <span className="text-sm leading-snug">{isEn ? ct.en : ct.ar}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
