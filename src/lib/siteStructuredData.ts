import { SITE_SOCIALS } from "@/lib/siteSocials";

const SITE_URL = "https://ebdaey.com";

/**
 * Site-wide Organization structured data. The `sameAs` links connect the
 * brand to its official social accounts — used by Google (knowledge panel)
 * and AI answer engines (GEO) to attribute the brand correctly.
 */
export function organizationJsonLd(locale: "ar" | "en" = "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: locale === "en" ? "Ebdaey" : "إبداعي",
    alternateName: locale === "en" ? "إبداعي" : "Ebdaey",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      locale === "en"
        ? "Ebdaey is an Arabic platform for selling courses and digital products with automatic delivery, and booking consultations with Zoom and Google Calendar integrations. Mentors retain 92% of sales. Supports international selling in USD and multiple currencies via Stripe."
        : "إبداعي منصة عربية لبيع الكورسات والمنتجات الرقمية بتسليم تلقائي، وحجز الاستشارات مع ربط Zoom وGoogle Calendar. يحصل المنتور على 92% من المبيعات. تدعم البيع لجميع دول العالم بالدولار وعملات متعددة عبر Stripe.",
    knowsAbout:
      locale === "en"
        ? [
            "Online course sales",
            "Digital product sales and automatic delivery",
            "One-on-one consultation booking",
            "Zoom meeting automation",
            "Google Calendar appointment scheduling",
            "International payment processing via Stripe (USD, AED, SAR, GBP, EUR, QAR)",
            "Geo-targeted multi-currency pricing",
          ]
        : [
            "بيع الكورسات أونلاين",
            "بيع المنتجات الرقمية وتسليمها تلقائياً",
            "حجز الاستشارات الفردية",
            "إنشاء اجتماعات Zoom تلقائياً",
            "تنظيم المواعيد عبر Google Calendar",
            "الدفع الدولي بالدولار وعملات متعددة عبر Stripe",
            "التسعير الجغرافي متعدد العملات",
          ],
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Aga",
        addressRegion: "Dakahlia",
        addressCountry: "EG",
      },
    },
    areaServed: "Worldwide",
    acceptedPaymentMethod: [
      {
        "@type": "PaymentMethod",
        name: "PayMob",
        description: locale === "en"
          ? "Local Egyptian payments: Visa, Mastercard, Meeza, Vodafone Cash, Etisalat Cash, Orange Money — EGP"
          : "مدفوعات محلية في مصر: فيزا، ماستركارد، ميزا، فودافون كاش، اتصالات كاش، أورانج موني — جنيه مصري",
      },
      {
        "@type": "PaymentMethod",
        name: "Stripe",
        description: locale === "en"
          ? "International payments: Visa, Mastercard, Apple Pay, Google Pay — USD, AED, SAR, GBP, EUR, QAR"
          : "مدفوعات دولية: فيزا، ماستركارد، Apple Pay، Google Pay — دولار، درهم، ريال سعودي، جنيه إسترليني، يورو، ريال قطري",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@ebdaey.com",
        telephone: "+201505925116",
        availableLanguage: ["Arabic", "English"],
      },
    ],
    sameAs: SITE_SOCIALS.map((s) => s.url),
  };
}

/** WebSite schema for the homepage (helps sitelinks and brand queries). */
export function websiteJsonLd(locale: "ar" | "en" = "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: locale === "en" ? "Ebdaey" : "إبداعي",
    inLanguage: locale === "en" ? "en" : "ar-EG",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/** Homepage service catalogue for search engines and AI answer engines. */
export function platformOfferingsJsonLd(locale: "ar" | "en" = "ar") {
  const isEnglish = locale === "en";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/#product-types`,
    name: isEnglish ? "Products and services available on Ebdaey" : "المنتجات والخدمات المتاحة على إبداعي",
    inLanguage: isEnglish ? "en" : "ar-EG",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@type": "Service",
          name: isEnglish ? "Digital product sales" : "بيع المنتجات الرقمية",
          description: isEnglish
            ? "Sell PDFs, ebooks, templates, and downloadable files with free previews, automatic delivery after payment, and secure download links."
            : "بيع ملفات PDF والكتب الإلكترونية والقوالب والملفات القابلة للتنزيل، مع معاينات مجانية وتسليم تلقائي بعد الدفع وروابط تنزيل آمنة.",
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: "MENA",
        },
      },
      {
        "@type": "ListItem",
        position: 2,
        item: {
          "@type": "Service",
          name: isEnglish ? "Online consultation booking" : "حجز الاستشارات أونلاين",
          description: isEnglish
            ? "Manage availability and one-on-one bookings with scheduling conflict prevention, Google Calendar sync, and automatic Zoom meeting links."
            : "إدارة أوقات الإتاحة وحجوزات الاستشارات الفردية مع منع تعارض المواعيد، ومزامنة Google Calendar، وإنشاء روابط Zoom تلقائياً.",
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: "MENA",
        },
      },
    ],
  };
}

/** ContactPage schema for /contact. */
export function contactPageJsonLd(locale: "ar" | "en" = "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${SITE_URL}/contact#contactpage`,
    url: `${SITE_URL}/contact`,
    name: locale === "en" ? "Contact us | Ebdaey" : "تواصل معنا | إبداعي",
    inLanguage: locale === "en" ? "en" : "ar-EG",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };
}

/** AboutPage schema for /about. */
export function aboutPageJsonLd(locale: "ar" | "en" = "ar") {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about#aboutpage`,
    url: `${SITE_URL}/about`,
    name: locale === "en" ? "About | Ebdaey" : "من نحن | إبداعي",
    inLanguage: locale === "en" ? "en" : "ar-EG",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };
}
