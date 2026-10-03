import PriceListEditor from "@/components/mentor/PriceListEditor";
import { useState, useEffect, useMemo } from "react";
import { Check, Crown, Eye, EyeOff, Pencil, X, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatMoney, currencySymbol } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


// Fixed plan content — mentors only control the price
const FIXED_DESCRIPTION =
  "اشترك الآن واحصل على وصول كامل لجميع الدورات والمحتوى التعليمي طوال العام مع تحديثات مستمرة ودعم متواصل.";

const FIXED_FEATURES = [
  "وصول كامل لجميع الدورات الحالية والقادمة",
  "تحديثات مستمرة للمحتوى التعليمي طوال العام",
  "شهادات إتمام معتمدة لكل دورة",
  "دعم فني متواصل طوال فترة الاشتراك",
];

const DIGITAL_PRODUCTS_FEATURE = "وصول كامل لجميع المنتجات الرقمية";

const buildFeatures = (includeDigital: boolean) =>
  includeDigital ? [...FIXED_FEATURES, DIGITAL_PRODUCTS_FEATURE] : FIXED_FEATURES;


interface Plan {
  id?: string;
  plan_type: string;
  price: number;
  description: string;
  features: string[];
  is_active: boolean;
  includes_digital_products: boolean;
}

interface Props {
  tenantId: string;
}

