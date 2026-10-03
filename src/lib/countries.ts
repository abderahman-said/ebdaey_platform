/** Country-targeted (GEO) landing page content for the Arabic markets we serve. */

interface CountryCopy {
  name: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  benefits: string[];
  payments: string;
  faqs: { q: string; a: string }[];
}

export interface Country {
  /** ISO-3166 alpha-2, lowercase — used in the URL */
  code: string;
  flag: string;
  currency: string;
  ar: CountryCopy;
  en: CountryCopy;
}

const commonBenefitsAr = (name: string) => [
  "عمولة ٨٪ فقط على المبيعات، بدون اشتراك شهري ولا رسوم إعداد.",
  "أكاديمية رقمية باسمك ونطاق فرعي خاص بك على إبداعي.",
  "بيع الكورسات المسجلة والمباشرة والمنتجات الرقمية والاستشارات من مكان واحد.",
  "حماية الفيديوهات بعلامة مائية باسم الطالب لمنع التسريب.",
  "شهادات إتمام قابلة للتخصيص واختبارات تفاعلية وتتبع تقدم الطلاب.",
  `صفحات مبيعات وواجهة عربية كاملة مناسبة لجمهورك في ${name}.`,
];

const commonBenefitsEn = (name: string) => [
  "8% commission on sales only — no monthly subscription and no setup fees.",
  "A digital academy under your own name with a dedicated subdomain.",
  "Sell recorded courses, live sessions, digital products and consultations in one place.",
  "Video protection with a per-student watermark to prevent leaks.",
  "Customizable completion certificates, interactive quizzes and student progress tracking.",
  `Sales pages and a fully Arabic interface suited to your audience in ${name}.`,
];

const paymentsAr = (name: string, extra: string) =>
  `تدعم منصة إبداعي بوابتَي دفع: **PayMob** للطلاب في مصر (فيزا، ماستركارد، ميزا، فودافون كاش، اتصالات كاش، أورانج موني بالجنيه المصري)، و**Stripe** للطلاب خارج مصر (فيزا، ماستركارد، Apple Pay، Google Pay). ${extra} يستقبل المنتور في ${name} أرباحه عبر تحويل بنكي بعد طلب السحب من لوحة التحكم.`;

const paymentsEn = (name: string, extra: string) =>
  `Ebdaey supports two payment gateways: **PayMob** for buyers in Egypt (Visa, Mastercard, Meeza, Vodafone Cash, Etisalat Cash, Orange Money in Egyptian pounds), and **Stripe** for international buyers (Visa, Mastercard, Apple Pay, Google Pay). ${extra} Mentors in ${name} receive their earnings by bank transfer after requesting a withdrawal from the dashboard.`;

const faqsAr = (name: string): { q: string; a: string }[] => [
  {
    q: `هل يمكنني بيع كورساتي من ${name} على منصة إبداعي؟`,
    a: `نعم، التسجيل متاح للمنتور في ${name} مجاناً، ويمكنك إنشاء أكاديميتك وبيع كورساتك ومنتجاتك الرقمية واستشاراتك خلال دقائق.`,
  },
  {
    q: "ما تكلفة استخدام المنصة؟",
    a: "لا يوجد اشتراك شهري. المنصة تأخذ عمولة ٨٪ فقط من كل عملية بيع ناجحة، ويبقى لك ٩٢٪ من قيمة المبيعات.",
  },
  {
    q: "كيف أستلم أرباحي؟",
    a: "تُجمع أرباحك في رصيدك داخل لوحة التحكم، وتطلب سحبها في أي وقت ليتم تحويلها إلى حسابك البنكي بعد المراجعة.",
  },
  {
    q: "هل يمكن تقديم كورسات مباشرة أو استشارات؟",
    a: "نعم، يمكنك جدولة كورسات مباشرة وجلسات استشارية عبر زووم مع إنشاء روابط الحضور تلقائياً وإرسال تذكير للطالب قبل الموعد.",
  },
];

const faqsEn = (name: string): { q: string; a: string }[] => [
  {
    q: `Can I sell my courses from ${name} on Ebdaey?`,
    a: `Yes. Signing up from ${name} is free, and you can launch your academy and sell courses, digital products and consultations within minutes.`,
  },
  {
    q: "What does the platform cost?",
    a: "There is no monthly subscription. Ebdaey takes an 8% commission on each successful sale, so you keep 92% of your revenue.",
  },
  {
    q: "How do I get paid?",
    a: "Your earnings collect in your dashboard balance; request a withdrawal at any time and it is transferred to your bank account after review.",
  },
  {
    q: "Can I run live courses or consultations?",
    a: "Yes. You can schedule live courses and one-on-one consultations over Zoom, with join links created automatically and reminders sent before each session.",
  },
];

