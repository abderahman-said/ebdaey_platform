// Keep in sync with src/lib/payoutReference.ts — the mentor must see the exact
// same reference number in the Transfers tab and in the settlement email.
export const buildPayoutReference = (id: string) =>
  `EBDAEY-${id.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
