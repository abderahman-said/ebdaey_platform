import { Helmet } from "react-helmet-async";

/**
 * Keeps transactional / private routes (checkout, payment, delivery, booking,
 * lesson player) out of search indexes and AI answer engines, so crawl budget
 * and ranking signals stay on the public product pages.
 */
export function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
}
