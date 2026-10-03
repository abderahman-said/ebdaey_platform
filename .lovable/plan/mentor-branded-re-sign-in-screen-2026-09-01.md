# Mentor-Branded Re-Sign-In Screen

Replace the bare "يجب تسجيل الدخول أولاً" gate that students hit when their session ends with a branded, reassuring screen using the selected "Branded mentor gateway" direction.

## What the student sees

- Mentor avatar/logo in a circular frame (falls back to the academy initial when no image).
- Academy name in the mentor's brand color.
- Heading "انتهت الجلسة" and a short line "يرجى تسجيل الدخول مرة أخرى للمتابعة."
- Primary sign-in button in the mentor's brand color, sending the student to the mentor's login.
- Secondary text link back to the academy home page.
- Small "powered by ebdaey" footer line.
- Full RTL/LTR support, following the mentor's public language.

## Implementation

- New component `src/components/auth/SessionExpiredGate.tsx` — centered layout matching the selected prototype, built with semantic tokens (`bg-background`, `text-primary`, `bg-primary`, `text-muted-foreground`) so the mentor's `--primary` (already injected by `TenantThemeInjector`) drives the accents. Props: mentor name, image, sign-in handler, home link.
- `src/pages/student/StudentDashboard.tsx` (lines 470-479) — swap the current `!user` block for the new component, reusing the already-fetched `tenantName` / `tenantImage` and `urls.studentAuthUrl()` / `urls.profileUrl()`.
- Reuse the same component on the other student-facing gated routes so the experience is consistent: lesson viewer, session bundle booking page, content bank, and digital product delivery page (only where a signed-out gate currently renders).
- Add translation keys under `miscPublic.sessionGate` in `miscPublic.ar.json` / `miscPublic.en.json`: title, subtitle, signIn, backHome, poweredBy.

## Notes

No auth logic changes — the existing cross-subdomain session recovery in `useAuth` stays as is; this is presentation only.
