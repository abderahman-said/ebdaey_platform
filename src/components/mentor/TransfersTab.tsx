import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Loader2, Wallet, ShoppingBag, FileText, DollarSign } from "lucide-react";
import UsdWithdrawalDialog from "@/components/mentor/UsdWithdrawalDialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildPayoutReference } from "@/lib/payoutReference";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransfersTabProps {
  tenantId: string;
  tenantSlug?: string;
  totalRevenue?: number;
  totalWithdrawn?: number;
  totalGatewayFees?: number;
  availableBalance?: number;
  usdBalance?: number;
  usdRevenue?: number;
  usdWithdrawn?: number;
}

interface Transfer {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  admin_note: string | null;
  currency?: string | null;
}

const STATUS_CLASSES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  settled: "bg-emerald-100 text-emerald-700",
  approved: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

const isUsd = (tx: { currency?: string | null }) => String(tx.currency || "EGP").toUpperCase() !== "EGP";

const PERIOD_KEYS = ["all", "7", "30", "90", "365"] as const;

const TransfersTab = ({
  tenantId,
  tenantSlug,
  totalRevenue = 0,
  totalWithdrawn = 0,
  totalGatewayFees = 0,
  availableBalance = 0,
  usdBalance = 0,
  usdRevenue = 0,
  usdWithdrawn = 0,
}: TransfersTabProps) => {
  const { t, i18n } = useTranslation();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ar-EG";
  const align = "text-start";
  const currency = t("transfersTab.currency");

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: requests }, { data: settlements }] = await Promise.all([
        supabase
          .from("withdrawal_requests")
          .select("id, amount, status, created_at, updated_at, admin_note, currency")
          .eq("tenant_id", tenantId)
          .in("status", ["paid", "approved"])
          .order("updated_at", { ascending: false }),
        supabase
          .from("balance_adjustments")
          .select("id, amount, reason, created_at, currency")
          .eq("tenant_id", tenantId)
          .lt("amount", 0)
          .eq("kind", "settlement")
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      const settlementRows: Transfer[] = ((settlements as any[]) || []).map((s) => ({
        id: s.id,
        amount: Math.abs(Number(s.amount || 0)),
        status: "settled",
        created_at: s.created_at,
        updated_at: s.created_at,
        admin_note: s.reason ?? null,
        currency: s.currency ?? "EGP",
      }));
      const merged = [...((requests as Transfer[]) || []), ...settlementRows].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );
      setTransfers(merged);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [tenantId, reloadKey]);


  const filtered = useMemo(() => {
    if (period === "all") return transfers;
    const days = Number(period);
    const cutoff = Date.now() - days * 86400000;
    return transfers.filter((tx) => new Date(tx.updated_at).getTime() >= cutoff);
  }, [transfers, period]);

  const totalTransferredUsd = useMemo(
    () =>
      transfers
        .filter((tx) => (tx.status === "paid" || tx.status === "settled") && isUsd(tx))
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [transfers],
  );

  const totalTransferred = useMemo(
    () =>
      transfers
        .filter((tx) => (tx.status === "paid" || tx.status === "settled") && !isUsd(tx))
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [transfers],
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Banknote className="h-6 w-6 text-primary" />{t("transfersTab.title")}</h1>
          <span className="text-xs text-muted-foreground">
            ({transfers.length})
            {` • ${totalTransferred.toLocaleString()} ${currency} • $${totalTransferredUsd.toLocaleString("en-US")}`}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setWithdrawOpen(true)}>
            <Banknote className="w-4 h-4" />{locale.startsWith("ar") ? "طلب سحب" : "Withdraw"}
          </Button>
          <UsdWithdrawalDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} tenantId={tenantId} usdBalance={usdBalance} onSubmitted={() => setReloadKey((k) => k + 1)} />
          {(
            <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2" title={locale.startsWith("ar") ? "رسوم السحب ٢٫٥٪ بحد أدنى ١٥ دولار" : "Withdrawal fee 2.5%, minimum $15"}>
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <div className={`leading-tight ${align}`}>
                <p className="text-[10px] text-muted-foreground">Stripe (USD)</p>
                <p className="text-xs font-black text-primary">${usdBalance.toLocaleString("en-US")}</p>
              </div>
            </div>
          )}
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <div className={`leading-tight ${align}`}>
              <p className="text-[10px] text-muted-foreground">
                {t("transfersTab.stats.available")}
              </p>
              <p className="text-xs font-black text-primary">
                {availableBalance.toLocaleString(locale)} {currency}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
            <div className={`leading-tight ${align}`}>
              <p className="text-[10px] text-muted-foreground">
                {t("transfersTab.stats.totalSales")}
              </p>
              <p className="text-xs font-black">
                {totalRevenue.toLocaleString(locale)} {currency}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">
                ${usdRevenue.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <div className={`leading-tight ${align}`}>
              <p className="text-[10px] text-muted-foreground">
                {t("transfersTab.stats.totalWithdrawn")}
              </p>
              <p className="text-xs font-black">
                {totalWithdrawn.toLocaleString(locale)} {currency}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">
                ${usdWithdrawn.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-36 bg-background dark:bg-input text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`transfersTab.periods.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Banknote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t("transfersTab.empty")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t("transfersTab.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className={`${align} p-3 font-semibold w-12`}>#</th>
                  <th className={`${align} p-3 font-semibold`}>{t("transfersTab.table.date")}</th>
                  <th className={`${align} p-3 font-semibold`}>{t("transfersTab.table.amount")}</th>
                  <th className={`${align} p-3 font-semibold`}>{t("transfersTab.table.requestNumber")}</th>
                  <th className={`${align} p-3 font-semibold`}>{t("transfersTab.table.status")}</th>
                  <th className={`${align} p-3 font-semibold`}>{t("transfersTab.table.description")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => {
                  const statusClass = STATUS_CLASSES[tx.status] || "bg-muted text-muted-foreground";
                  const statusLabel = t(`transfersTab.status.${tx.status}`, { defaultValue: tx.status });
                  const dt = new Date(tx.updated_at || tx.created_at);
                  const fallbackNote =
                    tx.status === "paid" || tx.status === "settled"
                      ? t("transfersTab.notes.paid")
                      : tx.status === "approved"
                        ? t("transfersTab.notes.approved")
                        : "—";
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div>
                          {dt.toLocaleDateString(locale, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dt.toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold">
                        {isUsd(tx) ? `$${Number(tx.amount).toLocaleString("en-US")}` : `${Number(tx.amount).toLocaleString()} ${currency}`}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-xs">
                        {buildPayoutReference(tx.id)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs max-w-[280px]">
                        {tx.admin_note || fallbackNote}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default TransfersTab;
