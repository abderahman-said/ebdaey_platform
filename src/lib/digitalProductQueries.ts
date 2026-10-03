import { applyLocalPrice, localBumpPrice } from "@/lib/localPrice";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentor } from "@/lib/queries";
import { fetchGiftDisplays, loadDigitalProductGifts } from "@/lib/giftItems";

export const dpQk = {
  product: (tenantSlug: string, productSlug: string) =>
    ["digital-product", tenantSlug, productSlug] as const,
  productCheckout: (tenantSlug: string, productSlug: string) =>
    ["digital-product-checkout", tenantSlug, productSlug] as const,
};

export const fetchDigitalProductCheckoutBundle = async (
  tenantSlug: string,
  productSlug: string,
) => {
  const { data: tenant } = await supabase
    .from("public_tenants")
    .select("id, name, profile_image_url, primary_color, whatsapp_number")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (!tenant) return null;

  const { data: product } = await supabase
    .from("digital_products")
    .select("id, title, price, thumbnail_url, slug")
    .eq("tenant_id", tenant.id)
    .eq("slug", productSlug)
    .maybeSingle();
  await applyLocalPrice("digital_product", product);
  if (!product) return { tenant, product: null, filesCount: 0, giftCourses: [], bump: null };

  const [filesRes, giftItems, bumpRes] = await Promise.all([
    supabase
      .from("digital_product_files")
      .select("id", { count: "exact", head: true })
      .eq("digital_product_id", product.id)
      .eq("is_sample", false),
    loadDigitalProductGifts(product.id),
    supabase
      .from("digital_product_order_bumps")
      .select("*")
      .eq("digital_product_id", product.id)
      .eq("is_enabled", true)
      .maybeSingle(),
  ]);

  const giftCourses = await fetchGiftDisplays(giftItems);

  let bump: any = null;
  const bumpData = bumpRes.data as any;
  if (bumpData) {
    const kind: "course" | "live_course" | "product" = bumpData.bump_course_id
      ? "course"
      : (bumpData as any).bump_live_course_id
        ? "live_course"
        : "product";
    const targetId = bumpData.bump_course_id || (bumpData as any).bump_live_course_id || bumpData.bump_digital_product_id;
    if (targetId) {
      const r = kind === "course"
        ? await supabase.from("courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
        : kind === "live_course"
          ? await supabase.from("live_courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
          : await supabase.from("digital_products").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle();
      const target = r.data as any;
      const bp = target ? await localBumpPrice("dp", bumpData.id) : null;
      if (target && bp) {
        bump = {
          id: bumpData.id,
          title: bumpData.title || "إضافة مميزة",
          description: bumpData.description,
          price: bp.price,
          discount_price: bp.discount_price,
          bump_kind: kind,
          bump_target_id: target.id,
          bump_target_title: target.title,
          bump_target_thumbnail: target.thumbnail_url,
        };
      }
    }
  }

  return {
    tenant,
    product,
    filesCount: filesRes.count || 0,
    giftCourses,
    bump,
  };
};


export const fetchDigitalProductBundle = async (
  tenantSlug: string,
  productSlug: string,
) => {
  const tenant = await fetchMentor(tenantSlug);
  if (!tenant) return null;

  const { data: product } = await supabase
    .from("digital_products")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("slug", productSlug)
    .maybeSingle();

  await applyLocalPrice("digital_product", product);
  if (!product) {
    return {
      tenant,
      product: null,
      files: [],
      reviews: [],
      giftCourses: [],
      filesCount: 0,
    };
  }

  const [filesRes, giftItems, reviewsRes] = await Promise.all([
    supabase
      .from("digital_product_files")
      .select("id, title, file_size_bytes, file_type, sort_order, is_sample")
      .eq("digital_product_id", product.id)
      .order("sort_order"),

    loadDigitalProductGifts(product.id),
    supabase
      .from("reviews")
      .select(
        "id, first_name, last_name, rating, rating_v2, comment, created_at",
      )
      .eq("is_published", true)
      .eq("tenant_id", tenant.id)
      .or(`and(product_type.eq.digital_product,product_id.eq.${product.id}),and(product_type.is.null,product_id.is.null,course_id.is.null)`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const giftCourses = await fetchGiftDisplays(giftItems);

  const allFiles = filesRes.data || [];
  const nonSampleFiles = allFiles.filter((f: any) => !f.is_sample);

  return {
    tenant,
    product,
    files: allFiles,
    reviews: reviewsRes.data || [],
    giftCourses,
    filesCount: nonSampleFiles.length,
  };

};
