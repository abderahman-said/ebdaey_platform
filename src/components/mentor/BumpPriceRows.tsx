import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { countryName, currencyName } from "@/lib/currency";

export type BumpPriceRow = {
  country_code: string | null;
  currency: string;
  enabled: boolean;
  price: number;
  discount_price: number | null;
};

type ParentType = "course" | "live_course" | "digital_product";

/** Price rows of the main product, merged with the add-on's saved per-row prices. */
export async function loadBumpPriceRows(
  parentType: ParentType, parentId: string, kind: "course" | "dp", bumpId: string | null,
): Promise<BumpPriceRow[]> {
  const [{ data: prices }, { data: saved }] = await Promise.all([
    supabase.from("product_prices").select("country_code,currency,sort_order")
      .eq("product_type", parentType).eq("product_id", parentId).order("sort_order"),
    bumpId
      ? supabase.from("order_bump_prices").select("country_code,price,discount_price").eq("bump_kind", kind).eq("bump_id", bumpId)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  let base = ((prices as any[]) || []).map((p) => ({ country_code: p.country_code as string | null, currency: p.currency as string }));
  if (!base.some((r) => r.country_code === null)) base = [{ country_code: null, currency: "EGP" }, ...base];
  base.sort((a, b) => (a.country_code === null ? -1 : b.country_code === null ? 1 : 0));
  return base.map((r) => {
    const s = ((saved as any[]) || []).find((x) => (x.country_code ?? null) === r.country_code);
    return {
      ...r,
      enabled: !!s,
      price: s ? Number(s.price) || 0 : 0,
      discount_price: s?.discount_price != null ? Number(s.discount_price) : null,
    };
  });
}

export async function saveBumpPriceRows(kind: "course" | "dp", bumpId: string, tenantId: string, rows: BumpPriceRow[]) {
  await supabase.from("order_bump_prices").delete().eq("bump_kind", kind).eq("bump_id", bumpId);
  const payload = rows.filter((r) => r.enabled).map((r) => ({
    tenant_id: tenantId, bump_kind: kind, bump_id: bumpId, country_code: r.country_code,
    currency: r.currency, price: r.price || 0, discount_price: r.discount_price,
  }));
  if (payload.length) {
    const { error } = await supabase.from("order_bump_prices").insert(payload);
    if (error) throw error;
  }
}

export default function BumpPriceRows({ rows, onChange }: { rows: BumpPriceRow[]; onChange: (r: BumpPriceRow[]) => void }) {
  const { i18n } = useTranslation();
  const L = (ar: string, en: string) => (i18n.language === "en" ? en : ar);
  const set = (i: number, patch: Partial<BumpPriceRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{L("سعر الإضافة لكل سعر من أسعار المنتج", "Add-on price for each of the product's prices")}</p>
      <p className="text-xs text-muted-foreground">
        {L("اختر الأسعار التي يظهر فيها العرض، وحدد سعر الإضافة بنفس العملة.", "Tick where the offer appears and set the add-on price in that currency.")}
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.country_code ?? "all"} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3">
            <label className="flex items-center gap-2 min-w-[180px] cursor-pointer">
              <Checkbox checked={r.enabled} onCheckedChange={(v) => set(i, { enabled: !!v })} />
              <span className="text-sm font-medium">{countryName(r.country_code)}</span>
              <span className="text-xs text-muted-foreground">({currencyName(r.currency)})</span>
            </label>
            <div className={`flex flex-1 gap-2 ${r.enabled ? "" : "opacity-40 pointer-events-none"}`}>
              <Input type="number" min={0} dir="ltr" className="bg-background" value={r.price}
                onChange={(e) => set(i, { price: Number(e.target.value) })}
                placeholder={L("السعر الأصلي", "Original price")} aria-label={L("السعر الأصلي", "Original price")} />
              <Input type="number" min={0} dir="ltr" className="bg-background" value={r.discount_price ?? ""}
                onChange={(e) => set(i, { discount_price: e.target.value ? Number(e.target.value) : null })}
                placeholder={L("سعر العرض (اختياري)", "Offer price (optional)")} aria-label={L("سعر العرض", "Offer price")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
