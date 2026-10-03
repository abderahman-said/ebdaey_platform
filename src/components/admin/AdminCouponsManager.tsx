import { useEffect, useMemo, useState } from "react";
import { Tag, RefreshCw, Search, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface AdminCoupon {
  id: string;
  tenant_id: string;
  mentor_name: string | null;
  mentor_slug: string | null;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  max_uses: number | null;
  used_count: number;
  max_per_customer: number | null;
  course_title: string | null;
  digital_product_title: string | null;
}

const AdminCouponsManager = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_coupons" as any);
    if (error) {
      toast({ title: "تعذر تحميل الكوبونات", variant: "destructive" });
    } else {
      setCoupons((data as unknown as AdminCoupon[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const isExpired = (c: AdminCoupon) =>
    !!c.expires_at && new Date(c.expires_at).getTime() < Date.now();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (statusFilter === "active" && (!c.is_active || isExpired(c))) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (statusFilter === "expired" && !isExpired(c)) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.mentor_name || "").toLowerCase().includes(q) ||
        (c.mentor_slug || "").toLowerCase().includes(q)
      );
    });
  }, [coupons, search, statusFilter]);

  const toggleActive = async (c: AdminCoupon) => {
    setBusyId(c.id);
    const { error } = await supabase.rpc("admin_set_coupon_active" as any, {
      _coupon_id: c.id,
      _is_active: !c.is_active,
    });
    if (error) {
      toast({ title: "تعذر تحديث الكوبون", variant: "destructive" });
    } else {
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)));
    }
    setBusyId(null);
  };

  const deleteCoupon = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("admin_delete_coupon" as any, { _coupon_id: id });
    if (error) {
      toast({ title: "تعذر حذف الكوبون", variant: "destructive" });
    } else {
      setCoupons((prev) => prev.filter((x) => x.id !== id));
      toast({ title: "تم حذف الكوبون" });
    }
    setDeleteId(null);
    setBusyId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            كوبونات المدربين
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            عرض وإدارة جميع كوبونات الخصم عبر المنصة
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCoupons} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ms-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالكود أو اسم المدرب..."
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">الكود</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">المدرب</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">الخصم</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">ينطبق على</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">الاستخدام</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">الانتهاء</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">الحالة</th>
                <th className="py-3 px-4 text-start font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" dir="ltr">{c.code}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          toast({ title: "تم نسخ الكود" });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{c.mentor_name || "—"}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{c.mentor_slug || ""}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {c.discount_value}
                    {c.discount_type === "percentage" ? "%" : " ج.م"}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {c.course_title || c.digital_product_title || "كل المنتجات"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{c.used_count}</span>
                    <span className="text-muted-foreground"> / {c.max_uses ?? "∞"}</span>
                    {c.max_per_customer != null && (
                      <div className="text-xs text-muted-foreground">للعميل: {c.max_per_customer}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground" dir="ltr">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {isExpired(c) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        منتهي
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {c.is_active ? "نشط" : "غير نشط"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        dir="ltr"
                        checked={c.is_active}
                        disabled={busyId === c.id}
                        onCheckedChange={() => toggleActive(c)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={busyId === c.id}
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    لا توجد كوبونات مطابقة
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    جارِ التحميل...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكوبون</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteCoupon(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCouponsManager;
