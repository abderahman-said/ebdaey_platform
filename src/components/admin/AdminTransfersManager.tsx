import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Search, RefreshCw, Copy, TrendingUp, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildPayoutReference } from "@/lib/payoutReference";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransferKind = "settlement" | "withdrawal";

interface AdminTransfer {
  id: string;
  reference: string;
  kind: TransferKind;
  tenantId: string;
  mentorName: string;
  amount: number;
  usd: boolean;
  status: string;
  date: string;
  note: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  settled: "تمت التسوية",
  paid: "تم التحويل",
  approved: "قيد التحويل",
  pending: "قيد المراجعة",
  rejected: "مرفوض",
};

const STATUS_CLASS: Record<string, string> = {
  settled: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  approved: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

const PERIODS = [
  { value: "all", label: "كل الفترات" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
  { value: "365", label: "آخر سنة" },
];

const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

const AdminTransfersManager = () => {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<AdminTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mentorFilter, setMentorFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [sort, setSort] = useState("newest");

  const load = async () => {
    setLoading(true);
    const [tenantsRes, wrRes, baRes] = await Promise.all([
      supabase.rpc("admin_list_tenants" as any),
      supabase
        .from("withdrawal_requests")
        .select("id, tenant_id, amount, status, created_at, updated_at, admin_note, currency")
        .order("updated_at", { ascending: false }),
      supabase
        .from("balance_adjustments")
        .select("id, tenant_id, amount, reason, created_at, currency")
        .lt("amount", 0)
        .eq("kind", "settlement")
        .order("created_at", { ascending: false }),
    ]);

    if (wrRes.error || baRes.error) {
      toast({ title: "تعذر تحميل التحويلات", variant: "destructive" });
      setLoading(false);
      return;
    }

    const names = new Map<string, string>();
    ((tenantsRes.data as any[]) || []).forEach((t) => names.set(t.id, t.name || "—"));

    const rows: AdminTransfer[] = [
      ...(((wrRes.data as any[]) || []).map((w) => ({
        id: w.id,
        reference: buildPayoutReference(w.id),
        kind: "withdrawal" as TransferKind,
        tenantId: w.tenant_id,
        mentorName: names.get(w.tenant_id) || "—",
        amount: Math.abs(Number(w.amount || 0)),
        usd: String(w.currency || "EGP").toUpperCase() !== "EGP",
        status: w.status,
        date: w.updated_at || w.created_at,
        note: w.admin_note ?? null,
      }))),
      ...(((baRes.data as any[]) || []).map((b) => ({
        id: b.id,
        reference: buildPayoutReference(b.id),
        kind: "settlement" as TransferKind,
        tenantId: b.tenant_id,
        mentorName: names.get(b.tenant_id) || "—",
        amount: Math.abs(Number(b.amount || 0)),
        usd: String(b.currency || "EGP").toUpperCase() !== "EGP",
        status: "settled",
        date: b.created_at,
        note: b.reason ?? null,
      }))),
    ];

    setTransfers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mentors = useMemo(() => {
    const map = new Map<string, string>();
    transfers.forEach((t) => map.set(t.tenantId, t.mentorName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [transfers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    const rows = transfers.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (mentorFilter !== "all" && t.tenantId !== mentorFilter) return false;
      if (cutoff && new Date(t.date).getTime() < cutoff) return false;
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        t.mentorName.toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    });
    return rows.sort((a, b) => {
      if (sort === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sort === "highest") return b.amount - a.amount;
      if (sort === "lowest") return a.amount - b.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transfers, search, kindFilter, statusFilter, mentorFilter, period, sort]);

  const totals = useMemo(() => {
    const done = filtered.filter((t) => t.status === "paid" || t.status === "settled");
    const both = (rows: AdminTransfer[]) =>
      `${fmt(rows.filter((t) => !t.usd).reduce((s, t) => s + t.amount, 0))} ج.م · $${rows.filter((t) => t.usd).reduce((s, t) => s + t.amount, 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    return {
      transferred: both(done),
      settlements: both(filtered.filter((t) => t.kind === "settlement")),
      inProgress: both(filtered.filter((t) => t.status === "approved" || t.status === "pending")),
    };
  }, [filtered]);

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast({ title: "تم نسخ الرقم المرجعي", description: ref });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" /> التحويلات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            كل التحويلات والتسويات المرسلة للمدربين مع الرقم المرجعي الذي يظهر في لوحة المدرب
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> إجمالي المحوّل فعلياً
          </div>
          <p className="text-xl font-black text-emerald-600">{totals.transferred}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <FileText className="w-3.5 h-3.5 text-primary" /> تسويات الأرصدة
          </div>
          <p className="text-xl font-black">{totals.settlements}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="w-3.5 h-3.5 text-amber-600" /> قيد التنفيذ / المراجعة
          </div>
          <p className="text-xl font-black text-amber-600">{totals.inProgress}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالرقم المرجعي أو المدرب أو المبلغ..."
            className="ps-9 bg-background"
          />
        </div>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="settlement">تسوية رصيد</SelectItem>
            <SelectItem value="withdrawal">طلب سحب</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mentorFilter} onValueChange={setMentorFilter}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="المدرب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المدربين</SelectItem>
            {mentors.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="الفترة" /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="الترتيب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث أولاً</SelectItem>
            <SelectItem value="oldest">الأقدم أولاً</SelectItem>
            <SelectItem value="highest">الأعلى مبلغاً</SelectItem>
            <SelectItem value="lowest">الأقل مبلغاً</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Banknote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">لا توجد تحويلات مطابقة</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="text-start p-3 font-semibold w-12">#</th>
                  <th className="text-start p-3 font-semibold">التاريخ</th>
                  <th className="text-start p-3 font-semibold">المدرب</th>
                  <th className="text-start p-3 font-semibold">المبلغ</th>
                  <th className="text-start p-3 font-semibold">الرقم المرجعي</th>
                  <th className="text-start p-3 font-semibold">النوع</th>
                  <th className="text-start p-3 font-semibold">الحالة</th>
                  <th className="text-start p-3 font-semibold">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const dt = new Date(t.date);
                  return (
                    <tr key={`${t.kind}-${t.id}`} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div>{dt.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</div>
                        <div className="text-xs text-muted-foreground">
                          {dt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{t.mentorName}</td>
                      <td className="p-3 whitespace-nowrap font-bold">{t.usd ? `$${t.amount.toLocaleString("en-US")}` : `${fmt(t.amount)} ج.م`}</td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => copyRef(t.reference)}
                          className="font-mono text-xs inline-flex items-center gap-1 hover:text-primary transition-colors"
                          title="نسخ الرقم المرجعي"
                        >
                          {t.reference}
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs">
                        {t.kind === "settlement" ? "تسوية رصيد" : "طلب سحب"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[t.status] || "bg-muted text-muted-foreground"}`}
                        >
                          {STATUS_LABEL[t.status] || t.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs max-w-[280px]">{t.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminTransfersManager;
