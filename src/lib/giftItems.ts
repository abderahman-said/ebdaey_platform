import { supabase } from "@/integrations/supabase/client";

export type GiftKind = "course" | "live_course" | "digital_product" | "consultation";

export interface GiftItem {
  kind: GiftKind;
  id: string;
}

export interface GiftOption extends GiftItem {
  title: string;
}

export interface GiftOptions {
  course: GiftOption[];
  live_course: GiftOption[];
  digital_product: GiftOption[];
  consultation: GiftOption[];
}

export const GIFT_KIND_LABEL: Record<GiftKind, string> = {
  course: "كورس مسجل",
  live_course: "كورس لايف",
  digital_product: "منتج رقمي",
  consultation: "جلسة فردية",
};

/** Fetch all items available as gifts for a tenant (excluding the current item itself). */
export async function fetchGiftOptions(
  tenantId: string,
  exclude?: { kind: GiftKind; id: string },
): Promise<GiftOptions> {
  const [coursesRes, liveRes, productsRes] = await Promise.all([
    supabase.from("courses").select("id, title").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("live_courses" as any).select("id, title, product_type").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("digital_products").select("id, title").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
  ]);

  const excl = (kind: GiftKind, id: string) => exclude && exclude.kind === kind && exclude.id === id;

  const courses: GiftOption[] = ((coursesRes.data as any[]) || [])
    .filter((c) => !excl("course", c.id))
    .map((c) => ({ kind: "course", id: c.id, title: c.title }));

  const liveAll = ((liveRes.data as any[]) || []);
  const live_course: GiftOption[] = liveAll
    .filter((c) => c.product_type !== "consultation")
    .filter((c) => !excl("live_course", c.id))
    .map((c) => ({ kind: "live_course", id: c.id, title: c.title }));
  const consultation: GiftOption[] = liveAll
    .filter((c) => c.product_type === "consultation")
    .filter((c) => !excl("consultation", c.id))
    .map((c) => ({ kind: "consultation", id: c.id, title: c.title }));

  const digital_product: GiftOption[] = ((productsRes.data as any[]) || [])
    .filter((p) => !excl("digital_product", p.id))
    .map((p) => ({ kind: "digital_product", id: p.id, title: p.title }));

  return { course: courses, live_course, digital_product, consultation };
}

/** Load existing gifts attached to a course or live course (uses `gift_courses` table). */
export async function loadGiftCoursesFor(
  source: { courseId?: string; liveCourseId?: string },
): Promise<GiftItem[]> {
  let q = supabase.from("gift_courses").select("gift_kind, gift_course_id, gift_live_course_id, gift_digital_product_id");
  if (source.courseId) q = q.eq("course_id", source.courseId);
  else if (source.liveCourseId) q = q.eq("live_course_id", source.liveCourseId);
  else return [];
  const { data } = await q;
  return ((data as any[]) || []).map(rowToGiftItem).filter(Boolean) as GiftItem[];
}

/** Replace all gifts of a course or live course. */
export async function saveGiftCoursesFor(
  source: { courseId?: string; liveCourseId?: string; tenantId: string },
  items: GiftItem[],
) {
  const where = supabase.from("gift_courses").delete();
  if (source.courseId) await where.eq("course_id", source.courseId);
  else if (source.liveCourseId) await where.eq("live_course_id", source.liveCourseId);
  if (!items.length) return;
  const rows = items.map((g) => ({
    tenant_id: source.tenantId,
    course_id: source.courseId || null,
    live_course_id: source.liveCourseId || null,
    gift_kind: g.kind,
    gift_course_id: g.kind === "course" ? g.id : null,
    gift_live_course_id: (g.kind === "live_course" || g.kind === "consultation") ? g.id : null,
    gift_digital_product_id: g.kind === "digital_product" ? g.id : null,
  }));
  await supabase.from("gift_courses").insert(rows as any);
}

/** Load existing gifts attached to a digital product. */
export async function loadDigitalProductGifts(productId: string): Promise<GiftItem[]> {
  const { data } = await supabase
    .from("digital_product_gift_courses")
    .select("gift_kind, course_id, live_course_id, digital_product_gift_id")
    .eq("digital_product_id", productId);
  return ((data as any[]) || []).map(dpRowToGiftItem).filter(Boolean) as GiftItem[];
}

