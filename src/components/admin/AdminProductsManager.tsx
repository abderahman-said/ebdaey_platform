import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Boxes,
  Search,
  RefreshCw,
  Video,
  FileArchive,
  Radio,
  CalendarClock,
  Package,
  ExternalLink,
  CircleUser,
} from "lucide-react";
import OptimizedImage from "@/components/media/OptimizedImage";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { openExternal } from "@/lib/openExternal";

type ProductKind = "course" | "digital_product" | "live_course" | "consultation";

interface AdminProduct {
  id: string;
  kind: ProductKind;
  title: string;
  slug: string | null;
  price: number;
  thumbnail_url: string | null;
  created_at: string;
  tenant_id: string;
  sales: number;
  revenue: number;
  is_published: boolean;
}

const KIND_META: Record<ProductKind, { label: string; icon: any; className: string }> = {
  course: { label: "كورس مسجل", icon: Video, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  digital_product: { label: "منتج رقمي", icon: FileArchive, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  live_course: { label: "كورس لايف", icon: Radio, className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  consultation: { label: "استشارة", icon: CalendarClock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

interface Props {
  tenants: { id: string; name: string }[];
  onOpenMentorDetail?: (tenantId: string) => void;
}

const AdminProductsManager = ({ tenants, onOpenMentorDetail }: Props) => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [mentorFilter, setMentorFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [tenantSlugs, setTenantSlugs] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [coursesRes, dpRes, lcRes, ordersRes, dpPurRes, lcPurRes, tenantsRes] = await Promise.all([
      supabase.from("courses").select("id, title, slug, price, thumbnail_url, created_at, tenant_id, is_published"),
      supabase.from("digital_products").select("id, title, slug, price, thumbnail_url, created_at, tenant_id, is_published"),
      supabase.from("live_courses").select("id, title, slug, price, thumbnail_url, created_at, tenant_id, product_type, is_published"),
      supabase.from("orders").select("course_id, gross_amount, payment_status").eq("payment_status", "paid"),
      supabase.from("digital_product_purchases").select("digital_product_id, gross_amount, payment_status"),
      supabase.from("live_course_purchases").select("live_course_id, gross_amount, payment_status"),
      supabase.from("tenants").select("id, slug"),
    ]);

    setTenantSlugs(
      Object.fromEntries((tenantsRes.data || []).map((t: any) => [t.id, t.slug]))
    );


    const agg = new Map<string, { sales: number; revenue: number }>();
    const bump = (id: string | null, amount: any) => {
      if (!id) return;
      const cur = agg.get(id) || { sales: 0, revenue: 0 };
      cur.sales += 1;
      cur.revenue += Number(amount) || 0;
      agg.set(id, cur);
    };
    (ordersRes.data || []).forEach((o: any) => bump(o.course_id, o.gross_amount));
    (dpPurRes.data || [])
      .filter((p: any) => !p.payment_status || p.payment_status === "paid")
      .forEach((p: any) => bump(p.digital_product_id, p.gross_amount));
    (lcPurRes.data || [])
      .filter((p: any) => !p.payment_status || p.payment_status === "paid")
      .forEach((p: any) => bump(p.live_course_id, p.gross_amount));

    const build = (rows: any[], kind: (r: any) => ProductKind): AdminProduct[] =>
      rows.map((r) => ({
        id: r.id,
        kind: kind(r),
        title: r.title || "—",
        slug: r.slug ?? null,
        price: Number(r.price) || 0,
        thumbnail_url: r.thumbnail_url ?? null,
        created_at: r.created_at,
        tenant_id: r.tenant_id,
        sales: agg.get(r.id)?.sales || 0,
        revenue: agg.get(r.id)?.revenue || 0,
        is_published: !!r.is_published,
      }));

    setProducts([
      ...build(coursesRes.data || [], () => "course"),
      ...build(dpRes.data || [], () => "digital_product"),
      ...build(lcRes.data || [], (r) => (r.product_type === "consultation" ? "consultation" : "live_course")),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name || "—";

  const productUrl = (p: AdminProduct) => {
    const mentorSlug = tenantSlugs[p.tenant_id];
    if (!mentorSlug || !p.slug) return null;
    const prefix = p.kind === "course" ? "/c/" : p.kind === "digital_product" ? "/p/" : "/l/";
    return getMentorSiteUrl(mentorSlug, `${prefix}${p.slug}`);
  };

  const mentorUrl = (tenantId: string) => {
    const mentorSlug = tenantSlugs[tenantId];
    if (!mentorSlug) return null;
    return getMentorSiteUrl(mentorSlug, "/");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (kindFilter && p.kind !== kindFilter) return false;
      if (mentorFilter && p.tenant_id !== mentorFilter) return false;
      if (statusFilter) {
        if (statusFilter === "published" && !p.is_published) return false;
        if (statusFilter === "draft" && p.is_published) return false;
      }
      if (q) {
        return (
          p.title.toLowerCase().includes(q) ||
          (p.slug || "").toLowerCase().includes(q) ||
          tenantName(p.tenant_id).toLowerCase().includes(q)
        );
      }
      return true;
    });
    const sorted = [...list];
    if (sortBy === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sortBy === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (sortBy === "sales") sorted.sort((a, b) => b.sales - a.sales);
    if (sortBy === "revenue") sorted.sort((a, b) => b.revenue - a.revenue);
    if (sortBy === "price") sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [products, search, kindFilter, mentorFilter, statusFilter, sortBy, tenants]);

  const stats = useMemo(
    () => [
      { label: "إجمالي المنتجات", value: String(filtered.length), icon: Boxes, bg: "bg-primary/10", color: "text-primary" },
      {
        label: "المنتجات المنشورة",
        value: String(filtered.filter((p) => p.is_published).length),
        icon: Package,
        bg: "bg-emerald-500/10",
        color: "text-emerald-600",
      },
      {
        label: "إجمالي المبيعات",
        value: String(filtered.reduce((s, p) => s + p.sales, 0)),
        icon: Video,
        bg: "bg-blue-500/10",
        color: "text-blue-600",
      },
      {
        label: "إجمالي الإيرادات",
        value: `${filtered.reduce((s, p) => s + p.revenue, 0).toLocaleString("ar-EG")} ج.م`,
        icon: FileArchive,
        bg: "bg-amber-500/10",
        color: "text-amber-600",
      },
    ],
    [filtered],
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            إدارة المنتجات
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            الكورسات المسجلة واللايف والمنتجات الرقمية والاستشارات
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((m, i) => (
          <div key={i} className="glass-card rounded-xl p-2.5 text-start">
            <div className="flex items-center justify-between mb-1">
              <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center`}>
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              </div>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
            </div>
            <p className="text-base font-extrabold">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرابط أو المدرب..."
            className="pr-10 bg-background dark:bg-input"
          />
        </div>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border/50 bg-background dark:bg-input text-sm"
        >
          <option value="">كل الأنواع</option>
          <option value="course">كورسات مسجلة</option>
          <option value="live_course">كورسات لايف</option>
          <option value="digital_product">منتجات رقمية</option>
          <option value="consultation">استشارات</option>
        </select>
        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border/50 bg-background dark:bg-input text-sm"
        >
          <option value="">كل المدربين</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border/50 bg-background dark:bg-input text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border/50 bg-background dark:bg-input text-sm"
        >
          <option value="newest">الأحدث</option>
          <option value="oldest">الأقدم</option>
          <option value="sales">الأكثر مبيعاً</option>
          <option value="revenue">الأعلى إيراداً</option>
          <option value="price">الأعلى سعراً</option>
        </select>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border/30 text-start">
          <h3 className="font-bold">قائمة المنتجات ({filtered.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                <th className="text-start py-3 px-4 font-medium">المنتج</th>
                <th className="text-start py-3 px-4 font-medium">النوع</th>
                <th className="text-start py-3 px-4 font-medium">المدرب</th>
                <th className="text-start py-3 px-4 font-medium">السعر</th>
                <th className="text-start py-3 px-4 font-medium">المبيعات</th>
                <th className="text-start py-3 px-4 font-medium">الإيرادات</th>
                <th className="text-start py-3 px-4 font-medium">الحالة</th>
                <th className="text-start py-3 px-4 font-medium">تاريخ الإنشاء</th>
                <th className="text-start py-3 px-4 font-medium">زيارة الصفحة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = KIND_META[p.kind];
                const KindIcon = meta.icon;
                return (
                  <tr key={`${p.kind}-${p.id}`} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {p.thumbnail_url ? (
                            <OptimizedImage src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" sizes="40px" />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </div>
                        <span className="font-semibold line-clamp-1 max-w-64">{p.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${meta.className}`}>
                        <KindIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center gap-2">
                        {mentorUrl(p.tenant_id) ? (
                          <button
                            onClick={() => openExternal(mentorUrl(p.tenant_id)!)}
                            className="text-primary hover:underline text-start"
                          >
                            {tenantName(p.tenant_id)}
                          </button>
                        ) : (
                          <span className="text-start">{tenantName(p.tenant_id)}</span>
                        )}
                        {onOpenMentorDetail && (
                          <button
                            onClick={() => onOpenMentorDetail(p.tenant_id)}
                            title="عرض تفاصيل المدرب"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <CircleUser className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      {p.price > 0 ? `${p.price.toLocaleString("ar-EG")} ج.م` : "مجاني"}
                    </td>
                    <td className="py-3 px-4">{p.sales}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{p.revenue.toLocaleString("ar-EG")} ج.م</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-full border ${
                          p.is_published
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        }`}
                      >
                        {p.is_published ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-3 px-4">
                      {p.is_published && productUrl(p) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg gap-1.5 text-[11px]"
                          onClick={() => window.open(productUrl(p)!, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          زيارة الصفحة
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    لا توجد منتجات مطابقة
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                    جارٍ التحميل...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AdminProductsManager;