const SubscriptionPlansManager = ({ tenantId }: Props) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const localizedFeatures = t("subscriptionPlans.fixed.features", { returnObjects: true }) as string[];
  const localizedDigitalFeature = t("subscriptionPlans.fixed.digitalFeature");
  const localizedDescription = t("subscriptionPlans.fixed.description");
  const buildLocalizedFeatures = (includeDigital: boolean) =>
    includeDigital ? [...localizedFeatures, localizedDigitalFeature] : localizedFeatures;

  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ["mentor-subscription-plans", tenantId], [tenantId]);
  const cachedPlans = queryClient.getQueryData<{ enabled: boolean; yearly: Plan }>(cacheKey);

  const [enabled, setEnabled] = useState(() => cachedPlans?.enabled ?? false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [yearly, setYearly] = useState<Plan>(() => cachedPlans?.yearly ?? {
    plan_type: "yearly",
    price: 0,
    description: FIXED_DESCRIPTION,
    features: FIXED_FEATURES,
    is_active: true,
    includes_digital_products: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState<boolean>(() => !cachedPlans);
  const [editingPrice, setEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState<string>("0");
  const [defaultPrice, setDefaultPrice] = useState<{ id?: string; price: number; currency: string } | null>(null);
  const [priceReload, setPriceReload] = useState(0);
  const shownPrice = defaultPrice?.price ?? Number(yearly.price || 0);
  const shownCurrency = defaultPrice?.currency ?? "EGP";

  useEffect(() => {
    const hasCache = Boolean(queryClient.getQueryData(cacheKey));
    loadData(hasCache);
  }, [tenantId]);

  const loadData = async (silent = false) => {
    if (!silent && !queryClient.getQueryData(cacheKey)) {
      setLoading(true);
    }
    try {
      const [{ data: tenant }, { data: plans }] = await Promise.all([
        supabase.from("tenants").select("subscriptions_enabled").eq("id", tenantId).single(),
        supabase.from("subscription_plans").select("*").eq("tenant_id", tenantId).eq("plan_type", "yearly"),
      ]);
      const isEnabled = tenant?.subscriptions_enabled ?? false;
      setEnabled(isEnabled);
      let nextYearly = yearly;
      if (plans && plans.length > 0) {
        const y: any = plans[0];
        const includesDP = y.includes_digital_products ?? false;
        nextYearly = {
          ...y,
          // Always use the fixed copy regardless of stored values
          description: FIXED_DESCRIPTION,
          features: buildFeatures(includesDP),
          includes_digital_products: includesDP,
        };
        setYearly(nextYearly);
      }
      queryClient.setQueryData(cacheKey, { enabled: isEnabled, yearly: nextYearly });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (val: boolean) => {
    setLoadingToggle(true);
    setEnabled(val);
    try {
      const { error } = await supabase.functions.invoke("toggle-subscriptions", {
        body: { tenant_id: tenantId, subscriptions_enabled: val },
      });
      if (error) throw error;
      toast({ title: val ? t("subscriptionPlans.toast.enabled") : t("subscriptionPlans.toast.disabled") });
    } catch (err: any) {
      setEnabled(!val);
      toast({
        title: t("subscriptionPlans.toast.toggleError"),
        description: err?.message || t("subscriptionPlans.toast.retry"),
        variant: "destructive",
      });
    } finally {
      setLoadingToggle(false);
    }
  };


  const savePlan = async (overrides?: Partial<Plan>) => {
    setSaving(true);
    const next = { ...yearly, ...(overrides || {}) };
    const featuresList = buildFeatures(next.includes_digital_products);
    const payload: any = {
      tenant_id: tenantId,
      plan_type: "yearly",
      price: next.price,
      description: FIXED_DESCRIPTION,
      features: featuresList,
      is_active: next.is_active,
      includes_digital_products: next.includes_digital_products,
    };

    if (yearly.id) {
      await supabase.from("subscription_plans").update(payload).eq("id", yearly.id);
    } else {
      const { data } = await supabase.from("subscription_plans").insert(payload).select().single();
      if (data) setYearly(prev => ({ ...prev, ...next, features: featuresList, id: data.id }));
    }
    setYearly(prev => ({ ...prev, ...next, features: featuresList }));
    toast({ title: t("subscriptionPlans.toast.saved") });
    setSaving(false);
  };


  const startEditPrice = () => {
    setDraftPrice(String(shownPrice ?? 0));
    setEditingPrice(true);
  };

  const confirmPrice = async () => {
    const value = Math.max(0, Number(draftPrice) || 0);
    await savePlan({ price: value });
    const planId = yearly.id;
    if (planId) {
      if (defaultPrice?.id) {
        await supabase.from("product_prices").update({ price: value }).eq("id", defaultPrice.id);
      } else {
        await supabase.from("product_prices").insert({
          tenant_id: tenantId, product_type: "subscription_plan", product_id: planId,
          country_code: null, currency: "EGP", price: value, compare_at_price: null,
        });
      }
      setPriceReload((k) => k + 1);
    }
    setEditingPrice(false);
  };

  const cancelPrice = () => {
    setDraftPrice(String(yearly.price ?? 0));
    setEditingPrice(false);
  };

  if (loading) return <div className="animate-pulse text-muted-foreground p-8">{t("subscriptionPlans.loading")}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Compact Section Header */}
      <div className="relative overflow-hidden rounded-2xl border  dark:border-border/60 dark:bg-card/60 backdrop-blur-xl p-3.5 shadow-sm">
        <div className="absolute -left-12 -top-12 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary border border-primary-foreground/30 flex items-center justify-center shadow-md shadow-primary/30">
              <Crown className="w-5 h-5 text-primary-foreground drop-shadow-sm" strokeWidth={2.75} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground leading-tight">{t("subscriptionPlans.header.title")}</h1>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t("subscriptionPlans.header.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background/60 px-2.5 py-1 rounded-full border border-border/60">
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
            <Label className="text-xs font-medium cursor-pointer hidden sm:block" htmlFor="plans-master-toggle">
              {enabled ? t("subscriptionPlans.header.enabled") : t("subscriptionPlans.header.disabled")}
            </Label>
            <Switch id="plans-master-toggle" dir="ltr" checked={enabled} onCheckedChange={toggleEnabled} disabled={loadingToggle} />
          </div>
        </div>
      </div>

      {/* Unified Editable Preview Card */}
     {enabled ? (
        <div className={`relative overflow-hidden rounded-2xl p-5   group glass-card  border border-border/50 text-primary  transition-opacity ${!enabled ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 dark:bg-primary/25 backdrop-blur-md flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary dark:text-primary-foreground" />
                </div>

                <div>
                  <p className="text-[10px] opacity-80 leading-tight">{t("subscriptionPlans.plan.label")}</p>
                  <h3 className="text-sm font-bold leading-tight">{t("subscriptionPlans.plan.name")}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-2 py-1 rounded-full">
                {yearly.is_active ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-primary" />}
                <Label className="text-[10px] font-medium cursor-pointer text-primary" htmlFor="plan-active">
                  {yearly.is_active ? t("subscriptionPlans.plan.visible") : t("subscriptionPlans.plan.hidden")}
                </Label>
                <Switch
                  id="plan-active"
                  dir="ltr"
                  checked={yearly.is_active}
                  onCheckedChange={v => {
                    setYearly(prev => ({ ...prev, is_active: v }));
                    savePlan({ is_active: v });
                  }}
                  className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
                />
              </div>
            </div>

            {/* Price (display + inline edit) */}
            <div className="mb-5">
              <Label className="text-[10px] uppercase tracking-wider opacity-80 mb-1.5 block rtl:tracking-normal">{t("subscriptionPlans.plan.priceLabel")}</Label>
              {editingPrice ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      value={draftPrice}
                      onChange={e => setDraftPrice(e.target.value)}
                      autoFocus
                      dir="ltr"
                      className="h-12 text-xl font-black tracking-tight pr-3 pl-16 bg-white/15 border-white/25 rounded-xl text-primary placeholder:text-primary/40 focus-visible:ring-white/40 focus-visible:ring-offset-0"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium opacity-80 pointer-events-none">
                      {currencySymbol(shownCurrency)}
                    </span>
                  </div>
                  <Button
                    onClick={() => confirmPrice()}
                    disabled={saving}
                    size="icon"
                    className="h-12 w-12 bg-white text-primary hover:bg-white/90 border-0 rounded-xl shadow-md flex-shrink-0"
                    aria-label={t("subscriptionPlans.plan.savePrice")}
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={cancelPrice}
                    disabled={saving}
                    size="icon"
                    variant="ghost"
                    className="h-12 w-12 bg-white/10 hover:bg-white/20 text-primary border border-white/20 rounded-xl flex-shrink-0"
                    aria-label={t("subscriptionPlans.plan.cancel")}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-black/10 border border-black/15 rounded-xl px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight">
                      {formatMoney(shownPrice, shownCurrency)}
                    </span>
                  </div>
                  <Button
                    onClick={startEditPrice}
                    size="icon"
                    className="h-10 w-10 bg-white text-primary hover:bg-white/90 border-0 rounded-xl shadow-md flex-shrink-0"
                    aria-label={t("subscriptionPlans.plan.editPrice")}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-xs opacity-90 leading-relaxed mb-4">
              {localizedDescription}
            </p>

            {/* Features */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
              {buildLocalizedFeatures(yearly.includes_digital_products).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]">
                  <div className="w-4 h-4 rounded-full bg-white/25 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="opacity-95 leading-snug">{f}</span>
                </li>
              ))}
            </ul>


            {/* Include digital products toggle */}
            <div className="flex items-center justify-between gap-3 bg-black/10 border border-black/15 rounded-xl px-3 py-2.5 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center flex-shrink-0">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight">{t("subscriptionPlans.digital.title")}</p>
                  <p className="text-[10px] opacity-75 leading-tight mt-0.5">{t("subscriptionPlans.digital.subtitle")}</p>
                </div>
              </div>
              <Switch
                dir="ltr"
                checked={yearly.includes_digital_products}
                onCheckedChange={v => {
                  setYearly(prev => ({ ...prev, includes_digital_products: v }));
                  savePlan({ includes_digital_products: v });
                }}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-black/15 dark: data-[state=unchecked]:bg-white/15 flex-shrink-0"
              />
            </div>


            {!yearly.is_active && (
              <div className="flex items-center gap-1.5 text-[11px] bg-white/10 border border-white/20 rounded-lg px-3 py-2">
                <EyeOff className="w-3 h-3" />
                <span>{t("subscriptionPlans.plan.hiddenNotice")}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/40 backdrop-blur-md p-6 flex flex-col items-center text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-foreground">{t("subscriptionPlans.disabledCard.title")}</h4>
            <p className="text-xs text-muted-foreground">
              {t("subscriptionPlans.disabledCard.subtitle")}
            </p>
          </div>
        </div>
      )}
      {yearly.id && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h4 className="text-sm font-bold">{isRtl ? "الأسعار حسب الدولة والعملة" : "Prices by country & currency"}</h4>
          <PriceListEditor tenantId={tenantId} productType="subscription_plan" productId={yearly.id} basePrice={Number(yearly.price) || 0} reloadKey={priceReload}
            onDefaultChange={(r) => {
              setDefaultPrice({ id: r.id, price: Number(r.price) || 0, currency: r.currency });
              if (yearly.id && Number(r.price) !== Number(yearly.price)) {
                setYearly((p) => ({ ...p, price: Number(r.price) || 0 }));
                supabase.from("subscription_plans").update({ price: Number(r.price) || 0 }).eq("id", yearly.id);
              }
            }} />
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansManager;
