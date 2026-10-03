// Shared completion logic for a digital_product_purchases row.
// Idempotent — safe to call from the webhook, the browser return, and the
// reconciliation job.
import { grantOrderBump } from "./grant-bump.ts";
import { grantDigitalProductGifts } from "./grant-gift.ts";
import { resolveMentorEmail } from "./mentor-email.ts";

async function sendNotification(
  supabaseUrl: string,
  serviceKey: string,
  templateKey: string,
  to: string,
  variables: Record<string, unknown>,
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

export async function completeDigitalProductPurchase(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  purchaseId: string,
  paymobTxnId: string | null,
  success: boolean,
): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("digital_product_purchases").select("*").eq("id", purchaseId).maybeSingle();

  if (!purchase) return false;
  if (purchase.payment_status === "completed") return true;

  if (!success) {
    await supabase.from("digital_product_purchases")
      .update({ payment_status: "failed", kashier_order_id: paymobTxnId || null })
      .eq("id", purchaseId);
    return false;
  }

  await supabase.from("digital_product_purchases")
    .update({ payment_status: "completed", kashier_order_id: paymobTxnId || null })
    .eq("id", purchaseId);

  if (purchase.coupon_id) {
    await supabase.rpc("increment_coupon_used_count", { _coupon_id: purchase.coupon_id });
  }

  await grantDigitalProductGifts(
    supabase, purchase.digital_product_id, purchase.student_id, purchase.tenant_id,
  );
  await grantOrderBump(
    supabase, purchase, purchase.student_id, purchase.tenant_id, purchase.order_id ?? null,
  );

  const { data: product } = await supabase
    .from("digital_products").select("title").eq("id", purchase.digital_product_id).maybeSingle();

  await supabase.from("notifications").insert({
    tenant_id: purchase.tenant_id,
    icon_name: "Package",
    title: "تم شراء منتج رقمي 🎉",
    description: `تم تأكيد شرائك لـ "${product?.title || "المنتج"}".`,
  });

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-digital-product-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ purchaseId }),
    });
  } catch (error) {
    console.error("DP delivery email error:", error);
  }

  try {
    const [{ data: st }, mentor] = await Promise.all([
      supabase.from("students").select("full_name, email").eq("id", purchase.student_id).maybeSingle(),
      resolveMentorEmail(supabase, purchase.tenant_id),
    ]);
    await sendNotification(supabaseUrl, serviceKey, "mentor.new_order", mentor.email, {
      mentor_name: mentor.name,
      student_name: st?.full_name || "",
      student_email: st?.email || "",
      product_title: product?.title || "",
      amount: purchase.amount,
      dashboard_url: `https://ebdaey.com/app/dashboard`,
    }, `mentor-new-order-dp-${purchaseId}`, purchase.tenant_id);
    await sendNotification(supabaseUrl, serviceKey, "student.purchase_confirmation", st?.email || "", {
      student_name: st?.full_name || "",
      mentor_name: mentor.name,
      product_title: product?.title || "",
      amount: purchase.amount,
      order_id: purchaseId,
      access_url: `https://ebdaey.com/${mentor.slug}`,
    }, `student-purchase-dp-${purchaseId}`, purchase.tenant_id);
  } catch (e) {
    console.error("DP emails failed:", e);
  }

  return true;
}
