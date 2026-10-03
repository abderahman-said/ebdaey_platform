# Why the duplicate customer email looked accepted

## What actually happened

The change was never saved. The database does refuse two customers with the same email under the same academy, so it rejected your edit — but the screen ignored the rejection, showed the new email in the row, and displayed a success message.

Verified in the database: the customer whose email you edited (the row joined 9/6/2026, phone +19223059807) still has its original email `rifojydy@mailinator.com`. The other customer's email is unchanged too. So no data was corrupted; only the message you saw was wrong.

## What to fix

1. **Report failures instead of faking success.** When saving a customer edit fails, keep the row in edit mode, leave the old values on screen, and show an error message. Only show "updated" and refresh the row after the save truly succeeds.
2. **Friendly message for a duplicate email.** If the failure is because another customer of the same academy already uses that email, say exactly that in Arabic and English instead of a technical error.
3. **Check before saving.** Validate the email looks like a real address, and warn if it already belongs to another customer in the list, before submitting.
4. **Refresh from the database after saving** so the row always reflects what is really stored.

## Technical notes

- File: `src/components/mentor/dashboard/tabs/StudentsTab.tsx`, function `saveStudentEdit` — the `supabase.from("students").update(...)` result is not destructured or checked; local state is patched and a success toast fires unconditionally.
- Constraint already present: `students_tenant_id_email_key UNIQUE (tenant_id, email)`. Postgres error code `23505` maps to the duplicate-email message.
- Add trimmed/lowercased email normalization plus a zod-style format check client side; keep the existing unique constraint as the server-side guard (no schema change needed).
- New i18n keys under `studentsTab.toasts` (e.g. `updateFailed`, `duplicateEmail`, `invalidEmail`) in `src/i18n/locales/ar.json` and `en.json`.
- Note: this edits only the academy's customer record. It does not change the login email of the customer's account, which stays as-is; worth surfacing as a small hint under the email field.
