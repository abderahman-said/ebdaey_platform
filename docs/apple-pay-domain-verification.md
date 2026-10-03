# Apple Pay (simple PayMob flow)

We use PayMob's Unified Checkout for Apple Pay. When a customer chooses Apple
Pay, the browser navigates to PayMob's hosted checkout page in the same tab.
PayMob presents the native Apple Pay sheet there, then redirects back to our
payment result page.

## Why we don't need domain verification

Apple's domain verification is only required when the Apple Pay sheet is
triggered from **our own domain** (e.g. inside an iframe on `ebdaey.com`). By
letting PayMob host the sheet on their `accept.paymob.com` checkout page, Apple
Pay works immediately without registering our domains with Apple or PayMob.

## Customer flow

1. Customer taps **Apple Pay** on our checkout page.
2. We call the relevant checkout Edge Function with `payment_method: "apple_pay"`.
3. The Edge Function creates a PayMob intention limited to the Apple Pay
   integration and returns the Unified Checkout URL.
4. We navigate the browser to that URL.
5. Customer completes Face ID / Touch ID on PayMob's page.
6. PayMob redirects back to our `/payment` return route with the result.

## Operational notes

- This works on **every mentor subdomain automatically** because the customer
  leaves our domain and completes payment on PayMob's domain.
- No `apple-developer-merchantid-domain-association` file is required.
- No per-subdomain registration with PayMob is required.

## Testing

Apple Pay cannot be tested in a simulator. On a real iPhone with a real card:

- Apple Pay button appears on Safari/iOS with an active card.
- Tapping it navigates to PayMob's checkout and raises the native sheet.
- Face ID completes the payment and the purchase becomes `completed`.
- Order bumps and gifts are fulfilled exactly as with card.
- Cancelling the sheet leaves the order pending and returns to checkout.
- A decline shows a readable message via our payment result page.
