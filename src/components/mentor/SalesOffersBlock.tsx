import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Pencil, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OrderBumpEditor from "./OrderBumpEditor";
import DigitalProductOrderBumpEditor from "./DigitalProductOrderBumpEditor";


type Kind = "course" | "live_course" | "digital_product";

interface Props {
  kind: Kind;
  parentId: string;
  tenantId: string;
}

interface Summary {
  enabled: boolean;
  title: string | null;
  price: number | null;
  discountPrice: number | null;
}

const useBumpSummary = (kind: Kind, parentId: string) => {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let res: any;
    if (kind === "digital_product") {
      res = await supabase
        .from("digital_product_order_bumps")
        .select("is_enabled, title, price, discount_price")
        .eq("digital_product_id", parentId)
        .maybeSingle();
    } else {
      const col = kind === "live_course" ? "live_course_id" : "course_id";
      res = await supabase
        .from("order_bumps")
        .select("is_enabled, title, price, discount_price")
        .eq(col, parentId)
        .maybeSingle();
    }
    const r = res.data as any;
    if (r) {
      setData({
        enabled: !!r.is_enabled,
        title: r.title ?? null,
        price: r.price ?? null,
        discountPrice: r.discount_price ?? null,
      });
    } else {
      setData(null);
    }
    setLoading(false);
  }, [kind, parentId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
};

const SummaryCard = ({
  icon: Icon,
  label,
  hint,
  summary,
  loading,
  onEdit,
}: {
  icon: any;
  label: string;
  hint: string;
  summary: Summary | null;
  loading: boolean;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const currency = t("salesOffers.currency");
  const active = !!summary?.enabled;
  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/60">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground truncate">{label}</h3>
            <p className="text-xs text-muted-foreground truncate">{hint}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
          <Pencil className="w-3.5 h-3.5 ml-1.5" />
          {t("salesOffers.edit")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : !summary ? (
        <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 text-center">
          {t("salesOffers.notConfigured")}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm">
            {active ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">{t("salesOffers.active")}</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">{t("salesOffers.inactive")}</span>
              </>
            )}
          </div>
          {summary.title && (
            <div className="text-sm text-foreground line-clamp-2">{summary.title}</div>
          )}
          {(summary.discountPrice ?? summary.price) != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-primary">{summary.discountPrice ?? summary.price} {currency}</span>
              {summary.discountPrice != null && summary.price != null && summary.discountPrice !== summary.price && (
                <span className="text-xs text-muted-foreground line-through">{summary.price} {currency}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const SalesOffersBlock = ({ kind, parentId, tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const bump = useBumpSummary(kind, parentId);
  const [editing, setEditing] = useState(false);

  const closeAndReload = (open: boolean) => {
    if (!open) {
      bump.reload();
      setEditing(false);
    }
  };

  const renderEditor = () => {
    if (!editing) return null;
    if (kind === "digital_product") {
      return <DigitalProductOrderBumpEditor digitalProductId={parentId} tenantId={tenantId} />;
    }
    const idProp = kind === "live_course" ? { liveCourseId: parentId } : { courseId: parentId };
    return <OrderBumpEditor {...idProp} tenantId={tenantId} />;
  };

  return (
    <>
      <div className="max-w-2xl">
        <SummaryCard
          icon={Package}
          label={t("salesOffers.bumpTitle")}
          hint={t("salesOffers.bumpHint")}
          summary={bump.data}
          loading={bump.loading}
          onEdit={() => setEditing(true)}
        />
      </div>

      <Dialog open={editing} onOpenChange={closeAndReload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("salesOffers.dialogEditBump")}</DialogTitle>
          </DialogHeader>
          {renderEditor()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesOffersBlock;
