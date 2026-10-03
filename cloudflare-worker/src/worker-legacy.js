/**
 * Ebdaey edge front-door — legacy Cloudflare Service Worker format.
 *
 * Use this file ONLY if Cloudflare shows:
 * "Uncaught SyntaxError: Unexpected token ...".
 *
 * That error means the Worker is running in the old Service Worker format,
 * so it needs addEventListener(...).
 */

const BASE_DOMAIN = "ebdaey.com";
const ORIGIN_RESOLVE_HOST = `lovable-origin.${BASE_DOMAIN}`;
const RESERVED_SUBS = new Set(["", "www", "app", "admin", "api", "mail", "email", "static", "assets"]);
const RESERVED_ROOT_PATHS = new Set([
  "", "auth", "admin-login", "reset-password", "app", "admin",
  "privacy-policy", "terms", "refund-policy", "contact", "about",
  "delivery-policy", "verify", "mentor", "country", "zoom-integration", "zoom",
  "assets", "static", "api", "functions", "favicon.ico", "robots.txt", "sitemap.xml",
]);

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

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

function readBinding(name) {
  // Legacy Workers expose variables as global bindings. `typeof` avoids
  // ReferenceError if an optional variable was not configured.
  if (name === "SUPABASE_URL") return typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "";
  if (name === "SUPABASE_ANON_KEY") return typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "";
  if (name === "ORIGIN_HOST") return typeof ORIGIN_HOST !== "undefined" ? ORIGIN_HOST : "ebdaey.lovable.app";
  if (name === "SITE_URL") return typeof SITE_URL !== "undefined" ? SITE_URL : "https://ebdaey.com";
  return "";
}

function getEnv() {
  return {
    SUPABASE_URL: readBinding("SUPABASE_URL"),
    SUPABASE_ANON_KEY: readBinding("SUPABASE_ANON_KEY"),
    ORIGIN_HOST: readBinding("ORIGIN_HOST"),
    SITE_URL: readBinding("SITE_URL"),
  };
}

function isBot(req) {
  return BOT_UA_REGEX.test(req.headers.get("user-agent") || "");
}

