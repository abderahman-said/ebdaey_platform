---
name: Free Gift Addition
description: Multi-type free gift system for purchases (courses, live courses, digital products, consultations)
type: feature
---
**Storage**: Two junction tables — `gift_courses` (linked to recorded course or live course buyers) and `digital_product_gift_courses` (linked to digital product buyers). Both share a polymorphic shape:
- `gift_kind` text: `course | live_course | digital_product | consultation`
- `gift_course_id` / `gift_live_course_id` / `gift_digital_product_id` (exactly one populated; consultation also uses live_course_id since consultations live in `live_courses` with `product_type='consultation'`)
- For `digital_product_gift_courses`: legacy `course_id`, plus `live_course_id` and `digital_product_gift_id`

**UI**: Reusable `GiftPicker` component (`src/components/mentor/GiftPicker.tsx`) with 4 tabs renders all available tenant items. Shared helpers live in `src/lib/giftItems.ts` (`loadGiftCoursesFor`, `saveGiftCoursesFor`, `loadDigitalProductGifts`, `saveDigitalProductGifts`, `fetchGiftDisplays`). All three editors (`CourseEditor`, `LiveCourseEditor`, `DigitalProductEditor`) share this picker.

**Display**: `CourseGiftCourses` accepts `GiftDisplay[]` and renders a kind badge on each card; link path follows item kind (`/course/:slug`, `/live/:slug`, `/product/:slug`).

**Auto-enrollment (webhook)**: Currently kashier/paymob webhooks only auto-enroll `course` kind into `enrollments`. Other kinds are marketed but not auto-delivered — add granting logic when extending.
