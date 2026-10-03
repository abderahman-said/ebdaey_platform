---
name: Multi-tenancy
description: Wildcard subdomain routing with Cloudflare Worker reverse-proxy in front of Lovable
type: feature
---

## Hosts
- `ebdaey.com` / `www.ebdaey.com` — marketing site + legacy path-based mentor routes (backward compat, redirected by Worker).
- `<mentor>.ebdaey.com` — mentor public site (profile, courses, products, live courses, checkout, student auth + dashboard).
- `app.ebdaey.com` — mentor app (mentor auth + mentor dashboard).
- `admin.ebdaey.com` — admin dashboard.

## How it works
- Cloudflare Worker (`cloudflare-worker/src/worker.ts`) sits in front of all `*.ebdaey.com` requests.
- It reverse-proxies to `ebdaey.lovable.app` with the Host header rewritten — Lovable doesn't natively support wildcard custom domains, but accepts requests on its `.lovable.app` host regardless of original hostname.
- Browser address bar still shows the original subdomain (Worker is transparent).
- `window.location.host` in the SPA is the real subdomain — `src/lib/subdomain.ts` parses it into `{ context, mentorSlug, isSubdomainMode }`.
- `src/App.tsx` mounts a different `<Routes>` tree per host kind. Mentor subdomain routes are short (`/`, `/course/:slug`, etc.) with no `:mentorSlug` param — slug comes from the host.

## Session isolation
- Browser localStorage is per-origin → each mentor subdomain has its own Supabase session. Login on `mentor-a.ebdaey.com` does NOT propagate to `mentor-b.ebdaey.com` or to `app.` / `admin.`. No cookie/code change needed.

## Bot OG previews
- Worker detects social crawler UAs and renders OG meta tags (title + image) from Supabase before the SPA loads.
- Image source: course/product/live = `thumbnail_url` only; mentor profile = `profile_image_url` only. No fallbacks.

## Legacy URL redirects (humans only — bots get inline OG)
- `ebdaey.com/<mentor>` → `https://<mentor>.ebdaey.com/`
- `ebdaey.com/<mentor>/course/<slug>` → `https://<mentor>.ebdaey.com/course/<slug>` (same for product, live)
- `ebdaey.com/app/*` → `https://app.ebdaey.com/*`
- `ebdaey.com/admin/*` → `https://admin.ebdaey.com/*`

## Dev / preview
- On `localhost` and `*.lovable.app`, `isSubdomainMode === false` → path-based routes (`/:mentorSlug/...`, `/app`, `/admin`) still work.

## Deploy
- Worker is dashboard-pasted (no terminal). See `cloudflare-worker/README.md` for DNS records (`A * 185.158.133.1` proxied), Worker routes (`*.ebdaey.com/*`), variables, and Lovable auth redirect URLs.
