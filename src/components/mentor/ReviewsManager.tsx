import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Star, Trash2, Search, Check, Pencil, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StarRating = ({ rating, size = "w-3.5 h-3.5", interactive = false, onChange, onHover }: { rating: number; size?: string; interactive?: boolean; onChange?: (r: number) => void; onHover?: (r: number | null) => void }) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating ?? rating;
  const updateHover = (r: number | null) => {
    setHoverRating(r);
    onHover?.(r);
  };
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = displayRating >= i;
    const half = !filled && displayRating >= i - 0.5;
    stars.push(
      <div
        key={i}
        className={`relative ${size} ${interactive ? "cursor-pointer" : ""}`}
        onMouseLeave={() => interactive && updateHover(null)}
      >
        <Star className={`${size} text-muted-foreground/30`} />
        <div
          className="absolute top-0 left-0 h-full overflow-hidden text-amber-400"
          style={{ width: filled ? "100%" : half ? "50%" : "0%" }}
        >
          <Star className={`${size} fill-amber-400 text-amber-400`} />
        </div>
        {interactive && (
          <>
            <button
              type="button"
              className="absolute top-0 left-0 w-1/2 h-full z-10"
              onMouseEnter={() => updateHover(i - 0.5)}
              onClick={() => onChange?.(i - 0.5)}
              aria-label={`${i - 0.5} stars`}
            />
            <button
              type="button"
              className="absolute top-0 right-0 w-1/2 h-full z-10"
              onMouseEnter={() => updateHover(i)}
              onClick={() => onChange?.(i)}
              aria-label={`${i} stars`}
            />
          </>
        )}
      </div>
    );
  }
  return <div className="flex items-center gap-0.5" dir="ltr">{stars}</div>;
};

type ProductType = "course" | "live_course" | "consultation" | "session_bundle" | "digital_product";

interface Review {
  id: string;
  tenant_id: string;
  course_id: string | null;
  product_type: ProductType | null;
  product_id: string | null;
  first_name: string;
  last_name: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
  proof_url: string | null;
  proof_type: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface ProductOption {
  id: string;
  title: string;
  type: ProductType;
}

interface ReviewsManagerProps {
  tenantId: string;
  courses: Course[];
}

const ReviewsManager = ({ tenantId, courses }: ReviewsManagerProps) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const locale = isEn ? "en-US" : "ar-EG";
  const queryClient = useQueryClient();
  const reviewsCacheKey = useMemo(() => ["mentor-reviews", tenantId], [tenantId]);
  const productsCacheKey = useMemo(() => ["mentor-reviews-products", tenantId], [tenantId]);
  const profileToggleCacheKey = useMemo(() => ["mentor-reviews-toggle", tenantId], [tenantId]);

