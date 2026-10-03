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
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Package, FileArchive, ExternalLink, LayoutGrid, Table as TableIcon,
} from "lucide-react";
import DigitalProductEditor from "./DigitalProductEditor";
import { ProductsListSkeleton } from "./EditorSkeleton";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { openExternal } from "@/lib/openExternal";
import ProductPriceDisplay, { type ProductPriceValue } from "./ProductPriceDisplay";

interface DigitalProductsManagerProps {
  tenantId: string;
  tenantSlug: string;
  externalEditingId?: string | null;
  onEditingChange?: (id: string | null) => void;
}

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
  product_prices?: ProductPriceValue[];
}

const DigitalProductsManager = ({
  tenantId,
  tenantSlug,
  externalEditingId,
  onEditingChange,
}: DigitalProductsManagerProps) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const alignStart = isEn ? "text-start" : "text-end";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ["mentor-digital-products", tenantId], [tenantId]);
  const cachedProducts = queryClient.getQueryData<ProductRow[]>(cacheKey);

  const [products, setProducts] = useState<ProductRow[]>(() => cachedProducts || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedProducts);
  const [internalEditingId, setInternalEditingId] = useState<string | null>(null);
  const editingId = externalEditingId !== undefined ? externalEditingId : internalEditingId;
  const setEditingId = (id: string | null) => {
    if (onEditingChange) onEditingChange(id);
    else setInternalEditingId(id);
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "table">(
    () => (typeof window !== "undefined" && (localStorage.getItem("digital_products_view") as "grid" | "table")) || "grid"
  );
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("digital_products_view", viewMode);
  }, [viewMode]);

  const loadProducts = async (silent = false) => {
    if (!silent && !queryClient.getQueryData<ProductRow[]>(cacheKey)) {
      setLoading(true);
    }
    const { data, error } = await supabase
      .from("digital_products")
      .select("id, title, slug, price, is_published, thumbnail_url, created_at")
      .eq("tenant_id", tenantId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("digitalProductsManager.toast.genericError"), description: t("digitalProductsManager.toast.loadError"), variant: "destructive" });
    } else {
      const productRows = (data || []) as ProductRow[];
      const ids = productRows.map((product) => product.id);
      const { data: priceRows } = ids.length
        ? await supabase
            .from("product_prices")
            .select("product_id,country_code,currency,price")
            .eq("product_type", "digital_product")
            .in("product_id", ids)
            .order("sort_order")
        : { data: [] };
      const pricesByProduct = new Map<string, ProductPriceValue[]>();
      ((priceRows as any[]) || []).forEach((row) => {
        const values = pricesByProduct.get(row.product_id) || [];
        values.push({ country_code: row.country_code, currency: row.currency, price: Number(row.price) || 0 });
        pricesByProduct.set(row.product_id, values);
      });
      const merged = productRows.map((product) => ({ ...product, product_prices: pricesByProduct.get(product.id) || [] }));
      setProducts(merged);
      queryClient.setQueryData(cacheKey, merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      const hasCache = Boolean(queryClient.getQueryData<ProductRow[]>(cacheKey));
      loadProducts(hasCache);
    }
  }, [tenantId]);

  const generateSlug = () => {
    const letters = "abcdefghijklmnopqrstuvwyz";
    let s = "";
    for (let i = 0; i < 10; i++) s += letters[Math.floor(Math.random() * letters.length)];
    return s;
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({ title: t("digitalProductsManager.toast.enterTitle"), variant: "destructive" });
      return;
    }
    setCreating(true);

    let inserted: { id: string } | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const finalSlug = generateSlug();
      const { data, error } = await supabase
        .from("digital_products")
        .insert({
          tenant_id: tenantId,
          title: newTitle.trim(),
          slug: finalSlug,
          price: 0,
          is_published: false,
        })
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
      toast({ title: t("digitalProductsManager.toast.genericError"), description: lastError?.message || t("digitalProductsManager.toast.createError"), variant: "destructive" });
      return;
    }
    toast({ title: t("digitalProductsManager.toast.created") });
    setCreateOpen(false);
    setNewTitle("");
    setEditingId(inserted.id);
    loadProducts(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.rpc("toggle_digital_product_publish", {
      _id: id,
      _is_published: !current,
    });
    if (error) {
      toast({ title: t("digitalProductsManager.toast.genericError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: !current ? t("digitalProductsManager.toast.published") : t("digitalProductsManager.toast.hidden") });
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p));
      queryClient.setQueryData(cacheKey, next);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("digital_products").delete().eq("id", deleteId);
    if (error) {
      toast({ title: t("digitalProductsManager.toast.genericError"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("digitalProductsManager.toast.deleted") });
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== deleteId);
        queryClient.setQueryData(cacheKey, next);
        return next;
      });
    }
    setDeleteId(null);
  };

  if (editingId) {
    return (
      <DigitalProductEditor
        productId={editingId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        onBack={() => { setEditingId(null); loadProducts(); }}
      />
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileArchive className="h-6 w-6 text-primary" />
            {t("digitalProductsManager.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("digitalProductsManager.subtitle")}</p>
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
              {t("digitalProductsManager.cards")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              {t("digitalProductsManager.table")}
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("digitalProductsManager.cta")}
          </Button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <ProductsListSkeleton />
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-card/30 backdrop-blur-sm">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">{t("digitalProductsManager.empty")}</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("digitalProductsManager.emptyCta")}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((p) => (
            <div key={p.id} className="group glass-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
              <div className="relative aspect-video shrink-0 bg-muted overflow-hidden cursor-pointer" onClick={() => setEditingId(p.id)}>
                {p.thumbnail_url ? (
                  <OptimizedImage src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                    <Package className="w-10 h-10 text-muted-foreground/60" />
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
                      {p.is_published ? t("digitalProductsManager.published") : t("digitalProductsManager.draft")}
                    </span>
                    <ProductPriceDisplay basePrice={p.price} prices={p.product_prices} freeLabel={t("digitalProductsManager.free")} className="font-semibold text-foreground shrink-0" />
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_36px_36px_36px] items-center gap-2 pt-3 border-t border-border/50">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)} className="h-9 min-w-0 gap-1.5">
                    <Edit2 className="h-4 w-4" /> {t("digitalProductsManager.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(p.id, p.is_published)} className="h-9 w-9 p-0" title={p.is_published ? t("digitalProductsManager.hide") : t("digitalProductsManager.publish")}>
                    {p.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {p.is_published ? (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0" title={t("digitalProductsManager.view")} onClick={() => openExternal(`${getMentorSiteUrl(tenantSlug)}/p/${p.slug}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled className="h-9 w-9 p-0" title={t("digitalProductsManager.view")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)} className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" title={t("digitalProductsManager.delete.confirm") ?? ""}>
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
                <th className={`${alignStart} p-3 font-medium`}>{t("digitalProductsManager.columns.product")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("digitalProductsManager.columns.price")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("digitalProductsManager.columns.status")}</th>
                <th className={`${alignStart} p-3 font-medium`}>{t("digitalProductsManager.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {p.thumbnail_url ? (
                          <OptimizedImage src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" sizes="48px" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="font-medium">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <ProductPriceDisplay basePrice={p.price} prices={p.product_prices} freeLabel={t("digitalProductsManager.free")} />
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      p.is_published
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                    }`}>
                      {p.is_published ? t("digitalProductsManager.published") : t("digitalProductsManager.draft")}
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
                      {p.is_published && (
                        <Button size="sm" variant="ghost" onClick={() => openExternal(`${getMentorSiteUrl(tenantSlug)}/p/${p.slug}`)}>
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
          <DialogHeader>
            <DialogTitle>{t("digitalProductsManager.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("digitalProductsManager.dialog.label")}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("digitalProductsManager.dialog.placeholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("digitalProductsManager.dialog.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? t("digitalProductsManager.dialog.creating") : t("digitalProductsManager.dialog.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("digitalProductsManager.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("digitalProductsManager.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("digitalProductsManager.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("digitalProductsManager.delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DigitalProductsManager;
