# Remove the manual "Generate link" button, replace with automatic generation

## Goal

Mentors should never have to press a button to create a Zoom meeting link. The link is created automatically, and retried automatically when a first attempt fails.

## What changes

1. Remove the manual "Generate link" button from the live course schedule editor.
2. Keep automatic generation on save (already in place) and add automatic recovery:
   - When the schedule tab loads, any future Zoom session that still has no join link automatically triggers link generation once, in the background, one session at a time.
   - If a generation attempt fails, retry automatically after a short delay (two attempts, a few seconds apart) instead of asking the mentor to click.
   - Only future sessions of Zoom-based courses are attempted; past sessions and manual-link courses are skipped.
3. Replace the manual error line with a quiet status line under the session:
   - while generating: "Creating meeting link…"
   - link ready: nothing shown (link already used elsewhere)
   - all automatic attempts failed: the existing short failure message, unchanged in wording.
4. No success toast for background generation, so the dashboard stays quiet; failures on explicit save still show the existing toast.

## Technical notes

- File: `src/components/mentor/LiveCourseEditor.tsx`
  - Drop the button block and the `RefreshCw` usage tied to it.
  - Add per-session in-flight/attempt tracking so an auto-attempt is never duplicated (React strict double-render safe) and add a guarded effect that walks pending sessions sequentially.
  - Reuse the existing `ensureZoomLink` helper; add a `silent` flag so background attempts don't toast.
- Backend stays as is: `live-session-ensure-zoom` and the OAuth-callback backfill already handle creation and connection-order cases.
- Translation keys: the `generateZoomLink` string becomes unused; add a "creating link" status string in `en.json` and `ar.json`.
