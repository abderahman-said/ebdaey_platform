// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes:
//   1. public/sitemap.xml   — gitignored, regenerated every run
//   2. .reactsnap-includes.json — gitignored, used by react-snap at build time
//
// ⚠️  Does NOT touch package.json anymore.
//     That was the cause of `git pull` conflicts on every dev/build run.
//
// The live sitemap (always fresh) is served by the Cloudflare Worker at
// https://ebdaey.com/sitemap.xml; this file is the build-time fallback and the
// source of the react-snap pre-render route list.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://ebdaey.com";
const BASE_DOMAIN = "ebdaey.com";
const SUPABASE_URL = "https://hnrcibzgoziqvtsiepws.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmNpYnpnb3ppcXZ0c2llcHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjQ4MDgsImV4cCI6MjA4Nzk0MDgwOH0.zmf60KFFU5ik_cavmcpTGR9eAWUsA915vdzjRFKDVog";

interface SitemapImage {
  loc: string;
  title?: string;
}

interface SitemapEntry {
  /** Absolute canonical URL of the page */
  url: string;
  /** SPA path used for react-snap pre-rendering (marketing host only) */
  snapPath?: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  images?: SitemapImage[];
}

const xmlEscape = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const staticEntries: SitemapEntry[] = [
  { url: `${BASE_URL}/`, snapPath: "/", changefreq: "weekly", priority: "1.0" },
  { url: `${BASE_URL}/about`, snapPath: "/about", changefreq: "monthly", priority: "0.6" },
  { url: `${BASE_URL}/contact`, snapPath: "/contact", changefreq: "monthly", priority: "0.6" },
  { url: `${BASE_URL}/auth`, snapPath: "/auth", changefreq: "monthly", priority: "0.5" },
  { url: `${BASE_URL}/terms`, snapPath: "/terms", changefreq: "yearly", priority: "0.3" },
  { url: `${BASE_URL}/privacy-policy`, snapPath: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { url: `${BASE_URL}/delivery-policy`, snapPath: "/delivery-policy", changefreq: "yearly", priority: "0.3" },
  { url: `${BASE_URL}/refund-policy`, snapPath: "/refund-policy", changefreq: "yearly", priority: "0.3" },
  ...["eg", "sa", "ae", "kw", "qa", "jo", "ma", "dz"].map((code) => ({
    url: `${BASE_URL}/country/${code}`,
    snapPath: `/country/${code}`,
    changefreq: "monthly" as const,
    priority: "0.7",
  })),
];

const sbHeaders = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

async function sbSelect<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

interface TenantRow {
  id: string;
  slug: string;
  name?: string;
  profile_image_url?: string;
  created_at?: string;
}

interface ProductRow {
  slug: string;
  title?: string;
  updated_at?: string;
  tenant_id: string;
  thumbnail_url?: string;
  is_unlisted?: boolean;
}

const productQuery = (table: string) =>
  `${table}?select=slug,title,updated_at,tenant_id,thumbnail_url,is_unlisted&is_published=eq.true`;

const mentors = (
  await sbSelect<TenantRow>(
    "public_tenants?select=id,slug,name,profile_image_url,created_at&is_active=eq.true",
  )
).filter((t) => t.slug);

const [courses, liveCourses, digitalProducts] = await Promise.all([
  sbSelect<ProductRow>(productQuery("courses")),
  sbSelect<ProductRow>(productQuery("live_courses")),
  sbSelect<ProductRow>(productQuery("digital_products")),
]);

const tenantSlugById = new Map(mentors.map((m) => [m.id, m.slug]));

const mentorEntries: SitemapEntry[] = mentors.map((m) => ({
  url: `https://${m.slug}.${BASE_DOMAIN}/`,
  snapPath: `/mentor/${m.slug}`,
  lastmod: m.created_at?.slice(0, 10),
  changefreq: "weekly",
  priority: "0.9",
  images: m.profile_image_url ? [{ loc: m.profile_image_url, title: m.name || m.slug }] : undefined,
}));

const productEntries = (rows: ProductRow[], prefix: string, priority: string): SitemapEntry[] =>
  rows
    .filter((r) => r.slug && !r.is_unlisted)
    .map((r) => {
      const mentorSlug = tenantSlugById.get(r.tenant_id);
      if (!mentorSlug) return null;
      return {
        url: `https://${mentorSlug}.${BASE_DOMAIN}/${prefix}/${r.slug}`,
        snapPath: `/mentor/${mentorSlug}/${prefix}/${r.slug}`,
        lastmod: r.updated_at?.slice(0, 10),
        changefreq: "weekly" as const,
        priority,
        images: r.thumbnail_url ? [{ loc: r.thumbnail_url, title: r.title || r.slug }] : undefined,
      } satisfies SitemapEntry;
    })
    .filter(Boolean) as SitemapEntry[];

const allEntries = [
  ...staticEntries,
  ...mentorEntries,
  ...productEntries(courses, "c", "0.8"),
  ...productEntries(liveCourses, "l", "0.8"),
  ...productEntries(digitalProducts, "p", "0.7"),
];

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${xmlEscape(e.url)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      ...(e.images ?? []).map((img) =>
        [
          `    <image:image>`,
          `      <image:loc>${xmlEscape(img.loc)}</image:loc>`,
          img.title ? `      <image:title>${xmlEscape(img.title)}</image:title>` : null,
          `      <image:geo_location>Egypt, Saudi Arabia, United Arab Emirates</image:geo_location>`,
          `    </image:image>`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

// ── 1. Write sitemap.xml (gitignored) ──────────────────────────────────────
writeFileSync(resolve("public/sitemap.xml"), renderSitemap(allEntries));

// ── 2. Write react-snap route list to a SEPARATE file (gitignored) ─────────
const allIncludes = Array.from(
  new Set(allEntries.map((e) => e.snapPath).filter((p): p is string => Boolean(p))),
);

writeFileSync(
  resolve(".reactsnap-includes.json"),
  JSON.stringify({ include: allIncludes }, null, 2) + "\n",
);

console.log(
  `✅ sitemap.xml written — ${allEntries.length} URLs (${mentors.length} mentors, ${courses.length} courses, ${liveCourses.length} live, ${digitalProducts.length} products)`,
);
