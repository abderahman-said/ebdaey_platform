const BASE_DOMAIN = "ebdaey.com";

/** Canonical production URL of a mentor site page (always the subdomain form). */
export const mentorCanonical = (mentorSlug: string | undefined, path: string = "/") => {
  if (!mentorSlug) return `https://${BASE_DOMAIN}${path === "/" ? "/" : path}`;
  const tail = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `https://${mentorSlug}.${BASE_DOMAIN}${tail}`;
};

/** Strip HTML and clamp to a meta-description friendly length. */
export const plainText = (html: string | null | undefined, max = 160) => {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

interface RatingInput {
  count: number;
  value: number;
}

export const aggregateRating = ({ count, value }: RatingInput) =>
  count > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: value,
        reviewCount: count,
        bestRating: 5,
        worstRating: 1,
      }
    : undefined;

/** One year ahead — keeps `priceValidUntil` fresh for rich results. */
const oneYearAhead = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export const offerSchema = (
  price: number,
  url: string,
  available = true,
  opts: { sellerName?: string; sellerUrl?: string; currency?: string } = {},
) => ({
  "@type": "Offer",
  price: String(price ?? 0),
  priceCurrency: opts.currency || "EGP",
  url,
  availability: available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
  priceValidUntil: oneYearAhead(),
  ...(Number(price ?? 0) === 0 ? { eligibleQuantity: { "@type": "QuantitativeValue", value: 1 } } : {}),
  seller: opts.sellerName
    ? { "@type": "Person", name: opts.sellerName, ...(opts.sellerUrl ? { url: opts.sellerUrl } : {}) }
    : { "@type": "Organization", name: "إبداعي", url: "https://ebdaey.com" },
});

/** Arabic-market + global audience/area hints — improves local (GEO) relevance. */
export const AUDIENCE_AREA_SERVED = [
  { "@type": "Country", name: "Egypt" },
  { "@type": "Country", name: "Saudi Arabia" },
  { "@type": "Country", name: "United Arab Emirates" },
  { "@type": "Country", name: "Kuwait" },
  { "@type": "Country", name: "Qatar" },
  { "@type": "Country", name: "Jordan" },
  { "@type": "Country", name: "Morocco" },
  { "@type": "Country", name: "Algeria" },
  { "@type": "Country", name: "Tunisia" },
  { "@type": "Country", name: "United States" },
  { "@type": "Country", name: "United Kingdom" },
  { "@type": "Country", name: "Germany" },
  { "@type": "Country", name: "Canada" },
  { "@type": "Country", name: "Australia" },
];

/** FAQPage block shared by every product page. */
export const faqPageSchema = (faqs: { question: string; answer: string }[] | null | undefined) =>
  faqs && faqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: plainText(f.answer, 1000) },
        })),
      }
    : null;


interface ReviewLike {
  first_name?: string | null;
  last_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
}

export const reviewSchemas = (reviews: ReviewLike[], limit = 5) =>
  reviews.slice(0, limit).map((r) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Student",
    },
    reviewRating: { "@type": "Rating", ratingValue: (r as any).rating_v2 ?? r.rating, bestRating: 5, worstRating: 1 },
    ...(r.comment ? { reviewBody: plainText(r.comment, 500) } : {}),
    ...(r.created_at ? { datePublished: r.created_at.slice(0, 10) } : {}),
  }));
