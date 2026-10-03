import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Plus, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BumpPriceRows, { loadBumpPriceRows, saveBumpPriceRows, type BumpPriceRow } from "@/components/mentor/BumpPriceRows";

interface OrderBumpEditorProps {
  courseId?: string;
  liveCourseId?: string;
  tenantId: string;
}

interface CourseOption {
  id: string;
  title: string;
  price: number;
  kind: "course" | "live_course" | "digital_product";
}


const OrderBumpEditor = ({ courseId, liveCourseId, tenantId }: OrderBumpEditorProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { toast } = useToast();
  const parentColumn = liveCourseId ? "live_course_id" : "course_id";
  const parentId = liveCourseId || courseId || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [bumpCourseId, setBumpCourseId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [priceRows, setPriceRows] = useState<BumpPriceRow[]>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [parentId]);

  const loadData = async () => {
    setLoading(true);
    const [bumpRes, coursesRes, liveRes, dpRes] = await Promise.all([
      supabase.from("order_bumps").select("*").eq(parentColumn, parentId).maybeSingle(),
      supabase.from("courses").select("id, title, price").eq("tenant_id", tenantId).neq("id", courseId || "00000000-0000-0000-0000-000000000000"),
      supabase.from("live_courses").select("id, title, price").eq("tenant_id", tenantId).neq("id", liveCourseId || "00000000-0000-0000-0000-000000000000"),
      supabase.from("digital_products").select("id, title, price").eq("tenant_id", tenantId),
    ]);

    if (bumpRes.data) {
      const b = bumpRes.data as any;
      setExistingId(b.id);
      setIsEnabled(b.is_enabled);
      setBumpCourseId(
        b.bump_course_id ? `course:${b.bump_course_id}` :
        b.bump_live_course_id ? `live_course:${b.bump_live_course_id}` :
        b.bump_digital_product_id ? `digital_product:${b.bump_digital_product_id}` : ""
      );
      setTitle(b.title || "");
      setDescription(b.description || "");
    }

    const options: CourseOption[] = [
      ...((coursesRes.data || []) as any[]).map(c => ({ ...c, kind: "course" as const })),
      ...((liveRes.data || []) as any[]).map(c => ({ ...c, kind: "live_course" as const })),
      ...((dpRes.data || []) as any[]).map(c => ({ ...c, kind: "digital_product" as const })),
    ];
    setCourses(options);
    setPriceRows(await loadBumpPriceRows(liveCourseId ? "live_course" : "course", parentId, "course", (bumpRes.data as any)?.id ?? null));
    setLoading(false);
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      const [kind, id] = bumpCourseId.includes(":") ? bumpCourseId.split(":") : ["", ""];
      const data: any = {
        course_id: liveCourseId ? null : courseId,
        live_course_id: liveCourseId || null,
        tenant_id: tenantId,
        is_enabled: isEnabled,
        bump_course_id: kind === "course" ? id : null,
        bump_live_course_id: kind === "live_course" ? id : null,
        bump_digital_product_id: kind === "digital_product" ? id : null,
        title,
        description: description || null,
        price: priceRows.find((r) => r.country_code === null && r.enabled)?.price ?? priceRows.find((r) => r.enabled)?.price ?? 0,
        discount_price: priceRows.find((r) => r.country_code === null && r.enabled)?.discount_price ?? null,
      };

      if (existingId) {
        await supabase.from("order_bumps").update(data).eq("id", existingId);
        await saveBumpPriceRows("course", existingId, tenantId, priceRows);
      } else {
        const { data: newBump } = await supabase.from("order_bumps").insert(data).select("id").single();
        if (newBump) setExistingId((newBump as any).id);
        if (newBump) await saveBumpPriceRows("course", (newBump as any).id, tenantId, priceRows);
      }

      toast({ title: t("salesOffers.savedBump") });
    } catch {
      toast({ title: t("salesOffers.saveError"), variant: "destructive" });
    }
    setSaving(false);
  };


  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;


  return (
    <div className="space-y-6" dir={dir}>
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center gap-0.5 text-primary">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <DollarSign className="w-4 h-4" strokeWidth={2.5} />
          </div>
            <div>
              <h3 className="font-bold text-foreground">{t("salesOffers.bumpTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("salesOffers.bumpSubtitle")}</p>
            </div>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} dir="ltr" />
        </div>

        <div className={`space-y-5 transition-opacity ${isEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="space-y-2">
            <Label>{t("salesOffers.bumpProduct")}</Label>
            <Select value={bumpCourseId} onValueChange={(v) => {
              setBumpCourseId(v);
              const [, id] = v.split(":");
              const c = courses.find(c => c.id === id);
              if (c && !title) setTitle(c.title);
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t("salesOffers.bumpProductPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {courses.map(c => (
                  <SelectItem key={`${c.kind}:${c.id}`} value={`${c.kind}:${c.id}`}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("salesOffers.offerTitleLabel")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("salesOffers.bumpTitlePlaceholder")} />
          </div>

          <div className="space-y-2">
            <Label>{t("salesOffers.shortDescription")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("salesOffers.shortDescriptionPlaceholder")} rows={2} />
          </div>

          <BumpPriceRows rows={priceRows} onChange={setPriceRows} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-6 w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
          {t("salesOffers.save")}
        </Button>
      </div>
    </div>
  );
};

export default OrderBumpEditor;
