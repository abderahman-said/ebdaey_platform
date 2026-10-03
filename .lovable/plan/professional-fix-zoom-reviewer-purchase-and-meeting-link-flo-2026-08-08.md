# Professional fix: Zoom reviewer purchase and meeting-link flow

## Confirmed state

- The reviewer’s free live-course purchase completed successfully in the database, so the purchase function is not the point of failure.
- The tenant and published live course both exist, so the earlier assumption that a missing tenant row caused the `406` is not supported.
- Three Zoom sessions for this tenant have no meeting ID or join URL, including a future session. The dashboard currently calls link generation without awaiting or inspecting the response.
- The shared Zoom helper catches API/token errors and returns `null`, so a failed refresh or meeting creation looks like success to the dashboard and leaves no durable diagnostic.
- The browser’s `removeChild` exception is a separate client-rendering failure. Its exact trigger must be confirmed from the failing network response and stack before changing page structure.

## Implementation

### 1. Diagnose and harden the free-purchase result page
- Reproduce the reviewer’s exact `/l/<slug>/payment?free=true` flow and capture the `406` request URL, response body, and first React stack frame.
- Replace only the confirmed zero-row `.single()` query with `.maybeSingle()` and render a meaningful missing-data state.
- Keep one stable payment-result root while loading, account checking, success, and failure content changes.
- Add a route-level error boundary so an unexpected client exception produces recovery actions rather than a white screen.
- Check the regular-course and digital-product result pages for the same confirmed query/rendering pattern.

### 2. Make Zoom generation deterministic
- Refactor the shared Zoom helper to return a typed success/failure result instead of swallowing refresh-token and meeting API errors.
- Validate Zoom credentials and token-refresh responses, preserve a rotated refresh token when supplied, and verify the database update succeeds.
- Make `live-session-ensure-zoom` return an explicit outcome: created, already exists, manual link, not connected, or failed.
- Await this result after a mentor saves a session. Show success only when the session save succeeds, and show a separate actionable Zoom error when link creation fails.

### 3. Cover connection order and retries
- After successful Zoom connection, backfill all future Zoom sessions for that tenant that have no join URL, while skipping manual-link and non-Zoom courses.
- Add a compact retry action beside any future Zoom session without a link.
- Persist a sanitized last-generation error and timestamp on the session so support can diagnose failures after runtime logs expire; never persist tokens or secrets.

### 4. Repair and verify the reviewer’s flow
- Run generation for the reviewer’s future session after the error handling is deployed.
- Confirm the session stores both attendee and host URLs.
- Complete the exact free purchase flow in a fresh browser and verify the result page remains visible with no `406` or uncaught DOM exception.
- Verify both orders: connect Zoom then create a session, and create a session then connect Zoom.
- Confirm the student sees the attendee join URL while the mentor-only path retains the host URL.

## Technical scope

- Frontend: live-course payment result, shared result layout/error boundary, live-course session editor.
- Functions: shared Zoom helper, immediate meeting generation, Zoom OAuth callback backfill.
- Database: nullable sanitized Zoom generation error and attempt timestamp on live-course sessions; existing grants and row-security policies remain unchanged.
- Zoom scopes and redirect settings remain unchanged.
