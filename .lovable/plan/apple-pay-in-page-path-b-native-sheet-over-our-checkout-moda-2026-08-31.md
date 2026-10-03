# Apple Pay in-page (Path B): native sheet over our checkout modal

Goal: tapping Apple Pay raises the iOS native sheet with Face ID directly over our checkout page, instead of dropping to PayMob's card form or navigating away.

## How Path B works

PayMob's Unified Checkout already runs inside our checkout modal, and the iframe carries the `payment` permission so an Apple Pay sheet triggered inside it presents natively on top of our page. Your account already has the Apple Pay integration provisioned (integration `#5791325`, "MIGS-online (NEXT) (APPLE PAY)"), which is the integration ID our checkout functions send.

The one thing still missing is Apple domain verification. Apple refuses to show the sheet unless the top-level domain the user is on is registered for the merchant, which is why iOS currently falls back to the card form.

## Step 1 — Request domain verification from PayMob (you)

Ask PayMob support, quoting integration `#5791325`, to enable Apple Pay for:

- `ebdaey.com`
- `www.ebdaey.com`
- mentor subdomains — `*.ebdaey.com` if they allow a wildcard, otherwise the list of active mentor subdomains

and to send back the `apple-developer-merchantid-domain-association` file.

## Step 2 — Host the association file (me)

Serve the file exactly as PayMob provides it at:

```text
https://<domain>/.well-known/apple-developer-merchantid-domain-association
```

Requirements this must satisfy:

- served on every checkout host, including mentor subdomains
- no redirect, no HTML wrapper, raw file content only
- reachable over HTTPS with a 200 response

It is added as a static public asset so it is served from the root of every host the app answers on.

## Step 3 — Make the in-modal Apple Pay path robust (me)

- Verify the checkout modal keeps `allow="payment *; publickey-credentials-get *"` on the Unified Checkout iframe so the Apple Pay API is reachable from inside it.
- Keep the "open full page" fallback button in the modal header for browsers that block framing.
- Show the Apple Pay button only when `ApplePaySession.canMakePayments()` is true, as today; everything else keeps the current card and wallet flow untouched.
- Confirm the success and failure return paths from Unified Checkout land on the same payment result page and fulfilment logic as the card flow, so purchases, order bumps and gifts behave identically.

## Step 4 — Test on a real iPhone

Apple Pay cannot be verified in a simulator. Checks on a real device with a real card:

- tapping Apple Pay raises the native sheet with Face ID, correct total and EGP currency
- completing pays and marks the purchase completed, with bump and gift fulfilment firing
- cancelling the sheet returns to checkout with the order still pending and no error screen
- a decline shows a readable message

## Technical notes

- Amount authority stays server-side: platform 8% and gateway 2% + 2 EGP + 14% VAT logic is unchanged; Apple Pay charges the same server-computed total as card.
- Every new mentor subdomain must be added to PayMob's Apple Pay domain list, or Apple Pay on that subdomain silently falls back to card. If PayMob will not grant a wildcard, this becomes a step in mentor onboarding and should be documented in the admin runbook.
- No database schema change; existing purchase records and payment keys carry the flow.

## What is needed from you before Step 2

The association file from PayMob. Until it is hosted, Apple Pay on your domains keeps falling back to the card form.
