import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Tag, Copy, Edit2, Trash2, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, currencyName, formatMoney } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseData {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  description: string | null;
  thumbnail_url: string | null;
  banner_type: string | null;
  banner_video_url: string | null;
}

interface CouponData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  max_per_customer: number | null;
  used_count: number;
  course_id: string | null;
  digital_product_id?: string | null;
}

interface CouponsTabProps {
  tenantId: string;
  courses: CourseData[];
  digitalProducts: Array<{ id: string; title: string }>;
  coupons: CouponData[];
  setCoupons: React.Dispatch<React.SetStateAction<CouponData[]>>;
}

const CouponsTab = ({
  tenantId,
  courses,
  digitalProducts,
  coupons,
  setCoupons,
}: CouponsTabProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const { toast } = useToast();
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponType, setNewCouponType] = useState<"percentage" | "fixed">("percentage");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<number | null>(null);
  const [newCouponMaxPerCustomer, setNewCouponMaxPerCustomer] = useState<number | null>(null);
  const [newCouponCourseId, setNewCouponCourseId] = useState<string | null>(null);
  const [newCouponDigitalProductId, setNewCouponDigitalProductId] = useState<string | null>(null);
  const [newCouponActive, setNewCouponActive] = useState(true);
  const [amounts, setAmounts] = useState<{ currency: string; amount: number }[]>([{ currency: "EGP", amount: 10 }]);
  const [enableMaxUses, setEnableMaxUses] = useState(false);
  const [enableMaxPerCustomer, setEnableMaxPerCustomer] = useState(false);
  const [enableCourseSpecific, setEnableCourseSpecific] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponDeleteId, setCouponDeleteId] = useState<string | null>(null);

  const resetCouponForm = () => {
    setNewCouponCode("");
    setNewCouponValue(10);
    setNewCouponType("percentage");
    setNewCouponMaxUses(null);
    setNewCouponMaxPerCustomer(null);
    setNewCouponCourseId(null);
    setNewCouponDigitalProductId(null);
    setNewCouponActive(true);
    setAmounts([{ currency: "EGP", amount: 10 }]);
    setEnableMaxUses(false);
    setEnableMaxPerCustomer(false);
    setEnableCourseSpecific(false);
    setEditingCouponId(null);
    setShowCouponForm(false);
  };

  const addCoupon = async () => {
    if (!tenantId || !newCouponCode) return;
    const fixedRows = amounts.filter((a) => a.amount > 0);
    if (newCouponType === "fixed" && fixedRows.length === 0) {
      toast({ title: t("couponsTab.amountsRequired", "أضف قيمة خصم لعملة واحدة على الأقل"), variant: "destructive" });
      return;
    }
    const payload = {
      tenant_id: tenantId,
      code: newCouponCode.toUpperCase(),
      discount_type: newCouponType,
      discount_value: newCouponType === "fixed"
        ? (fixedRows.find((a) => a.currency === "EGP")?.amount ?? fixedRows[0].amount)
        : newCouponValue,
      is_active: newCouponActive,
      max_uses: enableMaxUses ? newCouponMaxUses : null,
      max_per_customer: enableMaxPerCustomer ? newCouponMaxPerCustomer : null,
      course_id: enableCourseSpecific ? newCouponCourseId : null,
      digital_product_id: enableCourseSpecific ? newCouponDigitalProductId : null,
    };

    try {
      const saveAmounts = async (couponId: string) => {
        await supabase.from("coupon_amounts").delete().eq("coupon_id", couponId);
        if (newCouponType === "fixed") {
          const { error } = await supabase.from("coupon_amounts").insert(
            fixedRows.map((a) => ({ coupon_id: couponId, tenant_id: tenantId, currency: a.currency, amount: a.amount })),
          );
          if (error) throw error;
        }
      };
      if (editingCouponId) {
        const { data, error } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editingCouponId)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await saveAmounts(editingCouponId);
          setCoupons(coupons.map((c) => (c.id === editingCouponId ? (data as any) : c)));
          toast({ title: t("couponsTab.toasts.updated") });
        }
      } else {
        const { data, error } = await supabase
          .from("coupons")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await saveAmounts((data as any).id);
          setCoupons([data as any, ...coupons]);
          toast({ title: t("couponsTab.toasts.created") });
        }
      }
      resetCouponForm();
    } catch {
      toast({ title: t("couponsTab.toasts.saveError"), variant: "destructive" });
    }
  };

  const startEditCoupon = async (coupon: CouponData) => {
    setEditingCouponId(coupon.id);
    if (coupon.discount_type === "fixed") {
      const { data } = await supabase.from("coupon_amounts").select("currency,amount").eq("coupon_id", coupon.id);
      const rows = ((data as any[]) || []).map((r) => ({ currency: r.currency, amount: Number(r.amount) }));
      setAmounts(rows.length ? rows : [{ currency: "EGP", amount: Number(coupon.discount_value) }]);
    } else setAmounts([{ currency: "EGP", amount: 10 }]);
    setNewCouponCode(coupon.code);
    setNewCouponValue(coupon.discount_value);
    setNewCouponType(coupon.discount_type as "percentage" | "fixed");
    setNewCouponActive(coupon.is_active);
    setEnableMaxUses(coupon.max_uses !== null);
    setNewCouponMaxUses(coupon.max_uses);
    setEnableMaxPerCustomer(coupon.max_per_customer !== null);
    setNewCouponMaxPerCustomer(coupon.max_per_customer);
    setEnableCourseSpecific(
      coupon.course_id !== null || coupon.digital_product_id != null,
    );
    setNewCouponCourseId(coupon.course_id);
    setNewCouponDigitalProductId(coupon.digital_product_id ?? null);
    setShowCouponForm(true);
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      setCoupons(coupons.filter((c) => c.id !== id));
      setCouponDeleteId(null);
      toast({ title: t("couponsTab.toasts.deleted") });
    } catch {
      toast({ title: t("couponsTab.toasts.deleteError"), variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-primary" />{t("couponsTab.title")}</h1>
        <Button
          onClick={() => {
            resetCouponForm();
            setShowCouponForm(true);
          }}
          className="gradient-primary text-primary-foreground border-0"
        >
          <Plus className="w-4 h-4 ms-2" />
          {t("couponsTab.newCoupon")}
        </Button>
      </div>

      {/* Coupon Form Dialog */}
      <Dialog
        open={showCouponForm}
        onOpenChange={(open) => {
          if (!open) resetCouponForm();
        }}
      >
        <DialogContent className="sm:max-w-lg" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {editingCouponId ? t("couponsTab.editTitle") : t("couponsTab.addTitle")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t("couponsTab.dialogSubtitle")}
            </p>
          </DialogHeader>
          <div className="space-y-5">
            {/* Code */}
            <div className="space-y-2">
              <Label className="font-medium">
                {t("couponsTab.codeLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder={t("couponsTab.codePlaceholder")}
                dir="ltr"
                className="text-start"
              />
              <p className="text-xs text-muted-foreground">
                {t("couponsTab.codeHint")}
              </p>
            </div>

            {/* Discount Type Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm">{t("couponsTab.typeFixed")}</span>
                  <input
                    type="radio"
                    name="discountType"
                    checked={newCouponType === "fixed"}
                    onChange={() => setNewCouponType("fixed")}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm">{t("couponsTab.typePercentage")}</span>
                  <input
                    type="radio"
                    name="discountType"
                    checked={newCouponType === "percentage"}
                    onChange={() => setNewCouponType("percentage")}
                    className="accent-primary"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("couponsTab.typeHint")}
              </p>
            </div>

            {/* Discount Value */}
            {newCouponType === "fixed" ? (
            <div className="space-y-2">
              <Label className="font-medium">{t("couponsTab.valueLabel")}</Label>
              {amounts.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={a.currency}
                    onValueChange={(v) => setAmounts(amounts.map((x, j) => (j === i ? { ...x, currency: v } : x)))}
                  >
                    <SelectTrigger className="w-40 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.filter((c) => c === a.currency || !amounts.some((x) => x.currency === c)).map((c) => (
                        <SelectItem key={c} value={c}>{currencyName(c)} ({c})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={a.amount}
                    onChange={(e) => setAmounts(amounts.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))}
                    dir="ltr"
                    className="text-start flex-1"
                  />
                  {amounts.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setAmounts(amounts.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {amounts.length < CURRENCIES.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = CURRENCIES.find((c) => !amounts.some((x) => x.currency === c));
                    if (next) setAmounts([...amounts, { currency: next, amount: 0 }]);
                  }}
                >
                  <Plus className="w-4 h-4" /> {t("couponsTab.addCurrency", "إضافة عملة")}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {t("couponsTab.amountsHint", "يُطبَّق الكوبون فقط على المشترين الذين يدفعون بإحدى هذه العملات.")}
              </p>
            </div>
            ) : (
            <div className="space-y-2">
              <Label className="font-medium">{t("couponsTab.valueLabel")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                  dir="ltr"
                  className="text-start pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {newCouponType === "percentage" ? "%" : t("couponsTab.currency")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("couponsTab.valueHint")}
              </p>
            </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("couponsTab.activeHint")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("couponsTab.activeToggle")}</span>
                <Switch
                  dir="ltr"
                  checked={newCouponActive}
                  onCheckedChange={setNewCouponActive}
                />
              </div>
            </div>

            {/* Max Uses Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("couponsTab.maxUsesHint")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("couponsTab.maxUsesToggle")}</span>
                  <Switch
                    dir="ltr"
                    checked={enableMaxUses}
                    onCheckedChange={setEnableMaxUses}
                  />
                </div>
              </div>
              {enableMaxUses && (
                <Input
                  type="number"
                  value={newCouponMaxUses || ""}
                  onChange={(e) => setNewCouponMaxUses(Number(e.target.value) || null)}
                  placeholder={t("couponsTab.maxUsesPlaceholder")}
                  dir="ltr"
                  className="text-start"
                />
              )}
            </div>

            {/* Max Per Customer Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("couponsTab.maxPerCustomerHint")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("couponsTab.maxPerCustomerToggle")}</span>
                  <Switch
                    dir="ltr"
                    checked={enableMaxPerCustomer}
                    onCheckedChange={setEnableMaxPerCustomer}
                  />
                </div>
              </div>
              {enableMaxPerCustomer && (
                <Input
                  type="number"
                  value={newCouponMaxPerCustomer || ""}
                  onChange={(e) => setNewCouponMaxPerCustomer(Number(e.target.value) || null)}
                  placeholder={t("couponsTab.maxPerCustomerPlaceholder")}
                  dir="ltr"
                  className="text-start"
                />
              )}
            </div>

            {/* Course Specific Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("couponsTab.specificHint")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("couponsTab.specificToggle")}</span>
                  <Switch
                    dir="ltr"
                    checked={enableCourseSpecific}
                    onCheckedChange={setEnableCourseSpecific}
                  />
                </div>
              </div>
              {enableCourseSpecific && (
                <Select
                  value={
                    newCouponCourseId
                      ? `course:${newCouponCourseId}`
                      : newCouponDigitalProductId
                      ? `product:${newCouponDigitalProductId}`
                      : ""
                  }
                  onValueChange={(v) => {
                    const [kind, id] = v.split(":");
                    if (kind === "course") {
                      setNewCouponCourseId(id);
                      setNewCouponDigitalProductId(null);
                    } else {
                      setNewCouponDigitalProductId(id);
                      setNewCouponCourseId(null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("couponsTab.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">{t("couponsTab.coursesGroup")}</div>
                    )}
                    {courses.map((c) => (
                      <SelectItem key={`course-${c.id}`} value={`course:${c.id}`}>
                        {c.title}
                      </SelectItem>
                    ))}
                    {digitalProducts.length > 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground mt-1">{t("couponsTab.productsGroup")}</div>
                    )}
                    {digitalProducts.map((p) => (
                      <SelectItem key={`product-${p.id}`} value={`product:${p.id}`}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={resetCouponForm}>
              {t("couponsTab.back")} <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
            <Button onClick={addCoupon} className="gradient-primary text-primary-foreground border-0">
              <Check className="w-4 h-4 ml-2" />
              {t("couponsTab.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!couponDeleteId} onOpenChange={() => setCouponDeleteId(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("couponsTab.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("couponsTab.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("couponsTab.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => couponDeleteId && deleteCoupon(couponDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("couponsTab.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coupons Table */}
      {coupons.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={dir}>
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">#</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.code")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.value")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.maxUses")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.maxPerCustomer")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.usedCount")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.status")}</th>
                  <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t("couponsTab.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon, index) => (
                  <tr
                    key={coupon.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" dir="ltr">
                          {coupon.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code);
                            toast({ title: t("couponsTab.toasts.codeCopied") });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : formatMoney(Number(coupon.discount_value), "EGP")}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {coupon.max_uses !== null ? coupon.max_uses : t("couponsTab.unlimited")}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {coupon.max_per_customer !== null ? coupon.max_per_customer : t("couponsTab.unlimited")}
                    </td>
                    <td className="py-3 px-4">{coupon.used_count}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          coupon.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {coupon.is_active ? t("couponsTab.statusActive") : t("couponsTab.statusInactive")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditCoupon(coupon)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setCouponDeleteId(coupon.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("couponsTab.empty")}</p>
        </div>
      )}
    </>
  );
};

export default CouponsTab;
