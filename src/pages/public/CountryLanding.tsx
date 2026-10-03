import { Link, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { SeoHead } from "@/components/common/SeoHead";
import { getMentorAppUrl } from "@/lib/subdomain";
import { COUNTRIES, findCountry } from "@/lib/countries";

const BRAND = "#32A873";

/**
 * Country-targeted landing page (GEO). One indexable page per Arabic market
 * with localized copy, payment methods and FAQs plus Service/FAQ/Breadcrumb
 * structured data.
 */
const CountryLanding = () => {
  const { countryCode } = useParams<{ countryCode: string }>();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const country = findCountry(countryCode);

  if (!country) return <Navigate to="/" replace />;

  const c = isEn ? country.en : country.ar;
  const path = `/country/${country.code}`;
  const Arrow = isEn ? ArrowRight : ArrowLeft;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: c.title,
    serviceType: isEn ? "Online Course Platform" : "منصة كورسات أونلاين",
    description: c.description,
    provider: { "@id": "https://ebdaey.com/#organization" },
    areaServed: { "@type": "Country", name: c.name, identifier: country.code.toUpperCase() },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: country.currency,
      description: isEn
        ? "Free to join — 8% commission on sales only"
        : "التسجيل مجاني — عمولة ٨٪ فقط على المبيعات",
    },
  };

  const hreflang = COUNTRIES.map((other) => ({
    lang: isEn ? `en-${other.code.toUpperCase()}` : `ar-${other.code.toUpperCase()}`,
    url: `/country/${other.code}`,
  }));

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-zinc-900" dir={isEn ? "ltr" : "rtl"}>
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title={c.title}
        description={c.description}
        path={path}
        locale={isEn ? "en" : "ar"}
        hreflang={hreflang}
        jsonLd={[serviceSchema, faqSchema]}
        breadcrumbs={[
          { name: isEn ? "Home" : "الرئيسية", url: "/" },
          { name: c.name, url: path },
        ]}
      />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-14 md:py-20">
        <header className="mb-14 md:mb-20">
          <span className="text-xs font-bold tracking-[0.25em] uppercase inline-flex items-center gap-2" style={{ color: BRAND }}>
            <img
              src={`https://flagcdn.com/w40/${country.code}.png`}
              srcSet={`https://flagcdn.com/w80/${country.code}.png 2x`}
              alt=""
              className="w-5 h-3.5 object-cover rounded-sm"
              loading="lazy"
            />
            {c.name}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mt-4 mb-5">{c.h1}</h1>
          <p className="text-lg text-zinc-600 max-w-2xl leading-relaxed">{c.intro}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href={getMentorAppUrl("/login")}
              className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-full text-sm md:text-base shadow-lg transition-transform hover:scale-[1.03]"
              style={{ background: BRAND, color: "#ffffff", boxShadow: `0 12px 30px -12px ${BRAND}` }}
            >
              {isEn ? "Start free" : "ابدأ مجاناً"}
              <Arrow className="w-4 h-4" />
            </a>
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-full text-sm md:text-base border border-zinc-300 hover:border-zinc-900 transition-colors"
            >
              {isEn ? "Explore the platform" : "تعرّف على المنصة"}
            </Link>
          </div>
        </header>

        <section className="mb-14 md:mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {isEn ? `Why mentors in ${c.name} choose Ebdaey` : `لماذا يختار المنتور في ${c.name} منصة إبداعي؟`}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {c.benefits.map((b) => (
              <li key={b} className="flex gap-3 bg-white rounded-2xl p-5 border border-zinc-200">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: BRAND }} />
                <span className="text-zinc-700 leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 md:mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {isEn ? `Payments in ${c.name}` : `الدفع في ${c.name}`}
          </h2>
          <p className="text-zinc-600 leading-relaxed max-w-3xl">{c.payments}</p>
        </section>

        <section className="mb-14 md:mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {isEn ? "Frequently asked questions" : "الأسئلة الشائعة"}
          </h2>
          <div className="space-y-4">
            {c.faqs.map((f) => (
              <div key={f.q} className="bg-white rounded-2xl p-5 border border-zinc-200">
                <h3 className="font-bold mb-2">{f.q}</h3>
                <p className="text-zinc-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label={isEn ? "Other countries" : "دول أخرى"} className="mb-6">
          <h2 className="text-lg font-bold mb-4">{isEn ? "Other countries" : "دول أخرى"}</h2>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.filter((x) => x.code !== country.code).map((x) => (
              <Link
                key={x.code}
                to={`/country/${x.code}`}
                className="text-sm px-4 py-2 rounded-full bg-white border border-zinc-200 hover:border-zinc-900 transition-colors"
              >
                <img src={`https://flagcdn.com/w40/${x.code}.png`} alt="" className="inline-block w-4 h-3 object-cover rounded-sm me-1.5 align-middle" loading="lazy" /> {isEn ? x.en.name : x.ar.name}
              </Link>
            ))}
          </div>
        </nav>
      </main>

      <HomeFooter />
    </div>
  );
};

export default CountryLanding;
