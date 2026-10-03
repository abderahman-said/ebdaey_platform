# Correct multi-currency prices on product cards

## Goal
Make every mentor product card and table row show the prices actually configured for that product instead of labeling the legacy base value as EGP.

## Changes
- Load each product's saved country/currency price rows alongside courses, live courses, consultations, bundles, and digital products.
- Add one shared compact price-display component that:
  - shows “Free” only when all configured prices are zero;
  - shows the single configured amount with its correct currency;
  - shows every distinct configured currency amount when a product has multiple prices;
  - uses the existing localized money formatting.
- Replace hardcoded EGP labels in both card and table views with this shared display.
- Keep editing, publishing, and checkout pricing behavior unchanged.
- Verify the mentor product lists in Arabic and English, then check the preview build logs.

## Technical details
Price rows come from `product_prices`, keyed by `product_type` and `product_id`. The legacy product `price` remains a fallback only when no saved default row exists.
