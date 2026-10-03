// Shared helper: grant a subscriber access to every published product of the tenant.
// Access is materialised into the same tables the app already gates on
// (enrollments / live_course_purchases / digital_product_purchases) so every
// existing page keeps working without special-casing subscriptions.

type SB = any;

export async function grantSubscriptionAccess(
  supabase: SB,
  tenantId: string,
  studentId: string,
  includeDigitalProducts: boolean,
): Promise<{ courses: number; liveCourses: number; digitalProducts: number }> {
  const result = { courses: 0, liveCourses: 0, digitalProducts: 0 };
  if (!tenantId || !studentId) return result;

  // ── Recorded courses ─────────────────────────────────────────────
  try {
    const { data: courses } = await supabase
      .from("courses").select("id")
      .eq("tenant_id", tenantId).eq("is_published", true);
    const ids = (courses || []).map((c: any) => c.id);
    if (ids.length) {
      const { data: existing } = await supabase
        .from("enrollments").select("course_id")
        .eq("student_id", studentId).in("course_id", ids);
      const owned = new Set((existing || []).map((e: any) => e.course_id));
      const missing = ids.filter((id: string) => !owned.has(id));
      if (missing.length) {
        await supabase.from("enrollments").insert(
          missing.map((course_id: string) => ({ course_id, student_id: studentId, tenant_id: tenantId })),
        );
        result.courses = missing.length;
      }
    }
  } catch (e) { console.error("grantSubscriptionAccess courses failed:", e); }

  // ── Live courses (consultations excluded — they consume mentor time) ──
  try {
    const { data: lives } = await supabase
      .from("live_courses").select("id, product_type")
      .eq("tenant_id", tenantId).eq("is_published", true);
    const ids = (lives || [])
      .filter((l: any) => (l.product_type || "live_course") !== "consultation")
      .map((l: any) => l.id);
    if (ids.length) {
      const { data: existing } = await supabase
        .from("live_course_purchases").select("live_course_id")
        .eq("student_id", studentId).eq("payment_status", "completed").in("live_course_id", ids);
      const owned = new Set((existing || []).map((e: any) => e.live_course_id));
      const missing = ids.filter((id: string) => !owned.has(id));
      if (missing.length) {
        await supabase.from("live_course_purchases").insert(
          missing.map((live_course_id: string) => ({
            live_course_id, tenant_id: tenantId, student_id: studentId,
            gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
            payment_status: "completed", discount_amount: 0,
          })),
        );
        result.liveCourses = missing.length;
      }
    }
  } catch (e) { console.error("grantSubscriptionAccess live courses failed:", e); }

  // ── Digital products (only when the plan includes them) ───────────
  if (includeDigitalProducts) {
    try {
      const { data: products } = await supabase
        .from("digital_products").select("id")
        .eq("tenant_id", tenantId).eq("is_published", true);
      const ids = (products || []).map((p: any) => p.id);
      if (ids.length) {
        const { data: existing } = await supabase
          .from("digital_product_purchases").select("digital_product_id")
          .eq("student_id", studentId).eq("payment_status", "completed").in("digital_product_id", ids);
        const owned = new Set((existing || []).map((e: any) => e.digital_product_id));
        const missing = ids.filter((id: string) => !owned.has(id));
        if (missing.length) {
          await supabase.from("digital_product_purchases").insert(
            missing.map((digital_product_id: string) => ({
              digital_product_id, tenant_id: tenantId, student_id: studentId,
              gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
              payment_status: "completed", discount_amount: 0,
            })),
          );
          result.digitalProducts = missing.length;
        }
      }
    } catch (e) { console.error("grantSubscriptionAccess digital products failed:", e); }
  }

  return result;
}

// Grants access for every active subscription a student holds.
export async function syncActiveSubscriptions(
  supabase: SB,
  studentIds: string[],
): Promise<void> {
  if (!studentIds.length) return;
  const { data: subs } = await supabase
    .from("subscription_purchases")
    .select("tenant_id, student_id, expires_at, payment_status, subscription_plans:plan_id(includes_digital_products)")
    .in("student_id", studentIds)
    .eq("payment_status", "completed")
    .gt("expires_at", new Date().toISOString());

  for (const s of subs || []) {
    await grantSubscriptionAccess(
      supabase, s.tenant_id, s.student_id,
      !!(s as any).subscription_plans?.includes_digital_products,
    );
  }
}
