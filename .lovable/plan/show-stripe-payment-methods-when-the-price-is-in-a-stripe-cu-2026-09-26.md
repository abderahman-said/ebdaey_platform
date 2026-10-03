# Show Stripe payment methods when the price is in a Stripe currency

## Problem
The payment is already sent to Stripe when the price is in USD, EUR or another non-EGP currency. The checkout screen doesn't know that, so it still shows the PayMob options: Cards (with a Meeza logo), E-wallet, and PayMob's Apple Pay.

## Change
On every checkout page (course, live course, digital product, subscription):

- **EGP price**: no change. PayMob options stay as they are: Cards (Visa/Mastercard/Meeza), E-wallet, Apple Pay.
- **Any other currency (Stripe)**:
  - Show one pre-selected option: "Card / Apple Pay / Google Pay", with Visa, Mastercard, Apple Pay and Google Pay logos (the borderless logos already used on the product page).
  - Hide the E-wallet option and PayMob's Apple Pay option.
  - Skip the Egyptian wallet phone check.
- Send the real currency to the ad-tracking "InitiateCheckout" event instead of the fixed "EGP".

## Technical details
- Use `getDisplayCurrency()` (already imported) to get `isStripe = currency !== "EGP"`.
- New shared component `StripePaymentOption` (radio card + logos from PaymentBadges assets).
- When `isStripe`, force `paymentMethod = "card"`. The backend already returns `method: "stripe"` and redirects, so no backend changes are needed.
- Pages: CheckoutPage.tsx, LiveCourseCheckoutPage.tsx, DigitalProductCheckoutPage.tsx, SubscriptionCheckoutPage.tsx.
- Add a translation key for the label in Arabic and English.
