import { supabase } from "@/integrations/supabase/client";
import { resolvePrice, type PriceRow } from "@/lib/currency";

let countryPromise: Promise<string | null> | null = null;
const VISITOR_COUNTRY_CACHE_KEY = "ebdaey_visitor_country";

/** Visitor's real connection country (Cloudflare trace), cached in memory & sessionStorage. */
export function getVisitorCountry(): Promise<string | null> {
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(VISITOR_COUNTRY_CACHE_KEY);
      if (stored && stored !== "XX" && /^[A-Z]{2}$/.test(stored)) {
        return Promise.resolve(stored);
      }
    } catch {
      // sessionStorage unavailable or private mode
    }
  }

  if (!countryPromise) {
    countryPromise = (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        const r = await fetch("/cdn-cgi/trace", { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(t);
        if (!r.ok) return null;
        const m = (await r.text()).match(/^loc=([A-Z]{2})$/m);
        const country = m && m[1] !== "XX" ? m[1] : null;
        if (country && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(VISITOR_COUNTRY_CACHE_KEY, country);
          } catch {
            // ignore storage quota errors
          }
        }
        return country;
      } catch {
        return null;
      }
    })();
  }
  return countryPromise;
}

let displayCurrency = "EGP";
export const getDisplayCurrency = () => displayCurrency;
export const setDisplayCurrency = (c: string) => { displayCurrency = c || "EGP"; };
/** Country code of the visitor's resolved price row (null = "All countries"). */
let displayCountry: string | null = null;
export const getDisplayCountry = () => displayCountry;

/**
 * Re-sync the page-wide currency/country from a loaded product. Call during render on
 * checkout pages so cached (react-query) products never inherit another page's currency.
 */
export function syncDisplayFromProduct(product: { currency?: string | null; price_country_code?: string | null } | null | undefined) {
  if (!product) return;
  setDisplayCurrency(product.currency || "EGP");
  displayCountry = product.price_country_code ?? null;
}

type ProductType = "course" | "live_course" | "digital_product" | "subscription_plan";

/**
 * Replace a product's price with the visitor's country price (if the mentor set one)
 * and switch the page's display currency. Mutates and returns the same object.
 */
export async function applyLocalPrice<T extends Record<string, any>>(type: ProductType, product: T | null): Promise<T | null> {
  displayCountry = null;
  if (!product?.id) { setDisplayCurrency("EGP"); return product; }
  const [country, { data }] = await Promise.all([
    getVisitorCountry(),
    supabase.from("product_prices").select("country_code,currency,price,compare_at_price")
      .eq("product_type", type).eq("product_id", product.id),
  ]);
  const row = resolvePrice((data as PriceRow[]) ?? [], country);
  if (row) {
    (product as any).price = Number(row.price);
    if ("price_before_discount" in product) (product as any).price_before_discount = row.compare_at_price;
    (product as any).currency = row.currency;
    (product as any).price_country_code = row.country_code ?? null;
    displayCountry = row.country_code ?? null;
    setDisplayCurrency(row.currency);
  } else {
    (product as any).currency = "EGP";
    setDisplayCurrency("EGP");
  }
  return product;
}

/**
 * Add-on price for the visitor's price row. Returns null when the mentor did not
 * offer the add-on for that row (the add-on is then hidden).
 */
export async function localBumpPrice(kind: "course" | "dp", bumpId: string): Promise<{ price: number; discount_price: number | null } | null> {
  let q = supabase.from("order_bump_prices").select("price,discount_price").eq("bump_kind", kind).eq("bump_id", bumpId);
  q = displayCountry ? q.eq("country_code", displayCountry) : q.is("country_code", null);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  return { price: Number(data.price) || 0, discount_price: data.discount_price != null ? Number(data.discount_price) : null };
}

/** Batch version for product lists: sets price/price_before_discount/currency on each item. */
export async function applyLocalPrices<T extends Record<string, any>>(type: ProductType, items: T[]): Promise<T[]> {
  const ids = items.map((i) => i.id).filter(Boolean);
  if (!ids.length) return items;
  const [country, { data }] = await Promise.all([
    getVisitorCountry(),
    supabase.from("product_prices").select("product_id,country_code,currency,price,compare_at_price")
      .eq("product_type", type).in("product_id", ids),
  ]);
  const byId = new Map<string, PriceRow[]>();
  ((data as any[]) ?? []).forEach((r) => { const a = byId.get(r.product_id) ?? []; a.push(r); byId.set(r.product_id, a); });
  items.forEach((it: any) => {
    const row = resolvePrice(byId.get(it.id) ?? [], country);
    if (row) { it.price = Number(row.price); it.price_before_discount = row.compare_at_price; it.currency = row.currency; }
    else it.currency = "EGP";
  });
  return items;
}