/** Replace all gifts of a digital product. */
export async function saveDigitalProductGifts(productId: string, tenantId: string, items: GiftItem[]) {
  await supabase.from("digital_product_gift_courses").delete().eq("digital_product_id", productId);
  if (!items.length) return;
  const rows = items.map((g) => ({
    tenant_id: tenantId,
    digital_product_id: productId,
    gift_kind: g.kind,
    course_id: g.kind === "course" ? g.id : null,
    live_course_id: (g.kind === "live_course" || g.kind === "consultation") ? g.id : null,
    digital_product_gift_id: g.kind === "digital_product" ? g.id : null,
  }));
  await supabase.from("digital_product_gift_courses").insert(rows as any);
}

function rowToGiftItem(row: any): GiftItem | null {
  const kind = (row.gift_kind || "course") as GiftKind;
  if (kind === "course" && row.gift_course_id) return { kind, id: row.gift_course_id };
  if ((kind === "live_course" || kind === "consultation") && row.gift_live_course_id) return { kind, id: row.gift_live_course_id };
  if (kind === "digital_product" && row.gift_digital_product_id) return { kind, id: row.gift_digital_product_id };
  // Legacy fallback
  if (row.gift_course_id) return { kind: "course", id: row.gift_course_id };
  return null;
}

function dpRowToGiftItem(row: any): GiftItem | null {
  const kind = (row.gift_kind || "course") as GiftKind;
  if (kind === "course" && row.course_id) return { kind, id: row.course_id };
  if ((kind === "live_course" || kind === "consultation") && row.live_course_id) return { kind, id: row.live_course_id };
  if (kind === "digital_product" && row.digital_product_gift_id) return { kind, id: row.digital_product_gift_id };
  if (row.course_id) return { kind: "course", id: row.course_id };
  return null;
}

/** Resolve gift items into renderable cards with title, thumbnail, link, price for sales pages. */
export interface GiftDisplay {
  kind: GiftKind;
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  price: number;
  price_before_discount: number | null;
  description: string | null;
  banner_type: string | null;
  banner_video_url: string | null;
  card_button_text: string | null;
  /** path under mentor (e.g. "/c/foo", "/l/bar", "/p/baz") */
  path: string;
}

export async function fetchGiftDisplays(items: GiftItem[]): Promise<GiftDisplay[]> {
  if (!items.length) return [];
  const courseIds = items.filter((i) => i.kind === "course").map((i) => i.id);
  const liveIds = items.filter((i) => i.kind === "live_course" || i.kind === "consultation").map((i) => i.id);
  const productIds = items.filter((i) => i.kind === "digital_product").map((i) => i.id);

  const [coursesRes, liveRes, productsRes] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id, title, slug, price, price_before_discount, thumbnail_url, description, banner_type, banner_video_url, card_button_text").in("id", courseIds)
      : Promise.resolve({ data: [] as any[] }),
    liveIds.length
      ? supabase.from("live_courses" as any).select("id, title, slug, price, price_before_discount, thumbnail_url, description, banner_type, banner_video_url, card_button_text, product_type").in("id", liveIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from("digital_products").select("id, title, slug, price, price_before_discount, thumbnail_url, description, banner_type, banner_video_url, card_button_text").in("id", productIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const byId = new Map<string, any>();
  ((coursesRes.data as any[]) || []).forEach((r) => byId.set(`course:${r.id}`, { ...r, kind: "course", path: `/c/${r.slug}` }));
  ((liveRes.data as any[]) || []).forEach((r) => {
    const kind: GiftKind = r.product_type === "consultation" ? "consultation" : "live_course";
    byId.set(`${kind}:${r.id}`, { ...r, kind, path: `/l/${r.slug}` });
  });
  ((productsRes.data as any[]) || []).forEach((r) => byId.set(`digital_product:${r.id}`, { ...r, kind: "digital_product", path: `/p/${r.slug}` }));

  return items
    .map((i) => byId.get(`${i.kind}:${i.id}`))
    .filter(Boolean)
    .map((r) => ({
      kind: r.kind,
      id: r.id,
      title: r.title,
      slug: r.slug,
      thumbnail_url: r.thumbnail_url,
      price: Number(r.price) || 0,
      price_before_discount: r.price_before_discount != null ? Number(r.price_before_discount) : null,
      description: r.description ?? null,
      banner_type: r.banner_type ?? null,
      banner_video_url: r.banner_video_url ?? null,
      card_button_text: r.card_button_text ?? null,
      path: r.path,
    }));
}
