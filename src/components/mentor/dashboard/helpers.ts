import i18n from "@/i18n";
import type { OrderData } from "./types";

export type OrderStatusKey = "paid" | "pending" | "unpaid" | "cancelled";

export const getOrderStatusLabel = (status: string, createdAt: string): {
  key: OrderStatusKey;
  label: string;
  className: string;
} => {
  const tt = (k: string) => i18n.t(`mentorDashboard.orderStatus.${k}`);
  if (status === "paid" || status === "completed") {
    return {
      key: "paid",
      label: tt("paid"),
      className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50",
    };
  }
  if (status === "failed") {
    return {
      key: "unpaid",
      label: tt("unpaid"),
      className:
        "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
    };
  }
  if (status === "cancelled") {
    return {
      key: "cancelled",
      label: tt("cancelled"),
      className: "bg-muted text-muted-foreground border border-border",
    };
  }
  // pending: check if older than 1 day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (new Date(createdAt) < oneDayAgo) {
    return {
      key: "unpaid",
      label: tt("unpaid"),
      className:
        "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
    };
  }
  return {
    key: "pending",
    label: tt("pending"),
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
  };
};

/** EGP revenue (PayMob). Stripe sales settle in USD and are tracked separately — no conversion. */
export const revenueEgp = (o: OrderData): number => (o.gateway === "stripe" ? 0 : Number(o.gross_amount || 0));

/** USD revenue as settled by Stripe. */
export const revenueUsd = (o: OrderData): number => {
  if (o.gateway !== "stripe") return 0;
  if (o.settled_usd != null) return Number(o.settled_usd || 0);
  return String(o.currency || "USD").toUpperCase() === "USD" ? Number(o.gross_amount || 0) : 0;
};

export const mergeOrdersAndDp = (
  orders: OrderData[] | null,
  dpPurchases: OrderData[] | null,
  livePurchases: OrderData[] | null = null,
): OrderData[] => {
  const o = (orders || []).map((x) => ({
    ...x,
    is_digital_product: false,
  }));
  const d = (dpPurchases || []).map((x) => ({
    ...x,
    is_digital_product: true,
    course_id: null,
    payment_status: x.payment_status === "completed" ? "paid" : x.payment_status,
    courses: x.digital_products ? { title: x.digital_products.title, price: x.digital_products.price } : undefined,
  }));
  const l = (livePurchases || []).map((x) => {
    const isConsultation = x.live_courses?.product_type === "consultation";
    const isEn = i18n.language?.startsWith("en");
    const prefix = isConsultation
      ? (isEn ? "[Consultation] " : "[استشارة] ")
      : (isEn ? "[Live course] " : "[كورس مباشر] ");
    return {
      ...x,
      is_digital_product: false,
      is_live_course: true,
      is_consultation: isConsultation,
      course_id: null,
      payment_status: x.payment_status === "completed" ? "paid" : x.payment_status,
      courses: x.live_courses
        ? { title: `${prefix}${x.live_courses.title}`, price: x.live_courses.price }
        : undefined,
    };
  });
  return [...o, ...d, ...l].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  ) as OrderData[];
};