function parseHost(host) {
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s, max = 200) {
  const clean = String(s).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function renderMetaHtml(m) {
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

async function sb(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length ? data[0] : null;
}

function getTenant(env, slug) {
  return sb(env, `public_tenants?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,profile_image_url,bio&limit=1`);
}

function getItem(env, table, tenantId, slug) {
  const extraSelect = table === "live_courses" ? ",product_type" : "";
  return sb(env, `${table}?tenant_id=eq.${tenantId}&slug=eq.${encodeURIComponent(slug)}&select=title,description,thumbnail_url,landing_subheader${extraSelect}&limit=1`);
}

async function resolveMentorMeta(env, fullUrl, mentorSlug, pathParts) {
  const tenant = await getTenant(env, mentorSlug);
  if (!tenant) return null;

  const itemRoutes = {
    c: "courses", course: "courses",
    p: "digital_products", I: "digital_products", product: "digital_products",
    l: "live_courses", live: "live_courses",
  };
  const segment = pathParts[0];

  if (segment && itemRoutes[segment] && pathParts[1]) {
    const item = await getItem(env, itemRoutes[segment], tenant.id, pathParts[1]);
    if (!item) return null;
    const isCourse = segment === "c" || segment === "course";
    const isProduct = segment === "p" || segment === "I" || segment === "product";
    const defaultDesc = isCourse
      ? `كورس ${item.title} مع ${tenant.name} على منصة إبداعي`
      : isProduct
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
async function sbList(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return [];
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const xmlEsc = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATIC_SITEMAP_PATHS = [
  ["/", "weekly", "1.0"],
  ["/about", "monthly", "0.6"],
  ["/contact", "monthly", "0.6"],
  ["/auth", "monthly", "0.5"],
  ["/terms", "yearly", "0.3"],
  ["/privacy-policy", "yearly", "0.3"],
  ["/delivery-policy", "yearly", "0.3"],
  ["/refund-policy", "yearly", "0.3"],
  ...["eg", "sa", "ae", "kw", "qa", "jo", "ma", "dz"].map((code) => [`/country/${code}`, "monthly", "0.7"]),
];

async function buildLiveSitemap(env) {
  const productSelect =
    "select=slug,title,updated_at,tenant_id,thumbnail_url,is_unlisted&is_published=eq.true";
  const [tenants, courses, live, products] = await Promise.all([
    sbList(env, "public_tenants?select=id,name,slug,profile_image_url,created_at&is_active=eq.true"),
    sbList(env, `courses?${productSelect}`),
    sbList(env, `live_courses?${productSelect}`),
    sbList(env, `digital_products?${productSelect}`),
  ]);
  if (!tenants.length) return null;

  const slugById = new Map(tenants.map((t) => [t.id, t.slug]));
  const blocks = [];

  const push = (loc, changefreq, priority, lastmod, image) => {
    blocks.push(
      [
        `  <url>`,
        `    <loc>${xmlEsc(loc)}</loc>`,
        lastmod ? `    <lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : null,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        image && image.loc
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
      loc: t.profile_image_url,
      title: t.name,
    });
  }
  for (const [rows, prefix, priority] of [
    [courses, "c", "0.8"],
    [live, "l", "0.8"],
    [products, "p", "0.7"],
  ]) {
    for (const r of rows) {
      const slug = slugById.get(r.tenant_id);
      if (!slug || !r.slug || r.is_unlisted) continue;
      push(`https://${slug}.${BASE_DOMAIN}/${prefix}/${r.slug}`, "weekly", priority, r.updated_at, {
        loc: r.thumbnail_url,
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

async function handleRequest(request) {
  const env = getEnv();
  const url = new URL(request.url);
  const host = parseHost(url.host);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return passthrough(request, env);
  }

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
    } catch (_) {}
    return passthrough(request, env);
  }



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

  if (host.kind === "marketing") {
    if (parts[0] === "app" && !isBot(request)) {
      return redirect(`https://app.${BASE_DOMAIN}/${parts.slice(1).join("/")}${url.search}`);
    }
    if (parts[0] === "admin" && !isBot(request)) {
      return redirect(`https://admin.${BASE_DOMAIN}/${parts.slice(1).join("/")}${url.search}`);
    }

    let legacyMentorSlug;
    let legacyTail = [];
    if (parts[0] === "mentor" && parts[1]) {
      legacyMentorSlug = parts[1];
      legacyTail = parts.slice(2);
    } else if (parts[0] && !RESERVED_ROOT_PATHS.has(parts[0])) {
      legacyMentorSlug = parts[0];
      legacyTail = parts.slice(1);
    }

    if (legacyMentorSlug) {
      if (isBot(request)) {
        try {
          const joinedTail = legacyTail.join("/");
          const fullUrl = joinedTail
            ? `https://${legacyMentorSlug}.${BASE_DOMAIN}/${joinedTail}`
            : `https://${legacyMentorSlug}.${BASE_DOMAIN}/`;
          const meta = await resolveMentorMeta(env, fullUrl, legacyMentorSlug, legacyTail);
          if (meta) return renderResponse(meta);
        } catch (error) {}
      }
      const target = `https://${legacyMentorSlug}.${BASE_DOMAIN}/${legacyTail.join("/")}${url.search}`;
      return redirect(target.replace(/\/(\?|$)/, "$1"));
    }

    return passthrough(request, env);
  }

  if (host.kind === "mentor" && host.mentorSlug) {
    if (isBot(request)) {
      try {
        const meta = await resolveMentorMeta(env, url.toString(), host.mentorSlug, parts);
        if (meta) return renderResponse(meta);
      } catch (error) {}
    }
    return passthrough(request, env);
  }

  return passthrough(request, env);
}

function renderResponse(meta) {
  return new Response(renderMetaHtml(meta), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
      "x-prerender": "ebdaey-og-worker",
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 301,
    headers: { location, "cache-control": "public, max-age=3600" },
  });
}

async function passthrough(request, env) {
  const incoming = new URL(request.url);
  const publicHost = incoming.host; // e.g. marjini.ebdaey.com

  // Send the request to the apex hostname so it lands on the connected
  // Lovable custom domain, but route the TCP connection through a same-zone
  // DNS-only CNAME (lovable-origin.ebdaey.com → ebdaey.lovable.app) so we
  // never talk to .lovable.app directly (Lovable redirects unknown hosts).
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

  // Rewrite any redirect that points back to the apex/lovable host so the
  // browser stays on the mentor subdomain.
  // Social-login (managed OAuth) traffic must keep its original Location host:
  // the origin bounces /~oauth/* to the Lovable OAuth broker (oauth.lovable.app),
  // and rewriting that to our own host breaks Google sign-in with a 404.
  const status = originResponse.status;
  const location = originResponse.headers.get("location");
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
    } catch (_) {}
  }

  const outHeaders = new Headers(originResponse.headers);
  outHeaders.set("x-ebdaey-worker", "mentor-proxy");
  return new Response(originResponse.body, {
    status,
    statusText: originResponse.statusText,
    headers: outHeaders,
  });
}