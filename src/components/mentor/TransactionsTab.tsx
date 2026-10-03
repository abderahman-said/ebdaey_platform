import { ArrowUpDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  category: string;
  description: string | null;
  currency?: string | null;
}

interface TransactionsTabProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  purchase: "bg-emerald-100 text-emerald-700",
  subscription: "bg-blue-100 text-blue-700",
  commission: "bg-amber-100 text-amber-700",
  gateway_fee: "bg-orange-100 text-orange-700",
  withdrawal: "bg-violet-100 text-violet-700",
  refund: "bg-red-100 text-red-700",
};

const FILTER_KEYS = [
  "all",
  "purchase",
  "subscription",
  "commission",
  "gateway_fee",
  "withdrawal",
  "refund",
] as const;

const TransactionsTab = ({ transactions }: TransactionsTabProps) => {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState("all");
  const locale = i18n.language?.startsWith("en") ? "en-US" : "ar-EG";

  const filtered =
    filter === "all"
      ? transactions
      : transactions.filter((tx) => tx.category === filter);

  const align = "text-start";

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowUpDown className="h-6 w-6 text-primary" />{t("transactionsTab.title")}</h1>
        <div className="flex flex-wrap gap-2">
          {FILTER_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`transactionsTab.filters.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <ArrowUpDown className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t("transactionsTab.empty")}</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={`${align} p-3 font-semibold text-muted-foreground`}>
                    {t("transactionsTab.table.dateTime")}
                  </th>
                  <th className={`${align} p-3 font-semibold text-muted-foreground`}>
                    {t("transactionsTab.table.amount")}
                  </th>
                  <th className={`${align} p-3 font-semibold text-muted-foreground`}>
                    {t("transactionsTab.table.category")}
                  </th>
                  <th className={`${align} p-3 font-semibold text-muted-foreground`}>
                    {t("transactionsTab.table.description")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {new Date(tx.created_at).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div
                        className={`flex items-center gap-1 font-bold ${
                          tx.amount >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {(tx.currency || "EGP").toUpperCase() !== "EGP" ? `$${Math.abs(tx.amount).toLocaleString("en-US")}` : `${Math.abs(tx.amount).toLocaleString()} ${t("transactionsTab.currency")}`}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          CATEGORY_COLORS[tx.category] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t(`transactionsTab.filters.${tx.category}`, { defaultValue: tx.category })}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-sm max-w-[250px] truncate">
                      {tx.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionsTab;
