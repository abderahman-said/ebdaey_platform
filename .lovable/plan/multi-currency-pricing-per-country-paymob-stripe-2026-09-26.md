# Multi-currency pricing per country (PayMob + Stripe)

## What mentors will see
In the price tab of every course, live course, session, digital product and subscription plan, a **price list** like the reference screenshot:
- One **default price row ("جميع الدول")** that is always there. Its currency can be EGP, USD, SAR, AED, QAR, GBP or EUR.
- **"Add country price"**: pick a country, a currency, a price and an optional pre-discount price. Visitors from that country see that price.
- Each row can be edited or deleted. The default row can't be deleted.
- A platform commission note (8%) shows under the form.

## Payment gateways tab (mentor dashboard)
A new **Stripe** card, next to PayMob, built like the reference image:
- An "مفعل" badge, a note that customers can pay with Visa, Mastercard, Apple Pay and Google Pay, and the card logos.
- Terms: the mentor's bank account must be in a supported country, earnings are paid out in that country's local currency, and the mentor must be allowed to operate there.
- Fees taken on each sale, on top of the platform commission:
  - 0.30 USD + 4.40% per payment
  - 1.00% currency conversion for any currency other than USD
- Withdrawal fee: 2.50%, minimum 15.00 USD, on each transfer to the bank.
- The USD balance and withdrawals use these same fees.

## What buyers will see
- The visitor's country comes from their real connection location, the same check used for the home page language. Their price is the row for their country, or the default row if their country has none.
- Sales pages, product cards, mobile bars and checkout show that currency (for example "$25", "٩٥ ر.س").
- **EGP price → PayMob**, exactly as today (cards, Meeza, wallets).
- **Any other currency → Stripe Checkout** (cards, Apple Pay, Google Pay), then back to the same success page.
- The server works out the price again from the buyer's country, so buyers can't change it.

## Money and reporting
- **Orders tab:** each order shows the currency and amount the buyer actually paid (for example 25 USD).
- **Balances and withdrawals:** Stripe sales go into a separate **USD balance**, using the final USD amount Stripe actually settles, after its fees and conversion. The 8% commission is taken from that amount. EGP stays a separate EGP balance, unchanged.
- Mentors ask for withdrawals from each balance separately.
- Coupons: percentage coupons work in any currency. Fixed-amount coupons stay EGP-only.

## Stripe account
You have a US LLC Stripe account, so I'll connect **your own Stripe account**. A secure form will ask for your Stripe secret key, then I'll set up the payment-confirmation link inside your Stripe dashboard with you. Payouts go to your LLC.

## Build order
1. Database: price rows per product, currency on orders, USD balance.
2. The price-list editor in all 5 editors.
3. Country detection and price display on public pages.
4. Stripe checkout, confirmation handling and success page.
5. Orders tab and USD balance and withdrawals.
6. End-to-end test purchase with a Stripe test card.

## Technical details
- New table `product_prices(id, tenant_id, product_type, product_id, country_code NULL=default, currency, price, compare_at_price, sort_order)`, unique on (product_type, product_id, country_code). RLS: mentor manages own tenant; public read. Existing `price` values are copied in as EGP default rows.
- Add `currency`, `amount_paid`, `gateway ('paymob'|'stripe')`, `stripe_session_id`, `settled_usd` to orders, live_course_purchases, digital_product_purchases and subscription_purchases. Add `currency` to transactions and withdrawal_requests, and balance math grouped by currency.
- Shared `_shared/pricing.ts`: resolveProductPrice(product, countryCode) used by all checkout functions. Country comes from `cf-ipcountry` / `detectCountry`.
- New edge functions `stripe-checkout` (creates a Checkout Session and records the order as pending) and `stripe-webhook` (verifies the signature on `checkout.session.completed`, reads the balance_transaction net USD, marks the order paid and runs record_purchase_transactions in USD). They use the existing enrollment/delivery logic.
- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Frontend `usePrice(productType, id)` hook and a `formatMoney(amount, currency)` helper that replaces the hardcoded ج.م in toArPrice.
