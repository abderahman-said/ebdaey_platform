# Fix this lost order and make sure paid orders never stay "pending"

## Where things stand

The order in question (Hussein Ali — ISTQB Performance testing course, 999 EGP, 07 Sep 04:53 UTC) is still **pending** with no gateway transaction number and no course access for the customer. Fulfilment (course access, bonuses, emails) only runs when the payment result reaches us, and for this order it never did.

Four other orders from the last three days sit in the same state; some may be real abandonments, some may be the same silent loss. Today we cannot tell them apart, because when we create the payment we do not keep the gateway's own reference for it.

## 1. Read the real result from the gateway now

Ask the payment gateway directly about this order's reference and report exactly what it says (paid / failed / never attempted, amount, transaction number, time). Do the same for the other four pending orders. Every one that the gateway confirms as paid is then completed through our normal completion routine — course access granted, bonuses granted, confirmation emails sent — and the mentor dashboard shows it as completed.

## 2. Keep the gateway reference from the start

At the moment a payment is created, save the gateway's order id and reference on our own record — for recorded courses, live courses and consultations, digital products, and subscriptions alike. From then on any payment can be looked up afterwards with certainty.

## 3. "Check payment with gateway" button in Admin

Every pending row in Admin gets an action that asks the gateway about that single payment, shows the gateway's answer in plain words, and completes the order on the spot if it was really paid.

## 4. Never lose the transaction number

The transaction number is currently only saved when the browser return carries it, so some paid orders end up with an empty reference. It will be read from the gateway result itself and always stored, whichever route confirms the payment.

## 5. Make sure it cannot happen again

- A background check runs every few minutes over all payments still pending from the last 7 days, asks the gateway for the true status, completes the paid ones and marks genuinely failed/expired ones — so a missed notification self-heals within minutes instead of needing a human to notice.
- Every incoming gateway notification is logged, including rejected ones and the reason, so a silent failure becomes visible.
- A daily alert to admin listing any payment the gateway calls paid while our side still shows pending, if the automatic repair ever cannot finish it.

## Technical notes

- Lookups use PayMob transaction inquiry (`/api/ecommerce/orders/transaction_inquiry` by `merchant_order_id`) plus the intention/transaction endpoints for Unified Checkout payments, authenticated with the existing PayMob keys.
- Completion always goes through the existing idempotent helpers `completeOrder`, `completeLiveCoursePurchase`, `completeSubscriptionPurchase`, and the digital-product completion path — no duplicate enrolments or duplicate emails.
- New nullable columns `paymob_order_id` and `paymob_special_reference` on `orders`, `live_course_purchases`, `digital_product_purchases`, `subscription_purchases`; written by `kashier-create-session`, `live-course-checkout`, `digital-product-checkout`, `subscription-checkout` and the shared PayMob helpers (`paymob.ts`, `paymob-iframe.ts`) which currently create and discard the gateway order id.
- New table `payment_callback_log` (RLS + grants, admin read only) written by `paymob-webhook` and `paymob-return`, including the invalid-signature early return.
- New edge function `reconcile-paymob-payments` (service-role, rate-limited): `{ orderId, kind }` for the Admin button, batch mode for a pg_cron schedule every 5 minutes.
- `paymob-return` and `paymob-webhook` updated to persist the transaction id from the inquiry result when the callback payload lacks it.
