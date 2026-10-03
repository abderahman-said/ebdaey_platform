import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BumpPriceRows, { loadBumpPriceRows, saveBumpPriceRows, type BumpPriceRow } from "@/components/mentor/BumpPriceRows";

interface Props {
  digitalProductId: string;
  tenantId: string;
}

type OfferKind = "course" | "live_course" | "digital_product";

interface Option {
  id: string;
  title: string;
  price: number;
  kind: OfferKind;
}

const DigitalProductOrderBumpEditor = ({ digitalProductId, tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [priceRows, setPriceRows] = useState<BumpPriceRow[]>([]);

  useEffect(() => { loadData(); }, [digitalProductId]);

  const loadData = async () => {
    setLoading(true);
    const [bumpRes, coursesRes, liveRes, productsRes] = await Promise.all([
      supabase.from("digital_product_order_bumps").select("*").eq("digital_product_id", digitalProductId).maybeSingle(),
      supabase.from("courses").select("id, title, price").eq("tenant_id", tenantId),
      supabase.from("live_courses").select("id, title, price").eq("tenant_id", tenantId),
      supabase.from("digital_products").select("id, title, price").eq("tenant_id", tenantId).neq("id", digitalProductId),
    ]);

    if (bumpRes.data) {
      const b = bumpRes.data as any;
      setExistingId(b.id);
      setIsEnabled(b.is_enabled);
      setSelectedValue(
        b.bump_course_id ? `course:${b.bump_course_id}` :
        b.bump_live_course_id ? `live_course:${b.bump_live_course_id}` :
        b.bump_digital_product_id ? `digital_product:${b.bump_digital_product_id}` : ""
      );
      setTitle(b.title || "");
      setDescription(b.description || "");
    }

    setOptions([
      ...(((coursesRes.data || []) as any[]).map(c => ({ ...c, kind: "course" as const }))),
      ...(((liveRes.data || []) as any[]).map(c => ({ ...c, kind: "live_course" as const }))),
      ...(((productsRes.data || []) as any[]).map(p => ({ ...p, kind: "digital_product" as const }))),
    ]);
    setPriceRows(await loadBumpPriceRows("digital_product", digitalProductId, "dp", (bumpRes.data as any)?.id ?? null));
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const [kind, id] = selectedValue.includes(":") ? selectedValue.split(":") : ["", ""];
      const data = {
        digital_product_id: digitalProductId,
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
        await supabase.from("digital_product_order_bumps").update(data as any).eq("id", existingId);
        await saveBumpPriceRows("dp", existingId, tenantId, priceRows);
      } else {
        const { data: newRow } = await supabase.from("digital_product_order_bumps").insert(data as any).select("id").single();
        if (newRow) setExistingId((newRow as any).id);
        if (newRow) await saveBumpPriceRows("dp", (newRow as any).id, tenantId, priceRows);
      }
      toast({ title: t("salesOffers.savedBump") });
    } catch (e: any) {
      toast({ title: t("salesOffers.saveError"), description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;


  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/60" dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
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
          <Select value={selectedValue} onValueChange={(v) => {
            setSelectedValue(v);
            const [, id] = v.split(":");
            const c = options.find(o => o.id === id);
            if (c && !title) setTitle(c.title);
          }}>
            <SelectTrigger><SelectValue placeholder={t("salesOffers.bumpProductPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>{o.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("salesOffers.offerTitleLabel")}</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("salesOffers.offerTitlePlaceholder")} />
        </div>

        <div className="space-y-2">
          <Label>{t("salesOffers.shortDescription")}</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        </div>

        <BumpPriceRows rows={priceRows} onChange={setPriceRows} />
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-6 w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
        {t("salesOffers.save")}
      </Button>
    </div>
  );
};

export default DigitalProductOrderBumpEditor;
