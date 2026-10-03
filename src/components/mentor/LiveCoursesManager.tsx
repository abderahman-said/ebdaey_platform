import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OptimizedImage from "@/components/media/OptimizedImage";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Eye, EyeOff, Video, ExternalLink, User, Share2, Layers, LayoutGrid, Table as TableIcon } from "lucide-react";
import LiveCourseEditor from "./LiveCourseEditor";
import ShareProductDialog from "./ShareProductDialog";
import { openExternal } from "@/lib/openExternal";
import { getMentorSiteUrl } from "@/lib/subdomain";
import ProductPriceDisplay, { type ProductPriceValue } from "./ProductPriceDisplay";

interface Props {
  tenantId: string;
  tenantSlug: string;
  externalEditingId?: string | null;
  onEditingChange?: (id: string | null) => void;
  filterType?: "live_course" | "consultation" | "session_bundle";
}

interface Row {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_free: boolean;
  is_published: boolean;
  thumbnail_url: string | null;
  product_type?: string | null;
  product_prices?: ProductPriceValue[];
}

const LiveCoursesManager = ({ tenantId, tenantSlug, externalEditingId, onEditingChange, filterType }: Props) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ["mentor-live-courses", tenantId, filterType || "all"], [tenantId, filterType]);
  const cachedData = queryClient.getQueryData<Row[]>(cacheKey);

  const [items, setItems] = useState<Row[]>(() => cachedData || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedData);
  const [internalId, setInternalId] = useState<string | null>(null);
  const editingId = externalEditingId !== undefined ? externalEditingId : internalId;
  const setEditingId = (id: string | null) => onEditingChange ? onEditingChange(id) : setInternalId(id);

  const isBundle = filterType === "session_bundle";
  const isConsultation = filterType === "consultation";
  const isBookable = isConsultation || isBundle;

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProductType, setNewProductType] = useState<"live_course" | "consultation" | "session_bundle">(filterType ?? "live_course");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  const viewStorageKey = isBundle ? "session_bundles_view" : isConsultation ? "consultations_view" : "live_courses_view";
  const [viewMode, setViewMode] = useState<"grid" | "table">(
    () => (typeof window !== "undefined" && (localStorage.getItem(viewStorageKey) as "grid" | "table")) || "grid"
  );
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(viewStorageKey, viewMode);
  }, [viewMode, viewStorageKey]);

  const genSlug = () => {
    const letters = "abcdefghijklmnopqrstuvwyz";
    let s = "";
    for (let i = 0; i < 10; i++) s += letters[Math.floor(Math.random() * letters.length)];
    return s;
  };

  const load = async (silent = false) => {
    if (!silent && !queryClient.getQueryData<Row[]>(cacheKey)) {
      setLoading(true);
    }
    let q = supabase
      .from("live_courses" as any)
      .select("id, title, slug, price, is_free, is_published, thumbnail_url, product_type")
      .eq("tenant_id", tenantId);
    if (filterType === "consultation" || filterType === "session_bundle") {
      q = q.eq("product_type", filterType);
    } else if (filterType === "live_course") {
      q = q.or("product_type.eq.live_course,product_type.is.null");
    }
    const { data } = await q
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    const itemRows = ((data as any) || []) as Row[];
    const ids = itemRows.map((item) => item.id);
    const { data: priceRows } = ids.length
      ? await supabase
          .from("product_prices")
          .select("product_id,country_code,currency,price")
          .eq("product_type", "live_course")
          .in("product_id", ids)
          .order("sort_order")
      : { data: [] };
    const pricesByProduct = new Map<string, ProductPriceValue[]>();
    ((priceRows as any[]) || []).forEach((row) => {
      const values = pricesByProduct.get(row.product_id) || [];
      values.push({ country_code: row.country_code, currency: row.currency, price: Number(row.price) || 0 });
      pricesByProduct.set(row.product_id, values);
    });
    const merged = itemRows.map((item) => ({ ...item, product_prices: pricesByProduct.get(item.id) || [] }));
    setItems(merged);
    queryClient.setQueryData(cacheKey, merged);
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      const hasData = Boolean(queryClient.getQueryData<Row[]>(cacheKey));
      load(hasData);
    }
  }, [tenantId, filterType]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({ title: t("liveCoursesManager.toast.enterTitle"), variant: "destructive" });
      return;
    }
    setCreating(true);
    const finalType = filterType ?? newProductType;

    let inserted: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const finalSlug = genSlug();
      const { data, error } = await supabase
        .from("live_courses" as any)
        .insert({
          tenant_id: tenantId, title: newTitle.trim(), slug: finalSlug,
          price: 0, is_published: false, product_type: finalType,
          session_duration_minutes: finalType === "live_course" ? null : 30,
          ...(finalType === "session_bundle" ? { sessions_count: 4 } : {}),
        } as any)
        .select("id")
        .single();
      if (!error && data) {
        inserted = data;
        break;
      }
      lastError = error;
      if (error && !String(error.message || "").toLowerCase().includes("duplicate")) break;
    }

    setCreating(false);
    if (!inserted) {
      toast({ title: t("liveCoursesManager.toast.createError"), description: lastError?.message || "", variant: "destructive" });
      return;
    }
    toast({ title: t("liveCoursesManager.toast.created") });
    setCreateOpen(false);
    setNewTitle(""); setNewProductType(filterType ?? "live_course");
    setEditingId((inserted as any).id);
    load(false);
  };

  const togglePublish = async (id: string, cur: boolean) => {
    const { error } = await supabase.from("live_courses" as any).update({ is_published: !cur } as any).eq("id", id);
    if (error) return toast({ title: t("liveCoursesManager.toast.genericError"), variant: "destructive" });
    toast({ title: !cur ? t("liveCoursesManager.toast.published") : t("liveCoursesManager.toast.hidden") });
    setItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, is_published: !cur } : p));
      queryClient.setQueryData(cacheKey, next);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("live_courses" as any).delete().eq("id", deleteId);
    if (error) toast({ title: t("liveCoursesManager.toast.genericError"), description: error.message, variant: "destructive" });
    else {
      toast({ title: t("liveCoursesManager.toast.deleted") });
      setItems((prev) => {
        const next = prev.filter((p) => p.id !== deleteId);
        queryClient.setQueryData(cacheKey, next);
        return next;
      });
    }
    setDeleteId(null);
  };

  if (editingId) {
    return (
      <LiveCourseEditor
        liveCourseId={editingId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        onBack={() => { setEditingId(null); load(); }}
      />
    );
  }

  const UserChatIcon = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="8" r="4" />
      <path d="M3 21c0-3.866 3.134-7 7-7s7 3.134 7 7" />
      <circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="currentColor" />
    </svg>
  );
  const HeaderIcon = isBundle ? Layers : isConsultation ? UserChatIcon : Video;
  const variant = isBundle ? "bundle" : isConsultation ? "consultation" : "live";
  const heading = t(`liveCoursesManager.${variant}Heading`);
  const subtitle = t(`liveCoursesManager.${variant}Subtitle`);
  const ctaLabel = t(`liveCoursesManager.${variant}Cta`);
  const emptyLabel = t(`liveCoursesManager.${variant}Empty`);
  const emptyCta = t(`liveCoursesManager.${variant}EmptyCta`);
  const dialogTitle = isBundle
    ? t("liveCoursesManager.dialog.titleBundle")
    : isConsultation ? t("liveCoursesManager.dialog.titleConsultation") : t("liveCoursesManager.dialog.titleNew");
  const alignStart = isEn ? "text-start" : "text-end";

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HeaderIcon className="h-6 w-6 text-primary" />
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("liveCoursesManager.cards")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              {t("liveCoursesManager.table")}
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {ctaLabel}
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-4 animate-pulse">
              <div className="aspect-video w-full bg-muted rounded-xl" />
              <div className="h-5 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-card/30 backdrop-blur-sm">
          <HeaderIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">{emptyLabel}</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> {emptyCta}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="group glass-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
              <div className="relative aspect-video shrink-0 bg-muted overflow-hidden cursor-pointer" onClick={() => setEditingId(p.id)}>
                {p.thumbnail_url ? (
                  <OptimizedImage src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                    <HeaderIcon className="w-10 h-10 text-muted-foreground/60" />
                  </div>
                )}
              </div>
              <div className="p-4 min-h-0 flex-1 flex flex-col">
                <div className="cursor-pointer mb-3 min-h-0 flex-1" onClick={() => setEditingId(p.id)}>
                  <h3 className="font-bold text-base mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{p.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      p.is_published
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                    }`}>
                      {p.is_published ? t("liveCoursesManager.published") : t("liveCoursesManager.draft")}
                    </span>
                    <ProductPriceDisplay
                      basePrice={p.is_free ? 0 : p.price}
                      prices={p.is_free ? [] : p.product_prices}
                      freeLabel={t("liveCoursesManager.free")}
                      className="font-semibold text-foreground shrink-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_36px_36px_36px] items-center gap-2 pt-3 border-t border-border/50">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)} className="h-9 min-w-0 gap-1.5">
                    <Edit2 className="h-4 w-4" /> {t("liveCoursesManager.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(p.id, p.is_published)} className="h-9 w-9 p-0" title={p.is_published ? t("liveCoursesManager.hide") ?? "" : t("liveCoursesManager.publish") ?? ""}>
                    {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {p.is_published ? (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0" title={t("liveCoursesManager.view") ?? ""} onClick={() => openExternal(`${getMentorSiteUrl(tenantSlug)}/l/${p.slug}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled className="h-9 w-9 p-0" title={t("liveCoursesManager.view") ?? ""}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title={t("liveCoursesManager.delete.confirm") ?? ""}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className={`${alignStart} p-3 font-medium`}>{isBundle ? t("liveCoursesManager.columns.bundle") : isConsultation ? t("liveCoursesManager.columns.session") : t("liveCoursesManager.columns.course")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("liveCoursesManager.columns.price")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("liveCoursesManager.columns.status")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("liveCoursesManager.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {p.thumbnail_url ? (
                          <OptimizedImage src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" sizes="48px" />
                        ) : (
                          <HeaderIcon className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <ProductPriceDisplay
                      basePrice={p.is_free ? 0 : p.price}
                      prices={p.is_free ? [] : p.product_prices}
                      freeLabel={t("liveCoursesManager.free")}
                    />
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      p.is_published
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                    }`}>
                      {p.is_published ? t("liveCoursesManager.published") : t("liveCoursesManager.draft")}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(p.id)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => togglePublish(p.id, p.is_published)}>
                        {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {isBookable && (
                        <Button size="sm" variant="ghost" onClick={() => setShareSlug(p.slug)} title={t("liveCoursesManager.share")}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {p.is_published && (
                        <Button size="sm" variant="ghost" onClick={() => openExternal(`${getMentorSiteUrl(tenantSlug)}/l/${p.slug}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!filterType && (
              <div className="space-y-2">
                <Label>{t("liveCoursesManager.dialog.productType")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "live_course" as const, label: t("liveCoursesManager.dialog.typeLive"), desc: t("liveCoursesManager.dialog.typeLiveDesc") },
                    { v: "consultation" as const, label: t("liveCoursesManager.dialog.typeConsultation"), desc: t("liveCoursesManager.dialog.typeConsultationDesc") },
                    { v: "session_bundle" as const, label: t("liveCoursesManager.dialog.typeBundle"), desc: t("liveCoursesManager.dialog.typeBundleDesc") },
                  ]).map(o => {
                    const active = newProductType === o.v;
                    return (
                      <button key={o.v} type="button" onClick={() => setNewProductType(o.v)}
                        className={`p-3 rounded-xl border ${alignStart} transition-all ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
                        <p className="font-semibold text-sm">{o.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("liveCoursesManager.dialog.title")}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={isBundle ? t("liveCoursesManager.dialog.placeholderBundle") : isConsultation ? t("liveCoursesManager.dialog.placeholderConsultation") : t("liveCoursesManager.dialog.placeholderLive")} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("liveCoursesManager.dialog.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? t("liveCoursesManager.dialog.creating") : t("liveCoursesManager.dialog.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("liveCoursesManager.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("liveCoursesManager.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("liveCoursesManager.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("liveCoursesManager.delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareProductDialog
        open={!!shareSlug}
        onOpenChange={(o) => !o && setShareSlug(null)}
        url={shareSlug ? `${getMentorSiteUrl(tenantSlug)}/l/${shareSlug}` : ""}
      />
    </div>
  );
};

export default LiveCoursesManager;
