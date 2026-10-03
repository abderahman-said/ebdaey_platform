# Fix consultation bundle creation

## Change
- Update the `live_courses.product_type` validation constraint to allow `session_bundle` alongside `live_course` and `consultation`.
- Preserve all existing rows, permissions, and row-level access rules.

## Verification
- Confirm the final database constraint includes all three supported values.
- Create a bundle through the real mentor flow and confirm it persists with `product_type = session_bundle`.

## Technical details
This is a database constraint mismatch, not a permissions error. The frontend already submits the intended `session_bundle` value.
