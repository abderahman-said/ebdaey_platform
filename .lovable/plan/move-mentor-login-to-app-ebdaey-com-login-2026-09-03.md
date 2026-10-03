# Move mentor login to app.ebdaey.com/login

Yes, this can be done safely — as long as `/auth` keeps working as an alias so existing links, bookmarks and verification emails don't break.

## What changes

- Mentor login becomes `https://app.ebdaey.com/login`.
- `https://ebdaey.com/auth` and `https://app.ebdaey.com/auth` keep working and forward to the new address (no dead links).
- After login, the mentor still lands on the dashboard at the root of `app.ebdaey.com`.
- Password reset and email-verification links continue to land on a working page.

## Technical steps

1. `src/App.tsx`
   - In `MentorAppRoutes`, add `/login` → `<AuthPage mode="mentor" />`; keep `/auth` as a redirect to `/login`.
   - In `MainRoutes`, change `/auth` to redirect to `getMentorAppUrl("/login")` in subdomain mode, and keep rendering `AuthPage mode="mentor"` in path-based/dev mode (localhost and preview have no subdomains).
   - Add `/login` to the route preload map (`getPreloader`) alongside `/auth`.
2. `src/lib/subdomain.ts` — no signature change needed; use existing `getMentorAppUrl("/login")` for links.
3. Update mentor-facing login links to `mentorAppUrl("/login")`:
   - `src/components/auth/AuthStatusButton.tsx`
   - `src/components/auth/MentorSignupFlow.tsx`
   - any "back to login" links inside `src/pages/auth/AuthPage.tsx`.
4. Email redirect URLs currently use `${window.location.origin}/auth?resume=1` (`AuthPage.tsx`, `MentorSignupFlow.tsx`) and `${window.location.origin}/reset-password`. Since sign-up now happens on `app.ebdaey.com`, origin is already correct; keep them, and the `/auth` alias covers older emails already sent.
5. Admin login at `admin.ebdaey.com/login` and student login (`/account` on mentor sites) are untouched.

## Risks / prerequisites

- `app.ebdaey.com` must keep returning 200 (it currently does). If it ever falls back to the hosting redirect to `ebdaey.com`, mentors could not reach `/login` — the `/auth` alias on the main domain is the safety net for that case.
- Supabase Auth redirect allow-list must include `https://app.ebdaey.com/*`; verify before shipping.
