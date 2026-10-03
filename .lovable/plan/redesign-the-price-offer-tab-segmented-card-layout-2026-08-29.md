# Redesign the "Price & Offer" tab — Segmented card layout

Rebuild the pricing/display tab of the course editor as one single rounded card with clearly separated segments, replacing today's four competing boxes.

## Structure (chosen direction: Segmented card layout)

One `rounded-3xl` card with a soft shadow, containing:

**Header** — "السعر والعرض" title + one-line subtitle.

**1. Pricing details** — accent bar + section title, then two fields side by side:
- Course price with the currency suffix rendered inside the field.
- Price before discount (optional), with a live "وفر ٥٠٪" chip sitting above the field, right of its label.
- The separate "الحالي: ٦٥٠ ج.م -٥٠٪" summary pill is removed — the inputs are now the source of truth.

**2. Visibility & order** — a bordered band with two soft-filled rows:
- "منتج غير مدرج" title + description + switch.
- "ترتيب الظهور في صفحة الملف الشخصي" title + hint + the compact −/+ stepper.

**3. Purchase button texts** — accent bar + section title, two plain inputs:
- Sales-page buy button text, card button text; the page context moves into the label (no badge chips).

**4. Free gift** — a tinted accent panel: icon tile + title + description + switch, with the existing `GiftPicker` expanding below a divider when enabled. The nested duplicate card wrapper is removed.

## Technical notes

- Scope: only the `pricing` TabsContent in `src/components/mentor/CourseEditor.tsx` (~lines 2606–2843).
- No footer save bar is added — the editor keeps its existing save mechanism.
- No state, handler or save-logic changes: `coursePrice`, `priceBeforeDiscount`, `isUnlisted`, `displayOrder`, `buyButtonText`, `cardButtonText`, `giftCourseEnabled`, `giftItems` keep their exact wiring.
- The prototype's indigo/slate palette is mapped onto the project's semantic tokens (`primary`, `muted`, `card`, `border`, `foreground`) so light/dark and mentor theme colors keep working — no hardcoded color classes.
- Existing `t("courseEditor.*")` keys reused; add keys only for the savings chip and hint lines, in both `ar.json` and `en.json`.
- RTL and `toAr()` number formatting preserved.

## Not included

Digital product and live course editors keep their current pricing UI unless you want the same treatment there afterwards.
