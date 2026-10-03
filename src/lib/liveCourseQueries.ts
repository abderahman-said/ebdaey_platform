import { applyLocalPrice, localBumpPrice } from "@/lib/localPrice";
import { supabase } from "@/integrations/supabase/client";
import { fetchMentor } from "@/lib/queries";
import { fetchGiftDisplays, loadGiftCoursesFor } from "@/lib/giftItems";

export const lcQk = {
  course: (tenantSlug: string, courseSlug: string) =>
    ["live-course", tenantSlug, courseSlug] as const,
  checkout: (tenantSlug: string, courseSlug: string) =>
    ["live-course-checkout", tenantSlug, courseSlug] as const,
};

export const fetchLiveCourseBundle = async (tenantSlug: string, courseSlug: string) => {
  const tenant = await fetchMentor(tenantSlug);
  if (!tenant) return null;

  const { data: course } = await supabase
    .from("live_courses" as any)
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("slug", courseSlug)
    .maybeSingle();

  await applyLocalPrice("live_course", course);
  if (!course) return { tenant, course: null, sessions: [], seatsTaken: 0, reviews: [], schedule: null, slots: [], overrides: [], bookings: [], giftCourses: [] };

  const c: any = course;

  const isConsultation = c.product_type === "consultation" || c.product_type === "session_bundle";

  const [sessionsRes, seatsRes, reviewsRes, slotsRes, overridesRes, bookingsRes, giftItems, bumpRes] = await Promise.all([
    supabase.from("public_live_course_sessions" as any)
      .select("*").eq("live_course_id", c.id).order("sort_order"),
    supabase.from("live_course_purchases" as any)
      .select("id", { count: "exact", head: true })
      .eq("live_course_id", c.id).eq("payment_status", "completed"),
    supabase.from("reviews")
      .select("id, first_name, last_name, rating, rating_v2, comment, created_at")
      .eq("is_published", true)
      .eq("tenant_id", tenant.id)
      .or(`and(product_type.in.(live_course,consultation,session_bundle),product_id.eq.${c.id}),and(product_type.is.null,product_id.is.null,course_id.is.null)`)
      .order("created_at", { ascending: false }).limit(10),
    isConsultation && c.schedule_id
      ? supabase.from("public_mentor_schedule_slots" as any).select("*").eq("schedule_id", c.schedule_id)
      : Promise.resolve({ data: [] }),
    isConsultation && c.schedule_id
      ? supabase.from("public_mentor_schedule_overrides" as any).select("*").eq("schedule_id", c.schedule_id)
      : Promise.resolve({ data: [] }),
    isConsultation
      ? supabase.from("public_consultation_taken_slots" as any)
          .select("booking_date, booking_time, duration_minutes")
          .eq("tenant_id", tenant.id)
      : Promise.resolve({ data: [] }),

    loadGiftCoursesFor({ liveCourseId: c.id }),
    supabase.from("order_bumps" as any)
      .select("id, title, description, price, discount_price, bump_course_id, bump_live_course_id, bump_digital_product_id")
      .eq("live_course_id", c.id).eq("is_enabled", true).maybeSingle(),
  ]);

  let bump: any = null;
  const bumpData: any = bumpRes.data;
  if (bumpData) {
    const kind: "course" | "live_course" | "product" = bumpData.bump_course_id
      ? "course"
      : bumpData.bump_live_course_id
        ? "live_course"
        : "product";
    const targetId = bumpData.bump_course_id || bumpData.bump_live_course_id || bumpData.bump_digital_product_id;
    if (targetId) {
      const r = kind === "course"
        ? await supabase.from("courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
        : kind === "live_course"
          ? await supabase.from("live_courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
          : await supabase.from("digital_products").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle();
      const target: any = r.data;
      const bp = target ? await localBumpPrice("course", bumpData.id) : null;
      if (target && bp) {
        bump = {
          id: bumpData.id,
          title: bumpData.title,
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

  const giftCourses = await fetchGiftDisplays(giftItems);

  return {
    tenant,
    course: c,
    sessions: ((sessionsRes.data as any) || []),
    seatsTaken: seatsRes.count || 0,
    reviews: reviewsRes.data || [],
    slots: (slotsRes.data as any) || [],
    overrides: (overridesRes.data as any) || [],
    bookings: (bookingsRes.data as any) || [],
    giftCourses,
    bump,
  };
};

export const fetchLiveCourseCheckoutBundle = async (tenantSlug: string, courseSlug: string) => {
  const { data: tenant } = await supabase
    .from("public_tenants")
    .select("id, name, profile_image_url, primary_color, whatsapp_number")
    .eq("slug", tenantSlug).maybeSingle();
  if (!tenant) return null;

  const { data: course } = await supabase
    .from("live_courses" as any)
    .select("id, title, price, thumbnail_url, slug, capacity, attendance_type, product_type, session_duration_minutes, sessions_count")
    .eq("tenant_id", tenant.id).eq("slug", courseSlug).maybeSingle();

  await applyLocalPrice("live_course", course);
  if (!course) return { tenant, course: null, seatsTaken: 0, sessionsCount: 0, giftCourses: [], bump: null };
  const c: any = course;

  const [seatsRes, sessionsRes, giftItems, bumpRes] = await Promise.all([
    supabase.from("live_course_purchases" as any)
      .select("id", { count: "exact", head: true })
      .eq("live_course_id", c.id).eq("payment_status", "completed"),
    supabase.from("public_live_course_sessions" as any)
      .select("id", { count: "exact", head: true })
      .eq("live_course_id", c.id),
    loadGiftCoursesFor({ liveCourseId: c.id }),
    supabase.from("order_bumps" as any)
      .select("id, title, description, price, discount_price, bump_course_id, bump_live_course_id, bump_digital_product_id")
      .eq("live_course_id", c.id).eq("is_enabled", true).maybeSingle(),
  ]);

  let bump: any = null;
  const bumpData: any = bumpRes.data;
  if (bumpData) {
    const kind: "course" | "live_course" | "product" = bumpData.bump_course_id
      ? "course"
      : bumpData.bump_live_course_id
        ? "live_course"
        : "product";
    const targetId = bumpData.bump_course_id || bumpData.bump_live_course_id || bumpData.bump_digital_product_id;
    if (targetId) {
      const r = kind === "course"
        ? await supabase.from("courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
        : kind === "live_course"
          ? await supabase.from("live_courses").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle()
          : await supabase.from("digital_products").select("id, title, thumbnail_url").eq("id", targetId).maybeSingle();
      const target: any = r.data;
      const bp = target ? await localBumpPrice("course", bumpData.id) : null;
      if (target && bp) {
        bump = {
          id: bumpData.id,
          title: bumpData.title,
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

  const giftCourses = await fetchGiftDisplays(giftItems);

  return {
    tenant,
    course: c,
    seatsTaken: seatsRes.count || 0,
    sessionsCount: sessionsRes.count || 0,
    giftCourses,
    bump,
  };
};