const build = (
  code: string,
  flag: string,
  nameAr: string,
  nameEn: string,
  paymentExtraAr: string,
  paymentExtraEn: string,
): Country => ({
  code,
  flag,
  currency: "EGP",
  ar: {
    name: nameAr,
    title: `منصة بيع الكورسات في ${nameAr} | إبداعي`,
    description: `إبداعي منصة عربية لبيع الكورسات الأونلاين والمنتجات الرقمية والاستشارات في ${nameAr} بعمولة ٨٪ فقط، بدون اشتراك شهري. أنشئ أكاديميتك الرقمية مجاناً.`,
    h1: `أنشئ أكاديميتك الرقمية وبِع كورساتك في ${nameAr}`,
    intro: `منصة إبداعي تمنح المدربين وصنّاع المحتوى في ${nameAr} كل ما يحتاجونه لبيع الكورسات المسجلة والمباشرة والمنتجات الرقمية والاستشارات الفردية، بواجهة عربية كاملة ومدفوعات آمنة وعمولة ٨٪ فقط.`,
    benefits: commonBenefitsAr(nameAr),
    payments: paymentsAr(nameAr, paymentExtraAr),
    faqs: faqsAr(nameAr),
  },
  en: {
    name: nameEn,
    title: `Sell online courses in ${nameEn} | Ebdaey`,
    description: `Ebdaey is an Arabic platform for selling online courses, digital products and consultations in ${nameEn} with an 8% commission only and no monthly fees. Launch your digital academy free.`,
    h1: `Launch your digital academy and sell courses in ${nameEn}`,
    intro: `Ebdaey gives mentors and creators in ${nameEn} everything they need to sell recorded and live courses, digital products and one-on-one consultations — a fully Arabic interface, secure payments and an 8% commission only.`,
    benefits: commonBenefitsEn(nameEn),
    payments: paymentsEn(nameEn, paymentExtraEn),
    faqs: faqsEn(nameEn),
  },
});

export const COUNTRIES: Country[] = [
  build(
    "eg",
    "🇪🇬",
    "مصر",
    "Egypt",
    "يدفع طلابك في مصر بفيزا وماستركارد وميزا وفودافون كاش واتصالات كاش وأورانج موني بالجنيه المصري عبر PayMob. يمكنك أيضاً تفعيل Stripe لقبول الدفع من طلاب خارج مصر بالدولار أو بعملة أي دولة.",
    "Your students in Egypt pay with Visa, Mastercard, Meeza, Vodafone Cash, Etisalat Cash and Orange Money in Egyptian pounds via PayMob. You can also enable Stripe to accept payments from international students in USD or any supported currency.",
  ),
  build(
    "sa",
    "🇸🇦",
    "السعودية",
    "Saudi Arabia",
    "يمكن لطلابك في السعودية الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالريال السعودي (SAR) أو بالدولار الأمريكي — حسب العملة التي تختارها كمنتور.",
    "Your students in Saudi Arabia can pay via Stripe with Visa, Mastercard and Apple Pay in Saudi riyals (SAR) or in US dollars — depending on the currency you set as the mentor.",
  ),
  build(
    "ae",
    "🇦🇪",
    "الإمارات",
    "the UAE",
    "يمكن لطلابك في الإمارات الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالدرهم الإماراتي (AED) أو بالدولار الأمريكي — حسب العملة التي تختارها كمنتور.",
    "Your students in the UAE can pay via Stripe with Visa, Mastercard and Apple Pay in UAE dirhams (AED) or in US dollars — depending on the currency you set as the mentor.",
  ),
  build(
    "kw",
    "🇰🇼",
    "الكويت",
    "Kuwait",
    "يمكن لطلابك في الكويت الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالدولار الأمريكي أو بأي عملة مدعومة — حسب تسعيرتك كمنتور.",
    "Your students in Kuwait can pay via Stripe with Visa, Mastercard and Apple Pay in US dollars or any supported currency — depending on your pricing as the mentor.",
  ),
  build(
    "qa",
    "🇶🇦",
    "قطر",
    "Qatar",
    "يمكن لطلابك في قطر الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالريال القطري (QAR) أو بالدولار الأمريكي — حسب العملة التي تختارها كمنتور.",
    "Your students in Qatar can pay via Stripe with Visa, Mastercard and Apple Pay in Qatari riyals (QAR) or in US dollars — depending on the currency you set as the mentor.",
  ),
  build(
    "jo",
    "🇯🇴",
    "الأردن",
    "Jordan",
    "يمكن لطلابك في الأردن الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالدولار الأمريكي أو بأي عملة مدعومة — حسب تسعيرتك كمنتور.",
    "Your students in Jordan can pay via Stripe with Visa, Mastercard and Apple Pay in US dollars or any supported currency — depending on your pricing as the mentor.",
  ),
  build(
    "ma",
    "🇲🇦",
    "المغرب",
    "Morocco",
    "يمكن لطلابك في المغرب الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالدولار الأمريكي أو بأي عملة مدعومة — حسب تسعيرتك كمنتور.",
    "Your students in Morocco can pay via Stripe with Visa, Mastercard and Apple Pay in US dollars or any supported currency — depending on your pricing as the mentor.",
  ),
  build(
    "dz",
    "🇩🇿",
    "الجزائر",
    "Algeria",
    "يمكن لطلابك في الجزائر الدفع عبر Stripe بفيزا وماستركارد وApple Pay بالدولار الأمريكي أو بأي عملة مدعومة — حسب تسعيرتك كمنتور.",
    "Your students in Algeria can pay via Stripe with Visa, Mastercard and Apple Pay in US dollars or any supported currency — depending on your pricing as the mentor.",
  ),
];

export const findCountry = (code?: string) =>
  COUNTRIES.find((c) => c.code === (code || "").toLowerCase());
