/**
 * Reference number shown to mentors for every payout / balance settlement.
 * Must stay identical everywhere it is displayed (mentor Transfers tab,
 * settlement emails, admin) — it is derived only from the record id.
 */
export const buildPayoutReference = (id: string) =>
  `EBDAEY-${id.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
