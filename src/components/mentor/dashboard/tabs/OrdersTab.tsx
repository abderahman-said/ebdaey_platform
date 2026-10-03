import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Search,
  Eye,
  MessageCircle,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/currency";
import { getGeoFromPhone, getGeoFromCountryCode } from "@/lib/phoneGeo";
import { getOrderStatusLabel, type OrderStatusKey } from "../helpers";
import type { OrderData } from "../types";

interface OrdersTabProps {
  orders: OrderData[];
  onDeleted: () => void;
}

export default function OrdersTab({ orders, onDeleted }: OrdersTabProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isEn = i18n.language?.startsWith("en");
  const dateLocale = isEn ? "en-US" : "ar-EG";
  const currency = t("orders.currency");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refundChoice, setRefundChoice] = useState<"refund" | "none">("refund");

  // A refund is only possible for real paid transactions (not free / 100% discount)
  const canRefund =
    !!orderToDelete &&
    Number(orderToDelete.gross_amount || 0) > 0 &&
    ["paid", "completed"].includes(orderToDelete.payment_status);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    const table = orderToDelete.is_live_course
      ? "live_course_purchases"
      : orderToDelete.is_digital_product
      ? "digital_product_purchases"
      : "orders";

    if (canRefund && refundChoice === "refund") {
      const { data, error: fnErr } = await supabase.functions.invoke("refund-order", {
        body: { orderId: orderToDelete.id, table },
      });
      setDeleting(false);
      const resError = (data as { error?: string } | null)?.error;
      if (fnErr || resError) {
        toast({
          title: t("orders.delete.refundErrorTitle", "تعذر تنفيذ الاسترداد"),
          description: resError || fnErr?.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: t("orders.delete.refundSuccess", "تم إلغاء الطلب واسترداد المبلغ") });
      setOrderToDelete(null);
      onDeleted();
      return;
    }

    const { error } = await supabase
      .from(table)
      .update({ payment_status: "cancelled" })
      .eq("id", orderToDelete.id);
    if (error) {
      setDeleting(false);
      toast({
        title: t("orders.delete.errorTitle", "تعذر إلغاء الطلب"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Revoke access granted by this order so the student can order again
    if (table === "orders") {
      const enrollQuery = supabase.from("enrollments").delete().eq("order_id", orderToDelete.id);
      const { error: enrollErr } = await enrollQuery;
      if (enrollErr) console.error("failed to revoke enrollment by order", enrollErr);
      // Older orders may not have order_id set on the enrollment row
      if (orderToDelete.student_id && orderToDelete.course_id) {
        await supabase
          .from("enrollments")
          .delete()
          .eq("student_id", orderToDelete.student_id)
          .eq("course_id", orderToDelete.course_id)
          .is("order_id", null);
      }
    } else if (table === "live_course_purchases") {
      await supabase
        .from("consultation_bookings")
        .update({ status: "cancelled" })
        .eq("purchase_id", orderToDelete.id);
    }

    // Notify the mentor by email that the order was cancelled
    supabase.functions
      .invoke("send-order-cancelled", { body: { orderId: orderToDelete.id, table } })
      .catch((e) => console.error("cancel email failed", e));

    setDeleting(false);
    toast({ title: t("orders.delete.success", "تم إلغاء الطلب") });

    setOrderToDelete(null);
    onDeleted();
  };

  const filteredOrders = orders.filter((order) => {
    const name = order.students?.full_name || "";
    const email = order.students?.email || "";
    const matchesSearch = !search || name.includes(search) || email.includes(search);

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;

    const { key } = getOrderStatusLabel(order.payment_status, order.created_at);
    if (statusFilter === "paid") return key === "paid";
    if (statusFilter === "pending") return key === "pending";
    if (statusFilter === "unpaid") return key === "unpaid";
    if (statusFilter === "cancelled") return key === "cancelled";
    return true;
  });

  const getDiscountAmount = (order: OrderData) => {
    const coursePrice = order.courses?.price || order.gross_amount;
    return coursePrice - order.gross_amount;
  };

  const getWhatsAppUrl = (order: OrderData) => {
    const phone = order.students?.phone;
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
    const status = getOrderStatusLabel(order.payment_status, order.created_at);
    const isUnpaid = status.key !== "paid";
    const courseName = order.courses?.title || "";
    const studentName = order.students?.full_name || "";
    const message = isUnpaid
      ? t("orders.whatsapp.unpaid", { name: studentName, course: courseName })
      : t("orders.whatsapp.paid", { name: studentName, course: courseName });
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  const statusLabel = (key: OrderStatusKey) => t(`orders.statusFilters.${key}`);

  return (
    <>
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            {t("orders.title")}
          </h1>
          <span className="text-sm text-muted-foreground">
            {t("orders.count", { count: orders.length })}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center lg:flex-1 lg:justify-end">
          <div className="relative w-full sm:w-64 lg:max-w-md">
            <Search
              className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
            />
            <Input
              placeholder={t("orders.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${isEn ? "pl-9" : "pr-9"} bg-background dark:bg-input`}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("orders.statusLabel")}
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background dark:bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.statusFilters.all")}</SelectItem>
                <SelectItem value="paid">{t("orders.statusFilters.paid")}</SelectItem>
                <SelectItem value="pending">{t("orders.statusFilters.pending")}</SelectItem>
                <SelectItem value="unpaid">{t("orders.statusFilters.unpaid")}</SelectItem>
                <SelectItem value="cancelled">{t("orders.statusFilters.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start p-2 font-medium text-muted-foreground w-10">#</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.product")}</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.customer")}</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.cost")}</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.status")}</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.createdAt")}</th>
                <th className="text-start p-2 font-medium text-muted-foreground">{t("orders.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => {
                const status = getOrderStatusLabel(order.payment_status, order.created_at);
                return (
                  <tr key={order.id} className="hover:bg-muted/50">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">
                      {order.courses?.title ||
                        order.product_title || (
                          <span className="text-muted-foreground italic">
                            {t("orders.table.deletedProduct")}
                          </span>
                        )}
                    </td>
                    <td className="p-2 font-medium">{order.students?.full_name || "-"}</td>
                    <td className="p-2">
                      {order.gateway === "stripe"
                        ? formatMoney(Number(order.amount_paid || 0), order.currency)
                        : order.gross_amount > 0
                        ? `${order.gross_amount.toFixed(2)} ${currency}`
                        : ""}
                    </td>
                    <td className="p-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {statusLabel(status.key)}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString(dateLocale, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-primary transition-colors"
                          title={t("orders.actions.viewDetails")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {getWhatsAppUrl(order) && (
                          <a
                            href={getWhatsAppUrl(order)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 text-emerald-600 hover:text-emerald-700 transition-colors dark:text-emerald-400"
                            title={t("orders.actions.contactWhatsapp")}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-destructive transition-colors"
                          title={t("orders.actions.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {t("orders.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md" dir={isEn ? "ltr" : "rtl"}>
          {selectedOrder &&
            (() => {
              const status = getOrderStatusLabel(selectedOrder.payment_status, selectedOrder.created_at);
              const coursePrice = selectedOrder.courses?.price || selectedOrder.gross_amount;
              const discount = getDiscountAmount(selectedOrder);
              const coupon = selectedOrder.coupons;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg font-bold">
                      {selectedOrder.courses?.title || selectedOrder.product_title || "-"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    {/* Date & Status */}
                    <div className="text-center space-y-1">
                      <p className="text-muted-foreground">
                        {new Date(selectedOrder.created_at).toLocaleDateString(dateLocale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.className}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {statusLabel(status.key)}
                      </span>
                    </div>

                    {/* Purchase Price */}
                    <div className="text-center space-y-1">
                      <h4 className="font-bold">{t("orders.detail.purchasePrice")}</h4>
                      <p>
                        {coursePrice.toFixed(2)} {currency}
                      </p>
                      {discount > 0 && (
                        <>
                          <p className="text-emerald-600">
                            {discount.toFixed(2)} {currency} ({t("orders.detail.discount")}
                            {coupon ? ` - ${coupon.code}` : ""})
                          </p>
                          <p>
                            {selectedOrder.gross_amount.toFixed(2)} {currency}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Settlement */}
                    <div className="text-center space-y-1">
                      <h4 className="font-bold">{t("orders.detail.settlement")}</h4>
                      <div className="flex justify-between px-4">
                        <span>{t("orders.detail.grossAmount")}</span>
                        <span>
                          {selectedOrder.gross_amount.toFixed(2)} {currency}
                        </span>
                      </div>
                      <div className="flex justify-between px-4">
                        <span>{t("orders.detail.gatewayFee")}</span>
                        <span className="text-destructive">
                          {selectedOrder.gateway_fee.toFixed(2)} {currency}
                        </span>
                      </div>
                      <div className="flex justify-between px-4">
                        <span>{t("orders.detail.platformFee")}</span>
                        <span className="text-destructive">
                          {selectedOrder.platform_fee.toFixed(2)} {currency}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 font-bold">
                        <span>{t("orders.detail.netAmount")}</span>
                        <span>
                          {selectedOrder.mentor_net.toFixed(2)} {currency}
                        </span>
                      </div>
                    </div>

                    {/* Product */}
                    <div className="text-center space-y-1">
                      <h4 className="font-bold">{t("orders.detail.product")}</h4>
                      <p>
                        {selectedOrder.courses?.title || selectedOrder.product_title || "-"}
                      </p>
                    </div>

                    {/* Customer */}
                    <div className="text-center space-y-1">
                      <h4 className="font-bold">{t("orders.detail.customer")}</h4>
                      <p>{selectedOrder.students?.full_name || "-"}</p>
                      <p className="text-primary" dir="ltr">
                        {selectedOrder.students?.email || "-"}
                      </p>
                      {selectedOrder.students?.phone && (
                        <p className="text-muted-foreground" dir="ltr">
                          {selectedOrder.students.phone}
                        </p>
                      )}
                      {(() => {
                        const lang = isEn ? "en" : "ar";
                        const geo =
                          getGeoFromCountryCode(selectedOrder.buyer_country, lang) ||
                          getGeoFromPhone(selectedOrder.students?.phone, lang);
                        if (!geo) return null;
                        return (
                          <p className="text-muted-foreground">
                            {geo.country} · {geo.continent}
                          </p>
                        );
                      })()}
                    </div>

                    {/* WhatsApp Button */}
                    {getWhatsAppUrl(selectedOrder) && (
                      <div className="text-center pt-2">
                        <a
                          href={getWhatsAppUrl(selectedOrder)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-sm font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {t("orders.actions.contactWhatsapp")}
                        </a>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(open) => {
          if (!open) setOrderToDelete(null);
          else setRefundChoice("refund");
        }}
      >
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.delete.title", "إلغاء الطلب؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.delete.description", "سيتم تعليم هذا الطلب كملغي دون حذفه من السجلات.")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {canRefund && (
            <div className="space-y-3">
              <RadioGroup
                value={refundChoice}
                onValueChange={(v) => setRefundChoice(v as "refund" | "none")}
                className="gap-2"
              >
                <label
                  htmlFor="cancel-refund"
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    refundChoice === "refund" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="refund" id="cancel-refund" className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-semibold">
                      {t("orders.delete.withRefund", "إلغاء مع رد المبلغ")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("orders.delete.withRefundHint", "سيتم رد المبلغ للعميل عبر بوابة الدفع")}{" "}
                      ({Number(orderToDelete?.gross_amount || 0).toFixed(2)} {currency})
                    </span>
                  </span>
                </label>
                <label
                  htmlFor="cancel-norefund"
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    refundChoice === "none" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="none" id="cancel-norefund" className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-semibold">
                      {t("orders.delete.withoutRefund", "إلغاء بدون رد المبلغ")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("orders.delete.withoutRefundHint", "سيتم إلغاء وصول الطالب فقط دون رد أي مبالغ")}
                    </span>
                  </span>
                </label>
              </RadioGroup>

              {refundChoice === "refund" && (
                <p className="text-xs rounded-lg bg-amber-50 text-amber-800 border border-amber-200 p-2.5 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/50">
                  {t(
                    "orders.delete.commissionWarning",
                    "تنبيه: عمولة المنصة وعمولة بوابة الدفع غير قابلة للاسترداد وسيتم خصمها من رصيدك.",
                  )}
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("orders.delete.cancel", "تراجع")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteOrder();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("orders.delete.deleting", "جارٍ الإلغاء...") : t("orders.delete.confirm", "إلغاء الطلب")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
