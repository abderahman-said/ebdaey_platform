// Shared helper: grant a gift item to a student after purchase.
// Handles all gift kinds: recorded course, live course, consultation, digital product.

type SB = any;

type GiftRow = {
  gift_kind?: string | null;
  // live_courses.gift_courses columns
  gift_course_id?: string | null;
  gift_live_course_id?: string | null;
  gift_digital_product_id?: string | null;
  // digital_product_gift_courses columns
  course_id?: string | null;
  live_course_id?: string | null;
  digital_product_gift_id?: string | null;
};

export async function grantGiftToStudent(
  supabase: SB,
  gift: GiftRow,
  studentId: string,
  tenantId: string,
): Promise<void> {
  let kind = (gift.gift_kind || "").toString();
  // Legacy rows have no gift_kind — infer it from whichever column is populated
  if (!kind) {
    if (gift.gift_course_id || gift.course_id) kind = "course";
    else if (gift.gift_live_course_id || gift.live_course_id) kind = "live_course";
    else if (gift.gift_digital_product_id || gift.digital_product_gift_id) kind = "digital_product";
  }

  // Recorded course → create enrollment
  const courseId = gift.gift_course_id || gift.course_id || null;
  if (kind === "course" && courseId) {
    const { data: existing } = await supabase
      .from("enrollments").select("id")
      .eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
    if (!existing) {
      await supabase.from("enrollments").insert({
        student_id: studentId, course_id: courseId, tenant_id: tenantId,
      });
    }
    return;
  }

  // Live course OR consultation → free completed purchase row
  const liveId = gift.gift_live_course_id || gift.live_course_id || null;
  if ((kind === "live_course" || kind === "consultation") && liveId) {
    const { data: existing } = await supabase
      .from("live_course_purchases").select("id")
      .eq("student_id", studentId).eq("live_course_id", liveId)
      .eq("payment_status", "completed").maybeSingle();
    if (!existing) {
      await supabase.from("live_course_purchases").insert({
        live_course_id: liveId, tenant_id: tenantId, student_id: studentId,
        gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
        payment_status: "completed", discount_amount: 0,
      });
    }
    return;
  }

  // Digital product → free completed purchase row
  const dpId = gift.gift_digital_product_id || gift.digital_product_gift_id || null;
  if (kind === "digital_product" && dpId) {
    const { data: existing } = await supabase
      .from("digital_product_purchases").select("id")
      .eq("student_id", studentId).eq("digital_product_id", dpId)
      .eq("payment_status", "completed").maybeSingle();
    if (!existing) {
      await supabase.from("digital_product_purchases").insert({
        digital_product_id: dpId, tenant_id: tenantId, student_id: studentId,
        gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
        payment_status: "completed", discount_amount: 0,
      });
    }
    return;
  }
}

export async function grantLiveCourseGifts(
  supabase: SB, liveCourseId: string, studentId: string, tenantId: string,
) {
  const { data: gifts } = await supabase
    .from("gift_courses")
    .select("gift_kind, gift_course_id, gift_live_course_id, gift_digital_product_id")
    .eq("live_course_id", liveCourseId);
  for (const g of gifts || []) {
    try { await grantGiftToStudent(supabase, g as GiftRow, studentId, tenantId); }
    catch (e) { console.error("grantLiveCourseGifts item failed:", e); }
  }
}

export async function grantCourseGifts(
  supabase: SB, courseId: string, studentId: string, tenantId: string,
) {
  const { data: gifts } = await supabase
    .from("gift_courses")
    .select("gift_kind, gift_course_id, gift_live_course_id, gift_digital_product_id")
    .eq("course_id", courseId);
  for (const g of gifts || []) {
    try { await grantGiftToStudent(supabase, g as GiftRow, studentId, tenantId); }
    catch (e) { console.error("grantCourseGifts item failed:", e); }
  }
}

export async function grantDigitalProductGifts(
  supabase: SB, digitalProductId: string, studentId: string, tenantId: string,
) {
  const { data: gifts } = await supabase
    .from("digital_product_gift_courses")
    .select("gift_kind, course_id, live_course_id, digital_product_gift_id")
    .eq("digital_product_id", digitalProductId);
  for (const g of gifts || []) {
    try { await grantGiftToStudent(supabase, g as GiftRow, studentId, tenantId); }
    catch (e) { console.error("grantDigitalProductGifts item failed:", e); }
  }
}
