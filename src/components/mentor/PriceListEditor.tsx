import { useEffect, useState } from "react";
import { Globe, Pencil, Trash2, Plus, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CURRENCIES, PRICE_COUNTRIES, countryName, currencyName, formatMoney, type PriceRow } from "@/lib/currency";

type ProductType = "course" | "live_course" | "digital_product" | "subscription_plan";

interface Props {
  tenantId: string;
  productType: ProductType;
  productId: string;
  /** Existing base price (EGP) used when no default row has been saved yet. */
  basePrice?: number;
  baseCompareAt?: number | null;
  /** Called with the current default ("All countries") row after every load. */
  onDefaultChange?: (row: PriceRow) => void;
  /** Change to force a reload from outside. */
  reloadKey?: number;
}

const empty: PriceRow = { country_code: null, currency: "EGP", price: 0, compare_at_price: null };

export default function PriceListEditor({ tenantId, productType, productId, basePrice = 0, baseCompareAt = null, onDefaultChange, reloadKey }: Props) {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const L = (ar: string, e: string) => (en ? e : ar);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [editing, setEditing] = useState<PriceRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("product_prices")
      .select("id,country_code,currency,price,compare_at_price")
      .eq("product_type", productType)
      .eq("product_id", productId)
      .order("sort_order");
    const list = (data as PriceRow[]) ?? [];
    setRows(list);
    const d = list.find((r) => r.country_code === null);
    if (d) onDefaultChange?.(d);
  };
  useEffect(() => { if (productId) load(); }, [productId, productType, reloadKey]);

  const defaultRow: PriceRow = rows.find((r) => r.country_code === null) ?? { ...empty, price: basePrice, compare_at_price: baseCompareAt };
  const countryRows = rows.filter((r) => r.country_code !== null);
  const list = [defaultRow, ...countryRows];

  const save = async () => {
    if (!editing) return;
    if (editing.compare_at_price && editing.compare_at_price <= editing.price) {
      toast.error(L("السعر قبل الخصم يجب أن يكون أكبر من سعر الشراء", "Pre-discount price must be higher than the purchase price"));
      return;
    }
    if (editing.country_code === undefined) return;
    setSaving(true);
    const payload = {
      tenant_id: tenantId, product_type: productType, product_id: productId,
      country_code: editing.country_code, currency: editing.currency,
      price: editing.price || 0, compare_at_price: editing.compare_at_price || null,
    };
    const { error } = editing.id
      ? await supabase.from("product_prices").update(payload).eq("id", editing.id)
      : await supabase.from("product_prices").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? L("يوجد سعر لهذه الدولة بالفعل", "A price for this country already exists") : error.message);
      return;
    }
    toast.success(L("تم حفظ السعر", "Price saved"));
    setEditing(null);
    load();
  };

  const remove = async (r: PriceRow) => {
    if (!r.id) return;
    await supabase.from("product_prices").delete().eq("id", r.id);
    load();
  };

  const usedCountries = new Set(countryRows.map((r) => r.country_code));

  return (
    <div className="space-y-4">
      {list.map((r) => (
        <div key={r.id ?? "default"} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            {r.country_code ? <Flag className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
            <span className="text-muted-foreground">{countryName(r.country_code)}</span>
            <span className="font-semibold">{formatMoney(r.price, r.currency)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditing({ ...r })} aria-label="edit">
              <Pencil className="w-4 h-4" />
            </Button>
            {r.country_code && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(r)} aria-label="delete">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {!editing && (
        <Button type="button" variant="outline" className="gap-2" onClick={() => setEditing({ ...empty, country_code: "" as any })}>
          <Plus className="w-4 h-4" /> {L("إضافة سعر لدولة", "Add country price")}
        </Button>
      )}

      {editing && (
        <div className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>{L("سعر الشراء", "Purchase price")}</Label>
              <Input type="number" className="h-12 bg-white" value={editing.price || ""} placeholder="0.00"
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground">{L("السعر الحقيقي الذي سيدفعه العميل", "The actual price the customer pays")}</p>
            </div>
            <div className="space-y-2">
              <Label>{L("سعر الشراء قبل الخصم", "Price before discount")}</Label>
              <Input type="number" className="h-12 bg-white" value={editing.compare_at_price ?? ""} placeholder="0.00"
                onChange={(e) => setEditing({ ...editing, compare_at_price: e.target.value ? Number(e.target.value) : null })} />
              <p className="text-xs text-muted-foreground">{L("هذا السعر يجب أن يكون أكبر من سعر الشراء، قم بإضافة هذا السعر فقط في حالة وجود خصم على المنتج أو الخدمة", "Must be higher than the purchase price. Only add it when the product is discounted.")}</p>
            </div>
            <div className="space-y-2">
              <Label>{L("العملة", "Currency")}</Label>
              <Select value={editing.currency} onValueChange={(v) => setEditing({ ...editing, currency: v })}>
                <SelectTrigger className="h-12 bg-white"><SelectValue placeholder={L("اختر العملة", "Choose currency")} /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{currencyName(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L("الدولة", "Country")}</Label>
              {editing.country_code === null ? (
                <div className="h-12 flex items-center px-3 rounded-md border bg-white text-sm">{countryName(null)}</div>
              ) : (
                <Select value={editing.country_code || undefined} onValueChange={(v) => setEditing({ ...editing, country_code: v })} disabled={!!editing.id}>
                  <SelectTrigger className="h-12 bg-white"><SelectValue placeholder={L("اختر الدولة", "Choose country")} /></SelectTrigger>
                  <SelectContent>
                    {PRICE_COUNTRIES.filter((c) => !usedCountries.has(c.code) || c.code === editing.country_code).map((c) => (
                      <SelectItem key={c.code} value={c.code}>{en ? c.en : c.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                {editing.country_code === null
                  ? L("هذا هو السعر الافتراضي لجميع الدول التي لم تحدد لها سعرًا خاصًا", "This is the default price for every country without its own price")
                  : L("في حالة اختيار دولة ما، سيتم تخصيص السعر لجميع الزوار من هذه الدولة", "When a country is chosen, this price applies to all visitors from that country")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={saving || (editing.country_code === ("" as any))}>{L("حفظ", "Save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{L("إلغاء", "Cancel")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
