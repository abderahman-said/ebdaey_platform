# Remove exchange rates: fixed prices per currency

## What changes for the mentor

1. **Fixed-amount coupons get a currency list.** A fixed coupon has one amount per currency (e.g. 100 EGP, 5 USD, 20 SAR). Percentage coupons stay as they are. If the buyer's currency has no amount set, the coupon is rejected with a clear message. No conversion.
2. **Add-on (order bump) prices follow the main product's price list.** The add-on editor shows every price row of the main product (All countries + each country). The mentor ticks the rows where the add-on is offered and enters an add-on price (and an optional discounted price) for each one. Buyers whose price row is unticked don't see the add-on.
3. **Revenue chart shows USD as its own line** in a new color next to the EGP line. No converting USD into EGP. Totals are shown per currency.
4. **"All countries" is the default row.** The first price row is labelled "All countries" (كل الدول). Any visitor without a country-specific row gets it. All "not specified" / fallback wording goes away.

## What changes for the buyer
- Prices, add-ons and fixed coupons come from what the mentor typed, in the buyer's price-row currency. Nothing is fetched from an exchange-rate service.

## Technical details
- New table `coupon_amounts (coupon_id, currency, amount)`, plus GRANTs and tenant-scoped RLS. The existing `discount_value` stays in use as the EGP amount (backfilled).
- New table `order_bump_prices (bump_type, bump_id, price_row_id → product_prices.id, price, discount_price)`, plus GRANTs and RLS. One row means the add-on is enabled for that price row. Used for both course bumps and digital-product bumps. Existing bumps are backfilled for the default row using their current price.
- Edge functions (kashier-create-session, digital-product-checkout, live-course-checkout, validate-coupon): resolve the buyer's price row, then look up the bump price and coupon amount for that row or currency. Remove `_shared/fx.ts` imports, then delete the file.
- Frontend: delete `src/lib/fx.ts` and `localFromEgp`. The checkout pages and the query modules read the per-row bump price and the per-currency coupon amount.
- Editors: add a currency amounts list to CouponsTab (fixed type). Add a per-row selector to OrderBumpEditor and DigitalProductOrderBumpEditor.
- MentorDashboard chart: add separate `revenueEgp` and `revenueUsd` series, a second line with a new chart color token, and remove `toEgp`.
- PriceListEditor and `resolvePrice`: rename the default label to "All countries".