  const [reviews, setReviews] = useState<Review[]>(() => queryClient.getQueryData<Review[]>(reviewsCacheKey) || []);
  const [products, setProducts] = useState<ProductOption[]>(() => queryClient.getQueryData<ProductOption[]>(productsCacheKey) || []);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showOnProfile, setShowOnProfile] = useState<boolean>(() => queryClient.getQueryData<boolean>(profileToggleCacheKey) ?? false);
  const [hoverFormRating, setHoverFormRating] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    product_key: "" as string, // format `${type}:${id}`
    assign_course: false,
    rating: 5,
    comment: "",
    proof_url: "" as string,
    proof_type: "image" as string,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
    loadProfileToggle();
    loadProducts();
  }, [tenantId]);

  const loadProducts = async () => {
    const [liveRes, dpRes] = await Promise.all([
      supabase.from("live_courses" as any).select("id, title, product_type").eq("tenant_id", tenantId),
      supabase.from("digital_products" as any).select("id, title").eq("tenant_id", tenantId),
    ]);
    const list: ProductOption[] = [];
    for (const c of courses) list.push({ id: c.id, title: c.title, type: "course" });
    for (const l of ((liveRes.data as any[]) || [])) {
      let type: ProductType = "live_course";
      if (l.product_type === "consultation") type = "consultation";
      else if (l.product_type === "session_bundle") type = "session_bundle";
      list.push({ id: l.id, title: l.title, type });
    }
    for (const d of ((dpRes.data as any[]) || [])) list.push({ id: d.id, title: d.title, type: "digital_product" });
    setProducts(list);
    queryClient.setQueryData(productsCacheKey, list);
  };

  const loadProfileToggle = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("show_reviews_on_profile")
      .eq("id", tenantId)
      .single();
    if (data) {
      const val = (data as any).show_reviews_on_profile ?? false;
      setShowOnProfile(val);
      queryClient.setQueryData(profileToggleCacheKey, val);
    }
  };

  const toggleProfileReviews = async (val: boolean) => {
    setShowOnProfile(val);
    queryClient.setQueryData(profileToggleCacheKey, val);
    await supabase.from("tenants").update({ show_reviews_on_profile: val } as any).eq("id", tenantId);
    toast({ title: val ? t("reviewsManager.toast.shown") : t("reviewsManager.toast.hiddenProfile") });
  };

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data) {
      const list = data as any as Review[];
      setReviews(list);
      queryClient.setQueryData(reviewsCacheKey, list);
    }
  };

  const openNewForm = () => {
    setEditingReview(null);
    setFormData({ first_name: "", last_name: "", product_key: "", assign_course: false, rating: 5, comment: "", proof_url: "", proof_type: "image" });
    setShowForm(true);
  };

  const openEditForm = (review: Review) => {
    setEditingReview(review);
    const type = review.product_type || (review.course_id ? "course" : null);
    const id = review.product_id || review.course_id;
    setFormData({
      first_name: review.first_name,
      last_name: review.last_name,
      product_key: type && id ? `${type}:${id}` : "",
      assign_course: !!(type && id),
      rating: (review as any).rating_v2 ?? review.rating,
      comment: review.comment || "",
      proof_url: review.proof_url || "",
      proof_type: review.proof_type || "image",
    });
    setShowForm(true);
  };

  const saveReview = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let productType: ProductType | null = null;
      let productId: string | null = null;
      if (formData.assign_course && formData.product_key) {
        const [t0, id0] = formData.product_key.split(":");
        productType = t0 as ProductType;
        productId = id0;
      }
      const payload = {
        tenant_id: tenantId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        course_id: productType === "course" ? productId : null,
        product_type: productType,
        product_id: productId,
        rating: Math.round(formData.rating),
        rating_v2: formData.rating,
        comment: formData.comment || null,
        is_published: true,
        proof_url: null,
        proof_type: null,
        verification_status: "approved",
        rejection_reason: null,
      } as any;

      if (editingReview) {
        const { error } = await supabase.functions.invoke("manage-review", { body: { action: "update", id: editingReview.id, payload } });
        if (error) { toast({ title: t("reviewsManager.toast.error"), variant: "destructive" }); return; }
      } else {
        const { error } = await supabase.functions.invoke("manage-review", { body: { action: "insert", payload } });
        if (error) { toast({ title: t("reviewsManager.toast.error"), variant: "destructive" }); return; }
      }

      toast({ title: editingReview ? t("reviewsManager.toast.updated") : t("reviewsManager.toast.added") });
      setShowForm(false);
      loadReviews();
    } finally {
      setSaving(false);
    }
  };


  const deleteReview = async (id: string) => {
    const { error } = await supabase.functions.invoke("manage-review", { body: { action: "delete", id } });
    if (error) { toast({ title: t("reviewsManager.toast.error"), variant: "destructive" }); return; }
    setReviews((prev) => {
      const next = prev.filter((r) => r.id !== id);
      queryClient.setQueryData(reviewsCacheKey, next);
      return next;
    });
    toast({ title: t("reviewsManager.toast.deleted") });
  };

  const togglePublish = async (review: Review) => {
    const newVal = !review.is_published;
    const { error } = await supabase.functions.invoke("manage-review", { body: { action: "toggle_publish", id: review.id, payload: { is_published: newVal } } });
    if (error) { toast({ title: t("reviewsManager.toast.error"), variant: "destructive" }); return; }
    setReviews((prev) => {
      const next = prev.map((r) => (r.id === review.id ? { ...r, is_published: newVal } : r));
      queryClient.setQueryData(reviewsCacheKey, next);
      return next;
    });
    toast({ title: newVal ? t("reviewsManager.toast.published") : t("reviewsManager.toast.hidden") });
  };

  const getProductName = (review: Review) => {
    const type = review.product_type || (review.course_id ? "course" : null);
    const id = review.product_id || review.course_id;
    if (!type || !id) return t("reviewsManager.generalLabel");
    const p = products.find(x => x.type === type && x.id === id);
    if (p) return `${p.title}${t(`reviewsManager.typeSuffix.${type}`, { defaultValue: "" })}`;
    return "—";
  };


  const filteredReviews = reviews.filter(r => {
    const name = `${r.first_name} ${r.last_name}`;
    const matchesSearch = !search || name.includes(search) || (r.comment || "").includes(search);
    const rType = r.product_type || (r.course_id ? "course" : null);
    const rId = r.product_id || r.course_id;
    const rKey = rType && rId ? `${rType}:${rId}` : null;
    const matchesCourse = courseFilter === "all" || (courseFilter === "general" ? !rKey : rKey === courseFilter);
    return matchesSearch && matchesCourse;
  });

  const productsByType = {
    course: products.filter(p => p.type === "course"),
    live_course: products.filter(p => p.type === "live_course"),
    consultation: products.filter(p => p.type === "consultation"),
    session_bundle: products.filter(p => p.type === "session_bundle"),
    digital_product: products.filter(p => p.type === "digital_product"),
  } as const;


  return (
    <div dir={dir}>
      <div className="mb-4 space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />{t("reviewsManager.title")}</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 shadow-card flex-1 sm:flex-none min-w-0">
            <span className="text-xs font-medium truncate" title={t("reviewsManager.showOnProfileHint")}>
              {t("reviewsManager.showOnProfile")}
            </span>
            <Switch checked={showOnProfile} onCheckedChange={toggleProfileReviews} dir="ltr" className="shrink-0" />
          </div>
          <Button onClick={openNewForm} className="gradient-primary text-primary-foreground dark:text-black dark:bg-white border-0 shrink-0">
            <Plus className="w-4 h-4 ml-2" />
            {t("reviewsManager.add")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-card p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input placeholder={t("reviewsManager.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className={isEn ? "pl-9" : "pr-9"} />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("reviewsManager.filterPlaceholder")} />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("reviewsManager.all")}</SelectItem>
              <SelectItem value="general">{t("reviewsManager.general")}</SelectItem>
              {(["course", "live_course", "consultation", "session_bundle", "digital_product"] as const).map(type => (
                productsByType[type].length > 0 ? (
                  <SelectGroup key={type}>
                    <SelectLabel>{t(`reviewsManager.typeGroup.${type}`)}</SelectLabel>
                    {productsByType[type].map(p => (
                      <SelectItem key={`${type}:${p.id}`} value={`${type}:${p.id}`}>{p.title}</SelectItem>
                    ))}
                  </SelectGroup>
                ) : null
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className={`text-start p-4 font-medium text-muted-foreground w-10`}>#</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.name")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.product")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.rating")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground min-w-[220px]`}>{t("reviewsManager.table.comment")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.status")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.date")}</th>
                <th className={`text-start p-4 font-medium text-muted-foreground`}>{t("reviewsManager.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review, idx) => (
                <tr
                  key={review.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="p-4 text-muted-foreground">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(review.first_name?.[0] || "؟").toUpperCase()}
                      </div>
                      <span className="font-medium">{review.first_name} {review.last_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{getProductName(review)}</td>
                  <td className="p-4">
                    <StarRating rating={(review as any).rating_v2 ?? review.rating} />
                  </td>
                  <td className="p-4 max-w-[280px]">
                    {review.comment ? (
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed" title={review.comment}>
                        {review.comment}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">{t("reviewsManager.noComment")}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => togglePublish(review)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:shadow-sm ${
                        review.is_published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50"
                      }`}
                      title={review.is_published ? t("reviewsManager.clickToHide") : t("reviewsManager.clickToPublish")}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {review.is_published ? t("reviewsManager.published") : t("reviewsManager.hidden")}
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => togglePublish(review)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all"
                        title={review.is_published ? t("reviewsManager.hideTip") : t("reviewsManager.publishTip")}
                      >
                        {review.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEditForm(review)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all"
                        title={t("reviewsManager.editTip")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:shadow-sm transition-all"
                        title={t("reviewsManager.deleteTip")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p>{t("reviewsManager.empty")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{editingReview ? t("reviewsManager.dialog.editTitle") : t("reviewsManager.dialog.newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">{t("reviewsManager.dialog.firstName")}</Label>
                <Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder={t("reviewsManager.dialog.firstNamePlaceholder")} />
              </div>
              <div>
                <Label className="mb-1 block">{t("reviewsManager.dialog.lastName")}</Label>
                <Input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder={t("reviewsManager.dialog.lastNamePlaceholder")} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("reviewsManager.dialog.assignProduct")}</Label>
              <Switch dir="ltr" checked={formData.assign_course} onCheckedChange={v => setFormData({ ...formData, assign_course: v })} />
            </div>

            {formData.assign_course && (
              <div>
                <Label className="mb-1 block">{t("reviewsManager.dialog.chooseProduct")}</Label>
                <Select value={formData.product_key} onValueChange={v => setFormData({ ...formData, product_key: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("reviewsManager.dialog.chooseProductPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(["course", "live_course", "consultation", "session_bundle", "digital_product"] as const).map(type => (
                      productsByType[type].length > 0 ? (
                        <SelectGroup key={type}>
                          <SelectLabel>{t(`reviewsManager.typeGroup.${type}`)}</SelectLabel>
                          {productsByType[type].map(p => (
                            <SelectItem key={`${type}:${p.id}`} value={`${type}:${p.id}`}>{p.title}</SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="mb-2 block">{t("reviewsManager.dialog.rating")}</Label>
              <div className="flex items-center gap-2">
                <StarRating
                  rating={formData.rating}
                  size="w-7 h-7"
                  interactive
                  onChange={r => setFormData({ ...formData, rating: r })}
                  onHover={setHoverFormRating}
                />
                <span className="text-sm font-medium text-amber-500 tabular-nums">{(hoverFormRating ?? formData.rating).toFixed(1)}</span>
              </div>
            </div>

            <div>
              <Label className="mb-1 block">{t("reviewsManager.dialog.comment")}</Label>
              <Textarea value={formData.comment} onChange={e => setFormData({ ...formData, comment: e.target.value })} placeholder={t("reviewsManager.dialog.commentPlaceholder")} rows={3} />
            </div>

            <Button onClick={saveReview} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-0">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Check className="w-4 h-4 ml-2" />}
              {editingReview ? t("reviewsManager.dialog.update") : t("reviewsManager.dialog.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsManager;
