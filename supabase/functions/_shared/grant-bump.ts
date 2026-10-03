// Shared helper: grant the purchased order bump to a student.
// Supports all bump kinds: recorded course, live course / consultation, digital product.

type SB = any;

export async function grantOrderBump(
  supabase: SB,
  row: {
    has_order_bump?: boolean | null;
    bump_course_id?: string | null;
    bump_live_course_id?: string | null;
    bump_digital_product_id?: string | null;
  },
  studentId: string,
  tenantId: string,
  orderId?: string | null,
): Promise<void> {
  if (!row?.has_order_bump || !studentId) return;

  try {
    if (row.bump_course_id) {
      const { data: existing } = await supabase
        .from("enrollments").select("id")
        .eq("student_id", studentId).eq("course_id", row.bump_course_id).maybeSingle();
      if (!existing) {
        await supabase.from("enrollments").insert({
          student_id: studentId, course_id: row.bump_course_id,
          tenant_id: tenantId, order_id: orderId || null,
        });
      }
    }

    if (row.bump_live_course_id) {
      const { data: existing } = await supabase
        .from("live_course_purchases").select("id")
        .eq("student_id", studentId).eq("live_course_id", row.bump_live_course_id)
        .eq("payment_status", "completed").maybeSingle();
      if (!existing) {
        await supabase.from("live_course_purchases").insert({
          live_course_id: row.bump_live_course_id, tenant_id: tenantId, student_id: studentId,
          gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
          payment_status: "completed", discount_amount: 0,
        });
      }
    }

    if (row.bump_digital_product_id) {
      const { data: existing } = await supabase
        .from("digital_product_purchases").select("id")
        .eq("student_id", studentId).eq("digital_product_id", row.bump_digital_product_id)
        .eq("payment_status", "completed").maybeSingle();
      if (!existing) {
        await supabase.from("digital_product_purchases").insert({
          digital_product_id: row.bump_digital_product_id, tenant_id: tenantId,
          student_id: studentId, order_id: orderId || null,
          gross_amount: 0, platform_fee: 0, gateway_fee: 0, mentor_net: 0,
          payment_status: "completed", discount_amount: 0,
        });
      }
    }
  } catch (e) {
    console.error("grantOrderBump failed:", e);
  }
}

// Returns true when the student already owns the bump target — used to avoid charging twice.
export async function studentOwnsBumpTarget(
  supabase: SB,
  ids: { bump_course_id?: string | null; bump_live_course_id?: string | null; bump_digital_product_id?: string | null },
  studentId: string,
): Promise<boolean> {
  if (!studentId) return false;
  try {
    if (ids.bump_course_id) {
      const { data } = await supabase.from("enrollments").select("id")
        .eq("student_id", studentId).eq("course_id", ids.bump_course_id).maybeSingle();
      if (data) return true;
    }
    if (ids.bump_live_course_id) {
      const { data } = await supabase.from("live_course_purchases").select("id")
        .eq("student_id", studentId).eq("live_course_id", ids.bump_live_course_id)
        .eq("payment_status", "completed").maybeSingle();
      if (data) return true;
    }
    if (ids.bump_digital_product_id) {
      const { data } = await supabase.from("digital_product_purchases").select("id")
        .eq("student_id", studentId).eq("digital_product_id", ids.bump_digital_product_id)
        .eq("payment_status", "completed").maybeSingle();
      if (data) return true;
    }
  } catch (e) { console.error("studentOwnsBumpTarget failed:", e); }
  return false;
}
