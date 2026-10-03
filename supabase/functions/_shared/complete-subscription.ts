// Shared helper: finalise a yearly subscription purchase after PayMob confirms it.
import { grantSubscriptionAccess } from "./grant-subscription.ts";
import { resolveMentorEmail } from "./mentor-email.ts";

type SB = any;

export async function completeSubscriptionPurchase(
  supabase: SB,
  supabaseUrl: string,
  serviceKey: string,
  purchaseId: string,
  paymobTxnId: string,
  success: boolean,
): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("subscription_purchases")
    .select("*, subscription_plans:plan_id(includes_digital_products, price)")
    .eq("id", purchaseId)
    .maybeSingle();

  if (!purchase) return false;
  if (purchase.payment_status === "completed") return true;

  if (!success) {
    await supabase.from("subscription_purchases")
      .update({ payment_status: "failed", gateway_reference: paymobTxnId || null })
      .eq("id", purchaseId);
    return false;
  }

  const starts = new Date();
  const expires = new Date(starts);
  expires.setFullYear(expires.getFullYear() + 1);

  await supabase.from("subscription_purchases").update({
    payment_status: "completed",
    gateway_reference: paymobTxnId || null,
    starts_at: starts.toISOString(),
    expires_at: expires.toISOString(),
  }).eq("id", purchaseId);

  // Materialise access to every published product of this mentor
  await grantSubscriptionAccess(
    supabase,
    purchase.tenant_id,
    purchase.student_id,
    !!purchase.subscription_plans?.includes_digital_products,
  );

  await supabase.from("notifications").insert({
    tenant_id: purchase.tenant_id,
    icon_name: "Crown",
    title: "اشتراك سنوي جديد 👑",
    description: "تم تأكيد اشتراك سنوي جديد في باقتك.",
  });

  try {
    const [{ data: student }, mentor] = await Promise.all([
      supabase.from("students").select("full_name, email").eq("id", purchase.student_id).maybeSingle(),
      resolveMentorEmail(supabase, purchase.tenant_id),
    ]);

    const notify = async (templateKey: string, to: string, variables: Record<string, unknown>, idempotencyKey: string) => {
      if (!to) return;
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ templateKey, to, variables, idempotencyKey, tenant_id: purchase.tenant_id }),
        });
      } catch (e) { console.error(`notify ${templateKey} failed`, e); }
    };

    await notify("mentor.new_order", mentor.email, {
      mentor_name: mentor.name,
      student_name: student?.full_name || "",
      student_email: student?.email || "",
      product_title: "الاشتراك السنوي",
      amount: purchase.amount,
      dashboard_url: `https://ebdaey.com/app/dashboard`,
    }, `mentor-new-order-sub-${purchaseId}`);

    await notify("student.purchase_confirmation", student?.email || "", {
      student_name: student?.full_name || "",
      mentor_name: mentor.name,
      product_title: "الاشتراك السنوي",
      amount: purchase.amount,
      order_id: purchaseId,
      access_url: `https://ebdaey.com/${mentor.slug}/dashboard`,
    }, `student-purchase-sub-${purchaseId}`);
  } catch (e) {
    console.error("subscription emails failed:", e);
  }

  return true;
}
