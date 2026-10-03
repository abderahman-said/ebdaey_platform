/**
 * Ebdaey edge front-door (single-file Cloudflare Worker).
 *
 * Sits in front of ALL ebdaey.com hostnames (*.ebdaey.com, ebdaey.com, www).
 *
 * Responsibilities:
 *   1. Reverse-proxy every request to the Lovable origin, rewriting the
 *      Host header so Lovable serves the SPA (Lovable can't natively
 *      accept wildcard custom domains, so we pretend to be ebdaey.com).
 *   2. For social crawlers, render per-page OG meta tags (image + title)
 *      from Supabase before the SPA loads.
 *   3. Redirect legacy `ebdaey.com/<mentor>/...` paths to the new
 *      `<mentor>.ebdaey.com/...` subdomain (humans only — bots get inline
 *      OG so they can scrape the preview without an extra hop).
 *   4. Route `app.ebdaey.com` and `admin.ebdaey.com` straight to the SPA.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ORIGIN_HOST: string;          // ebdaey.lovable.app
  SITE_URL?: string;            // https://ebdaey.com
}

const BASE_DOMAIN = "ebdaey.com";
const ORIGIN_RESOLVE_HOST = `lovable-origin.${BASE_DOMAIN}`;
const RESERVED_SUBS = new Set(["", "www", "app", "admin", "api", "mail", "email", "static", "assets"]);
const RESERVED_ROOT_PATHS = new Set([
  "", "auth", "admin-login", "reset-password", "app", "admin",
  "privacy-policy", "terms", "refund-policy", "contact", "about",
  "delivery-policy", "verify", "mentor", "country", "zoom-integration", "zoom", "sell-internationally",
  "assets", "static", "api", "functions", "favicon.ico", "robots.txt", "sitemap.xml",
]);

// ── Bot detection ────────────────────────────────────────────────
const BOT_UA_REGEX = new RegExp(
  [
    "facebookexternalhit", "Facebot",
    "Twitterbot", "LinkedInBot",
    "Slackbot", "Slack-ImgProxy",
    "TelegramBot", "WhatsApp",
    "Discordbot", "Pinterest", "redditbot",
    "Googlebot", "Google-InspectionTool", "Bingbot", "DuckDuckBot",
    "YandexBot", "Baiduspider", "Applebot",
    "vkShare", "W3C_Validator",
    "Embedly", "quora link preview", "outbrain", "nuzzel",
    "SkypeUriPreview", "Iframely",
  ].join("|"),
  "i",
);
const isBot = (req: Request) => BOT_UA_REGEX.test(req.headers.get("user-agent") || "");

// ── Host parsing ─────────────────────────────────────────────────
type HostKind = "marketing" | "mentor" | "app" | "admin" | "other";
function parseHost(host: string): { kind: HostKind; mentorSlug?: string } {
  const h = (host || "").toLowerCase().split(":")[0];
  if (h === BASE_DOMAIN || h === `www.${BASE_DOMAIN}`) return { kind: "marketing" };
  if (h === `app.${BASE_DOMAIN}`) return { kind: "app" };
  if (h === `admin.${BASE_DOMAIN}`) return { kind: "admin" };
  if (h.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = h.slice(0, -BASE_DOMAIN.length - 1);
    if (sub && !sub.includes(".") && !RESERVED_SUBS.has(sub)) {
      return { kind: "mentor", mentorSlug: sub };
    }
  }
  return { kind: "other" };
}

// ── HTML helpers ─────────────────────────────────────────────────
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
const stripHtml = (s?: string | null) =>
  (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const truncate = (s: string, max = 200) => {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
};

interface MetaInput {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article" | "product";
  siteName?: string;
}

function renderMetaHtml(m: MetaInput): string {
  const t = escapeHtml(m.title);
  const d = escapeHtml(truncate(m.description));
  const u = escapeHtml(m.url);
  const img = m.image ? escapeHtml(m.image) : "";
  const type = m.type || "website";
  const site = escapeHtml(m.siteName || "Ebdaey");
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${u}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="${site}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${u}" />
    ${img ? `<meta property="og:image" content="${img}" />
    <meta property="og:image:secure_url" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ""}
    <meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    ${img ? `<meta name="twitter:image" content="${img}" />` : ""}
    <meta http-equiv="refresh" content="0; url=${u}" />
  </head>
  <body><h1>${t}</h1><p>${d}</p><p><a href="${u}">${u}</a></p></body>
</html>`;
}

// ── Supabase REST ────────────────────────────────────────────────
async function sb<T = any>(env: Env, path: string): Promise<T | null> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  return (Array.isArray(data) && data.length ? data[0] : null) as T | null;
}

interface TenantRow {
  id: string; name: string; slug: string;
  profile_image_url?: string | null; bio?: string | null;
}
interface ItemRow {
  title: string; description?: string | null;
  thumbnail_url?: string | null; landing_subheader?: string | null;
  product_type?: string | null;
}

const getTenant = (env: Env, slug: string) =>
  sb<TenantRow>(env, `public_tenants?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,profile_image_url,bio&limit=1`);

const getItem = (env: Env, table: "courses" | "digital_products" | "live_courses", tenantId: string, slug: string) =>
  sb<ItemRow>(env, `${table}?tenant_id=eq.${tenantId}&slug=eq.${encodeURIComponent(slug)}&select=title,description,thumbnail_url,landing_subheader${table === "live_courses" ? ",product_type" : ""}&limit=1`);

// ── OG resolver ──────────────────────────────────────────────────
async function resolveMentorMeta(
  env: Env,
  fullUrl: string,
  mentorSlug: string,
  pathParts: string[],
): Promise<MetaInput | null> {
  const tenant = await getTenant(env, mentorSlug);
  if (!tenant) return null;

  const itemRoutes = {
    c: "courses", course: "courses",
    p: "digital_products", I: "digital_products", product: "digital_products",
    l: "live_courses", live: "live_courses",
  } as const;
  const segment = pathParts[0] as keyof typeof itemRoutes | undefined;

  if (segment && itemRoutes[segment] && pathParts[1]) {
    const item = await getItem(env, itemRoutes[segment], tenant.id, pathParts[1]);
    if (!item) return null;
    const defaultDesc =
      segment === "c" || segment === "course"
        ? `كورس ${item.title} مع ${tenant.name} على منصة إبداعي`
        : segment === "p" || segment === "product" || segment === "I"
        ? `${item.title} — منتج رقمي من ${tenant.name}`
        : `${item.product_type === "consultation" ? "جلسة استشارية" : "كورس مباشر"} مع ${tenant.name} على منصة إبداعي`;
    return {
      title: `${item.title} — ${tenant.name}`,
      description: stripHtml(item.landing_subheader || item.description) || defaultDesc,
      image: item.thumbnail_url || undefined,
      url: fullUrl,
      type: "product",
      siteName: tenant.name,
    };
  }

  // Mentor profile root.
  return {
    title: `${tenant.name} — إبداعي`,
    description: stripHtml(tenant.bio) || `صفحة ${tenant.name} على منصة إبداعي — كورسات، منتجات رقمية، استشارات`,
    image: tenant.profile_image_url || undefined,
    url: fullUrl,
    type: "website",
    siteName: tenant.name,
  };
}

// ── Live sitemap (always reflects published content) ──────────────
async function sbList<T = any>(env: Env, path: string): Promise<T[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as T[]) : [];
}

const xmlEsc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface SitemapProduct {
  slug: string;
  title?: string | null;
  updated_at?: string | null;
  tenant_id: string;
  thumbnail_url?: string | null;
  is_unlisted?: boolean | null;
}

const STATIC_SITEMAP_PATHS: Array<[string, string, string]> = [
  ["/", "weekly", "1.0"],
  ["/about", "monthly", "0.6"],
  ["/contact", "monthly", "0.6"],
  ["/auth", "monthly", "0.5"],
  ["/terms", "yearly", "0.3"],
  ["/privacy-policy", "yearly", "0.3"],
  ["/delivery-policy", "yearly", "0.3"],
  ["/refund-policy", "yearly", "0.3"],
  ["/sell-internationally", "weekly", "0.8"],
  ...(["eg", "sa", "ae", "kw", "qa", "jo", "ma", "dz"].map(
    (code) => [`/country/${code}`, "monthly", "0.7"] as [string, string, string],
  )),
];

async function buildLiveSitemap(env: Env): Promise<string | null> {
  const productSelect = "select=slug,title,updated_at,tenant_id,thumbnail_url,is_unlisted&is_published=eq.true";
  const [tenants, courses, live, products] = await Promise.all([
    sbList<TenantRow & { created_at?: string }>(
      env,
      "public_tenants?select=id,name,slug,profile_image_url,created_at&is_active=eq.true",
    ),
    sbList<SitemapProduct>(env, `courses?${productSelect}`),
    sbList<SitemapProduct>(env, `live_courses?${productSelect}`),
    sbList<SitemapProduct>(env, `digital_products?${productSelect}`),
  ]);
  if (!tenants.length) return null;

  const slugById = new Map(tenants.map((t) => [t.id, t.slug]));
  const blocks: string[] = [];

  const push = (
    loc: string,
    changefreq: string,
    priority: string,
    lastmod?: string | null,
    image?: { loc: string; title?: string | null } | null,
  ) => {
    blocks.push(
      [
        `  <url>`,
        `    <loc>${xmlEsc(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : null,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        image?.loc
          ? [
              `    <image:image>`,
              `      <image:loc>${xmlEsc(image.loc)}</image:loc>`,
              image.title ? `      <image:title>${xmlEsc(image.title)}</image:title>` : null,
              `      <image:geo_location>Egypt</image:geo_location>`,
              `    </image:image>`,
            ]
              .filter(Boolean)
              .join("\n")
          : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  };

  for (const [path, changefreq, priority] of STATIC_SITEMAP_PATHS) {
    push(`https://${BASE_DOMAIN}${path}`, changefreq, priority);
  }
  for (const t of tenants) {
    if (!t.slug) continue;
    push(`https://${t.slug}.${BASE_DOMAIN}/`, "weekly", "0.9", t.created_at, {
      loc: t.profile_image_url || "",
      title: t.name,
    });
  }
  const productGroups: Array<[SitemapProduct[], string, string]> = [
    [courses, "c", "0.8"],
    [live, "l", "0.8"],
    [products, "p", "0.7"],
  ];
  for (const [rows, prefix, priority] of productGroups) {
    for (const r of rows) {
      const slug = slugById.get(r.tenant_id);
      if (!slug || !r.slug || r.is_unlisted) continue;
      push(`https://${slug}.${BASE_DOMAIN}/${prefix}/${r.slug}`, "weekly", priority, r.updated_at, {
        loc: r.thumbnail_url || "",
        title: r.title,
      });
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...blocks,
    `</urlset>`,
    ``,
  ].join("\n");
}



// ── Worker entry ─────────────────────────────────────────────────
// ── Edge rate limiting (abuse / L7 flood protection) ─────────────
// Per-isolate sliding counters. Cheap, no external state, and enough to blunt
// single-source floods before they reach the origin or the backend.
type Bucket = { hits: number; reset: number };
const rlBuckets = new Map<string, Bucket>();

const RL_RULES: Array<{ test: (u: URL, m: string) => boolean; max: number; windowMs: number }> = [
  // Backend / function calls and any mutating request: strictest.
  { test: (u, m) => m !== "GET" && m !== "HEAD", max: 60, windowMs: 60_000 },
  { test: (u) => u.pathname.startsWith("/functions/") || u.pathname.startsWith("/api/"), max: 90, windowMs: 60_000 },
  // Auth surfaces — credential stuffing / password spraying.
  { test: (u) => /^\/(auth|login|admin-login|reset-password)/.test(u.pathname), max: 40, windowMs: 60_000 },
  // Generic page traffic.
  { test: () => true, max: 300, windowMs: 60_000 },
];

const STATIC_RE = /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|map|json|txt|xml|mp4|webm)$/i;

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

function rateLimited(request: Request, url: URL): number | null {
  // Never throttle static assets (a single page load pulls dozens) or bots we
  // deliberately serve OG meta to.
  if (STATIC_RE.test(url.pathname) || isBot(request)) return null;

  const ip = clientIp(request);
  if (ip === "unknown") return null;

  const rule = RL_RULES.find((r) => r.test(url, request.method))!;
  const key = `${ip}|${rule.max}|${rule.windowMs}`;
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded.
  if (rlBuckets.size > 5000) {
    for (const [k, b] of rlBuckets) if (b.reset <= now) rlBuckets.delete(k);
  }

  const bucket = rlBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    rlBuckets.set(key, { hits: 1, reset: now + rule.windowMs });
    return null;
  }
  bucket.hits += 1;
  if (bucket.hits > rule.max) return Math.max(1, Math.ceil((bucket.reset - now) / 1000));
  return null;
}

function tooManyRequests(retryAfter: number): Response {
  return new Response("Too many requests. Please slow down and try again shortly.", {
    status: 429,
    headers: {
      "retry-after": String(retryAfter),
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-ebdaey-worker": "rate-limited",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = parseHost(url.host);

    const retryAfter = rateLimited(request, url);
    if (retryAfter !== null) return tooManyRequests(retryAfter);

    // Non-GET/HEAD → straight passthrough.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return passthrough(request, env);
    }

    // Live sitemap — generated on the edge so new products are listed instantly.
    if (url.pathname === "/sitemap.xml") {
      try {
        const xml = await buildLiveSitemap(env);
        if (xml) {
          return new Response(xml, {
            status: 200,
            headers: {
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=900, s-maxage=1800",
              "x-ebdaey-sitemap": "live",
            },
          });
        }
      } catch {}
      // Fall back to the build-time public/sitemap.xml on the origin.
      return passthrough(request, env);
    }

    // Static/asset/API → passthrough (never OG).

    if (
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/static/") ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/functions/") ||
      /\.[a-z0-9]{2,5}$/i.test(url.pathname)
    ) {
      return passthrough(request, env);
    }

    const parts = url.pathname.split("/").filter(Boolean);

    // ─── Marketing root (ebdaey.com / www) ──────────────────────
    if (host.kind === "marketing") {
      // Legacy /app/* and /admin/* → subdomain (humans only).
      if (parts[0] === "app" && !isBot(request)) {
        return redirect(`https://app.${BASE_DOMAIN}/${parts.slice(1).join("/")}${url.search}`);
      }
      if (parts[0] === "admin" && !isBot(request)) {
        return redirect(`https://admin.${BASE_DOMAIN}/${parts.slice(1).join("/")}${url.search}`);
      }
      // Legacy /mentor/<slug>/... → subdomain.
      let legacyMentorSlug: string | undefined;
      let legacyTail: string[] = [];
      if (parts[0] === "mentor" && parts[1]) {
        legacyMentorSlug = parts[1];
        legacyTail = parts.slice(2);
      } else if (parts[0] && !RESERVED_ROOT_PATHS.has(parts[0])) {
        legacyMentorSlug = parts[0];
        legacyTail = parts.slice(1);
      }
      if (legacyMentorSlug) {
        if (isBot(request)) {
          // Render OG using the OLD URL so old shared links keep previews.
          try {
            const fullUrl = `https://${legacyMentorSlug}.${BASE_DOMAIN}/${legacyTail.join("/")}`.replace(/\/$/, "") || `https://${legacyMentorSlug}.${BASE_DOMAIN}/`;
            const meta = await resolveMentorMeta(env, fullUrl, legacyMentorSlug, legacyTail);
            if (meta) return renderResponse(meta);
          } catch {}
        }
        const target = `https://${legacyMentorSlug}.${BASE_DOMAIN}/${legacyTail.join("/")}${url.search}`;
        return redirect(target.replace(/\/(\?|$)/, "$1"));
      }
      return passthrough(request, env);
    }

    // ─── Mentor subdomain ───────────────────────────────────────
    if (host.kind === "mentor" && host.mentorSlug) {
      if (isBot(request)) {
        try {
          const meta = await resolveMentorMeta(env, url.toString(), host.mentorSlug, parts);
          if (meta) return renderResponse(meta);
        } catch {}
      }
      return passthrough(request, env);
    }

    // ─── app / admin / other → passthrough ──────────────────────
    return passthrough(request, env);
  },
};

function renderResponse(meta: MetaInput): Response {
  return new Response(renderMetaHtml(meta), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
      "x-prerender": "ebdaey-og-worker",
    },
  });
}

function redirect(location: string): Response {
  return new Response(null, { status: 301, headers: { location, "cache-control": "public, max-age=3600" } });
}

async function passthrough(request: Request, env: Env): Promise<Response> {
  const incoming = new URL(request.url);
  const publicHost = incoming.host;

  const originUrl = new URL(incoming.toString());
  originUrl.host = BASE_DOMAIN;
  originUrl.protocol = "https:";
  originUrl.port = "";

  const headers = new Headers(request.headers);
  headers.set("host", BASE_DOMAIN);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");

  const originResponse = await fetch(originUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
    cf: { resolveOverride: ORIGIN_RESOLVE_HOST },
  });

  const status = originResponse.status;
  const location = originResponse.headers.get("location");
  // Social-login (managed OAuth) traffic must keep its original Location host:
  // the origin bounces /~oauth/* to the Lovable OAuth broker (oauth.lovable.app),
  // and rewriting that to our own host breaks Google sign-in with a 404.
  const isOAuthFlow = incoming.pathname.startsWith("/~oauth");
  if (location && status >= 300 && status < 400 && !isOAuthFlow) {
    try {
      const loc = new URL(location, `https://${BASE_DOMAIN}`);
      const isOAuthBroker = loc.host === "oauth.lovable.app";
      const looksLikeApexBounce =
        loc.host === BASE_DOMAIN ||
        loc.host === `www.${BASE_DOMAIN}` ||
        loc.host.endsWith(".lovable.app");
      if (
        !isOAuthBroker &&
        looksLikeApexBounce &&
        publicHost !== BASE_DOMAIN &&
        publicHost !== `www.${BASE_DOMAIN}`
      ) {

        loc.host = publicHost;
        loc.protocol = "https:";
        loc.port = "";
        const rewritten = new Headers(originResponse.headers);
        rewritten.set("location", loc.toString());
        rewritten.set("x-ebdaey-worker", "mentor-proxy-redirect-rewrite");
        return new Response(originResponse.body, {
          status,
          statusText: originResponse.statusText,
          headers: rewritten,
        });
      }
    } catch {}
  }

  const outHeaders = new Headers(originResponse.headers);
  outHeaders.set("x-ebdaey-worker", "mentor-proxy");

  // Ensure fonts and static assets have an efficient cache policy for repeat visits and PageSpeed
  const isStaticAsset =
    incoming.pathname.startsWith("/fonts/") ||
    incoming.pathname.startsWith("/assets/") ||
    /\.(woff2?|ttf|eot|svg|png|jpe?g|webp|avif|ico)$/i.test(incoming.pathname);
  if (isStaticAsset && status === 200) {
    outHeaders.set("cache-control", "public, max-age=31536000, immutable");
  }

  return new Response(originResponse.body, {
    status,
    statusText: originResponse.statusText,
    headers: outHeaders,
  });
}
