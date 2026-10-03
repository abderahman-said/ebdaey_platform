# Roadmap

- [x] Reconnect Google Calendar App User Connector client (new workspace) — client auc_01m2zkeyzzf0ctpbkj6hk8r4j9 linked; 5 gcal edge functions redeployed
- [x] Verify digital product page SEO — Product schema + seller + priceValidUntil confirmed on a published product
- [ ] Offer publish after SEO changes verified
- [x] Reconnect email notifications — project emails re-enabled; notify.ebdaey.com setup complete; DNS intact
- [x] Install bar names the mentor site — banner reads the branded app name from the manifest identity (src/lib/appIdentity.ts)
- [x] Expand SEO/GEO coverage for digital products and consultations — explain instant delivery, previews, Zoom, calendar sync, availability, and appointment management in public content and structured data

- [ ] Multi-currency pricing (EGP, USD, SAR, AED, QAR, GBP, EUR) via Stripe — awaiting plan approval
- [x] Remove exchange rates: per-currency fixed coupons, per-price-row add-on prices, separate USD chart line
- [ ] Stripe card in the mentor payment gateways tab (fees 0.30 USD + 4.4%, 1% FX, 2.5% withdrawal, min 15 USD) — awaiting plan approval
- [x] Price list editor in course, live course, digital product editors
- [x] Stripe card in payment gateways tab
- [x] Price list in subscription plans
- [x] Country price display on public pages
- [x] Stripe checkout for all 4 product types + webhook (needs STRIPE_WEBHOOK_SECRET from user)
- [x] Orders tab currency + separate USD balance
- [x] Admin: record USD payouts (2.5%, min $15 fee)

## In progress
- Redesign payment gateways tab: twin cards, green palette, options MUST carry the exact current card details (titles, fees, methods, terms).
- [x] Correct all mentor product cards to display every saved currency price instead of the legacy EGP value.
