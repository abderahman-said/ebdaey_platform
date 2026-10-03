import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const BASE_URL = "https://ebdaey.com";

export interface BreadcrumbEntry {
  name: string;
  url: string;
}

interface SeoHeadProps {
  title: string;
  description: string;
  /** Route path (resolved against ebdaey.com) or an absolute https URL */
  path: string;
  noindex?: boolean;
  image?: string;
  /** Structured data blocks (Course, Product, Person, Event, ...) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Rendered as a BreadcrumbList schema */
  breadcrumbs?: BreadcrumbEntry[];
  /** Language alternates; x-default is added automatically for the canonical */
  hreflang?: { lang: string; url: string }[];
  /** Content language of the page (defaults to Arabic) */
  locale?: "ar" | "en";
  /** Open Graph object type (use "product" for paid products) */
  ogType?: "website" | "product" | "article" | "profile";
  /** Product price meta (og:price / product:price) for commerce previews */
  price?: { amount: number; currency?: string; availability?: "instock" | "oos" };
}

const toAbsolute = (path: string) =>
  /^https?:\/\//i.test(path) ? path : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Per-route <head> tags. Overrides the sitewide defaults from index.html
 * so each route has a unique title, description, canonical, og:url,
 * structured data and language alternates.
 */
export function SeoHead({
  title,
  description,
  path,
  noindex,
  image,
  jsonLd,
  breadcrumbs,
  hreflang,
  locale: localeProp,
  ogType = "website",
  price,
}: SeoHeadProps) {
  const { i18n } = useTranslation();
  // Fall back to the active UI language so English pages are not forced to RTL.
  const locale: "ar" | "en" =
    localeProp ?? (i18n.language?.startsWith("en") ? "en" : "ar");
  const url = toAbsolute(path);
  const blocks: Record<string, unknown>[] = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  if (breadcrumbs && breadcrumbs.length > 0) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: toAbsolute(b.url),
      })),
    });
  }

  const alternates = hreflang ?? [
    { lang: locale === "ar" ? "ar" : "en", url },
    ...(locale === "ar" ? [{ lang: "ar-EG", url }] : []),
  ];

  return (
    <Helmet>
      <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      {price && <meta property="product:price:amount" content={String(price.amount ?? 0)} />}
      {price && <meta property="product:price:currency" content={price.currency ?? "EGP"} />}
      {price && (
        <meta property="product:availability" content={price.availability ?? "instock"} />
      )}
      {price && <meta property="og:price:amount" content={String(price.amount ?? 0)} />}
      {price && <meta property="og:price:currency" content={price.currency ?? "EGP"} />}
      <meta property="og:locale" content={locale === "ar" ? "ar_EG" : "en_US"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta name="twitter:image" content={image} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {alternates.map((a) => (
        <link key={a.lang} rel="alternate" hrefLang={a.lang} href={toAbsolute(a.url)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={url} />
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
