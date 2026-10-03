import { resolveMentorEmail } from "./mentor-email.ts";
import { grantCourseGifts } from "./grant-gift.ts";
import { grantOrderBump } from "./grant-bump.ts";
// Shared completion logic for a recorded-course `orders` row.
// Called from both paymob-webhook (server-to-server) and paymob-return
// (browser redirect fallback) so fulfillment happens regardless of which
// callback fires first.
async function sendNotification(
  supabaseUrl: string,
  serviceKey: string,
  templateKey: string,
  to: string,
  variables: Record<string, any>,
  idempotencyKey?: string,
  tenantId?: string,
) {
  if (!to) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id: tenantId }),
    });
  } catch (e) {
    console.error(`notify ${templateKey} failed`, e);
  }
}

/**
 * Complete an `orders` row (recorded course). Idempotent — a second call on an
 * already-paid order is a no-op.
 */
export async function completeOrder(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
  paymobTxnId: string | null,
  success: boolean,
): Promise<boolean> {
  const { data: order } = await supabase
    .from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return false;
  if (order.payment_status === "paid") return true;

  if (!success) {
    await supabase.from("orders")
      .update({ payment_status: "failed", kashier_order_id: paymobTxnId || null })
      .eq("id", orderId);
    return false;
  }

  await supabase.from("orders")
    .update({ payment_status: "paid", kashier_order_id: paymobTxnId || null })
    .eq("id", orderId);

  if (order.coupon_id) {
    await supabase.rpc("increment_coupon_used_count", { _coupon_id: order.coupon_id });
  }

  await supabase.from("enrollments").insert({
    student_id: order.student_id, course_id: order.course_id, tenant_id: order.tenant_id, order_id: orderId,
  });
  await grantOrderBump(supabase, order, order.student_id, order.tenant_id, orderId);
  // Grant all gift kinds attached to the purchased course
  await grantCourseGifts(supabase, order.course_id, order.student_id, order.tenant_id);


  const { data: courseInfo } = await supabase.from("courses")
    .select("title, slug").eq("id", order.course_id).maybeSingle();

  await supabase.from("notifications").insert({
    tenant_id: order.tenant_id, icon_name: "CreditCard",
    title: "تم الدفع بنجاح 🎉",
    description: `تم تأكيد اشتراكك في "${courseInfo?.title || "الدورة"}".`,
  });

  const [{ data: st }, mentor] = await Promise.all([
    supabase.from("students").select("full_name, email").eq("id", order.student_id).maybeSingle(),
    resolveMentorEmail(supabase, order.tenant_id),
  ]);
  const mentorEmail = mentor.email;
  const mentorName = mentor.name;
  await sendNotification(supabaseUrl, serviceKey, "mentor.new_order", mentorEmail, {
    mentor_name: mentorName,
    student_name: st?.full_name || "",
    student_email: st?.email || "",
    product_title: courseInfo?.title || "",
    amount: order.total_amount ?? order.amount,
    dashboard_url: `https://ebdaey.com/app/dashboard`,
  }, `mentor-new-order-c-${orderId}`, order.tenant_id);
  await sendNotification(supabaseUrl, serviceKey, "student.purchase_confirmation", st?.email || "", {
    student_name: st?.full_name || "",
    mentor_name: mentorName,
    product_title: courseInfo?.title || "",
    amount: order.total_amount ?? order.amount,
    order_id: orderId,
    access_url: `https://ebdaey.com/${mentor.slug}/course/${(courseInfo as any)?.slug || ""}`,
  }, `student-purchase-c-${orderId}`, order.tenant_id);

  return true;
}
