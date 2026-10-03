import React from "react";
import { useTranslation } from "react-i18next";
import {
  Eye,
  ShoppingCart,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  Monitor,
  Tablet,
  Tv2,
  Globe2,
  Link2,
  Package,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import AdvancedDateRangePicker, { type AdvancedRangeValue } from "@/components/mentor/AdvancedDateRangePicker";
import { formatMoney } from "@/lib/currency";
import { revenueEgp, revenueUsd } from "../helpers";
import type { OrderData, PageViewData } from "../types";

interface OverviewTabProps {
  orders: OrderData[];
  pageViews: PageViewData[];
  availableBalance: number;
  usdBalance: number;
  profileName: string;
  setActiveTab: (tab: string) => void;
  overviewDateRange: AdvancedRangeValue;
  setOverviewDateRange: (range: AdvancedRangeValue) => void;
}

export default function OverviewTab({
  orders,
  pageViews,
  availableBalance,
  usdBalance,
  profileName,
  setActiveTab,
  overviewDateRange,
  setOverviewDateRange,
}: OverviewTabProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const rangeStart = new Date(overviewDateRange.from);
  const rangeEnd = new Date(overviewDateRange.to);
  const rangeDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1);
  const prevEnd = new Date(rangeStart.getTime() - 1);
  const prevStart = overviewDateRange.compare
    ? new Date(overviewDateRange.compare.from)
    : new Date(rangeStart.getTime() - rangeDays * 86400000);

  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= rangeStart && d <= rangeEnd;
  });
  const prevOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= prevStart && d <= prevEnd;
  });
  const paidFiltered = filteredOrders.filter((o) => o.payment_status === "paid");
  const prevPaid = prevOrders.filter((o) => o.payment_status === "paid");
  const totalRevenueFiltered = paidFiltered.reduce((a, o) => a + revenueEgp(o), 0);
  const prevRevenue = prevPaid.reduce((a, o) => a + revenueEgp(o), 0);
  const totalRevenueUsd = paidFiltered.reduce((a, o) => a + revenueUsd(o), 0);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const Delta = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const positive = value >= 0;
    return (
      <span
        className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${
          positive ? "text-success" : "text-destructive"
        }`}
      >
        {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {positive ? "+" : ""}
        {value.toFixed(0)}%
        <span className="text-muted-foreground font-normal mr-1">{t("overview.comparedToPrev")}</span>
      </span>
    );
  };

  // Chart data
  const chartPoints = rangeDays <= 14 ? rangeDays : rangeDays <= 30 ? rangeDays : Math.min(rangeDays, 30);
  const interval = Math.max(1, Math.floor(rangeDays / chartPoints));
  const revenueChartData = Array.from({ length: Math.min(chartPoints, rangeDays) }, (_, i) => {
    const endDate = new Date(rangeEnd);
    endDate.setDate(endDate.getDate() - (Math.min(chartPoints, rangeDays) - 1 - i) * interval);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - interval + 1);
    const dayLabel = endDate.toLocaleDateString(
      "ar-EG",
      rangeDays <= 14 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" },
    );
    const inRange = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= startDate && d <= endDate && o.payment_status === "paid";
    });
    const revenue = inRange.reduce((s, o) => s + revenueEgp(o), 0);
    const revenueUsdPt = Math.round(inRange.reduce((s, o) => s + revenueUsd(o), 0) * 100) / 100;
    return { label: dayLabel, revenue, revenueUsd: revenueUsdPt };
  });

  // Order status breakdown
  const statusMap = {
    paid: 0,
    pending: 0,
    cancelled: 0,
    refunded: 0,
  };
  filteredOrders.forEach((o) => {
    const s = (o.payment_status || "").toLowerCase();
    if (s === "paid") statusMap.paid++;
    else if (s === "refunded") statusMap.refunded++;
    else if (s === "cancelled" || s === "failed") statusMap.cancelled++;
    else statusMap.pending++;
  });
  const statusData = [
    {
      name: t("overview.status.completed"),
      value: statusMap.paid,
      color: "hsl(var(--primary))",
    },
    {
      name: t("overview.status.pending"),
      value: statusMap.pending,
      color: "hsl(217 91% 60%)",
    },
    {
      name: t("overview.status.cancelled"),
      value: statusMap.cancelled,
      color: "hsl(var(--muted-foreground))",
    },
    {
      name: t("overview.status.refunded"),
      value: statusMap.refunded,
      color: "hsl(0 84% 60%)",
    },
  ];

  // Top items
  const courseRevenueMap: Record<string, { title: string; revenue: number; count: number }> = {};
  paidFiltered.forEach((o) => {
    const title = o.courses?.title || t("mentorDashboard.unknown");
    const key = o.is_digital_product
      ? `dp_${o.digital_product_id}`
      : o.course_id || "unknown";
    if (!courseRevenueMap[key]) courseRevenueMap[key] = { title, revenue: 0, count: 0 };
    courseRevenueMap[key].revenue += revenueEgp(o);
    courseRevenueMap[key].count += 1;
  });
  const topCourses = Object.values(courseRevenueMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const topMax = topCourses[0]?.count || 1;

  const latestOrders = [...filteredOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const statusBadge = (s: string) => {
    const v = (s || "").toLowerCase();
    if (v === "paid")
      return {
        label: t("overview.status.completed"),
        cls: "bg-success/10 text-success border border-success/20",
      };
    if (v === "refunded")
      return {
        label: t("overview.status.refunded"),
        cls: "bg-destructive/10 text-destructive border border-destructive/20",
      };
    if (v === "cancelled" || v === "failed")
      return {
        label: t("overview.status.cancelled"),
        cls: "bg-muted text-muted-foreground border border-border",
      };
    return {
      label: t("overview.status.pending"),
      cls: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
    };
  };

  // Page views analytics
  const filteredViews = pageViews.filter((v) => {
    const d = new Date(v.created_at);
    return d >= rangeStart && d <= rangeEnd;
  });
  const prevViews = pageViews.filter((v) => {
    const d = new Date(v.created_at);
    return d >= prevStart && d <= prevEnd;
  });

  // Visits + Orders combined timeseries
  const visitsChartData = Array.from({ length: Math.min(chartPoints, rangeDays) }, (_, i) => {
    const endDate = new Date(rangeEnd);
    endDate.setDate(endDate.getDate() - (Math.min(chartPoints, rangeDays) - 1 - i) * interval);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - interval + 1);
    const dayLabel = endDate.toLocaleDateString(
      "ar-EG",
      rangeDays <= 14 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" },
    );
    const visits = pageViews.filter((v) => {
      const d = new Date(v.created_at);
      return d >= startDate && d <= endDate;
    }).length;
    const ordersCount = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= startDate && d <= endDate;
    }).length;
    return { label: dayLabel, visits, orders: ordersCount };
  });

  // Aggregations
  const countBy = <T,>(arr: T[], key: (x: T) => string | null | undefined) => {
    const m: Record<string, number> = {};
    arr.forEach((x) => {
      const k = (key(x) || "other").toString();
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  };

  const deviceCounts = countBy(filteredViews, (v) => v.device);
  const osCounts = countBy(filteredViews, (v) => v.os);
  const sourceCounts = countBy(filteredViews, (v) => v.source);
  const countryCounts = countBy(filteredViews, (v) => v.country);

  const totalDeviceViews = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
  const totalOsViews = Object.values(osCounts).reduce((a, b) => a + b, 0) || 1;

  const DEVICE_LABELS: Record<string, string> = {
    mobile: t("mentorDashboard.devices.mobile"),
    desktop: t("mentorDashboard.devices.desktop"),
    tablet: t("mentorDashboard.devices.tablet"),
    smarttv: t("mentorDashboard.devices.smarttv"),
    other: t("mentorDashboard.devices.other"),
  };
  const DEVICE_COLORS: Record<string, string> = {
    mobile: "hsl(160 70% 55%)",
    desktop: "hsl(28 90% 65%)",
    tablet: "hsl(340 80% 70%)",
    smarttv: "hsl(260 70% 65%)",
    other: "hsl(var(--muted-foreground))",
  };
  const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    mobile: Smartphone,
    desktop: Monitor,
    tablet: Tablet,
    smarttv: Tv2,
    other: Globe2,
  };
  const OS_COLORS: Record<string, string> = {
    Android: "hsl(140 60% 55%)",
    iOS: "hsl(217 91% 65%)",
    Windows: "hsl(195 80% 55%)",
    macOS: "hsl(260 70% 65%)",
    Linux: "hsl(40 90% 60%)",
    Other: "hsl(var(--muted-foreground))",
  };

  const deviceData = Object.entries(deviceCounts)
    .map(([k, v]) => ({
      key: k,
      name: DEVICE_LABELS[k] || k,
      value: v,
      color: DEVICE_COLORS[k] || "hsl(var(--muted-foreground))",
    }))
    .sort((a, b) => b.value - a.value);

  const osData = Object.entries(osCounts)
    .map(([k, v]) => ({
      key: k,
      name: k,
      value: v,
      color: OS_COLORS[k] || "hsl(var(--muted-foreground))",
    }))
    .sort((a, b) => b.value - a.value);

  const topSources = Object.entries(sourceCounts)
    .map(([k, v]) => ({
      name: k === "direct" ? t("overview.direct") : k,
      value: v,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const COUNTRY_NAMES: Record<string, string> = {
    EG: t("mentorDashboard.countries.EG"),
    SA: t("mentorDashboard.countries.SA"),
    AE: t("mentorDashboard.countries.AE"),
    US: t("mentorDashboard.countries.US"),
    GB: t("mentorDashboard.countries.GB"),
    DE: t("mentorDashboard.countries.DE"),
    FR: t("mentorDashboard.countries.FR"),
    NL: t("mentorDashboard.countries.NL"),
    FI: t("mentorDashboard.countries.FI"),
    BE: t("mentorDashboard.countries.BE"),
    QA: t("mentorDashboard.countries.QA"),
    KW: t("mentorDashboard.countries.KW"),
    JO: t("mentorDashboard.countries.JO"),
    MA: t("mentorDashboard.countries.MA"),
    DZ: t("mentorDashboard.countries.DZ"),
    TN: t("mentorDashboard.countries.TN"),
    IQ: t("mentorDashboard.countries.IQ"),
    SY: t("mentorDashboard.countries.SY"),
    LB: t("mentorDashboard.countries.LB"),
    PS: t("mentorDashboard.countries.PS"),
    YE: t("mentorDashboard.countries.YE"),
    OM: t("mentorDashboard.countries.OM"),
    SD: t("mentorDashboard.countries.SD"),
    LY: t("mentorDashboard.countries.LY"),
    TR: t("mentorDashboard.countries.TR"),
    CA: t("mentorDashboard.countries.CA"),
    AU: t("mentorDashboard.countries.AU"),
    IN: t("mentorDashboard.countries.IN"),
  };
  const topCountries = Object.entries(countryCounts)
    .filter(([k]) => k !== "other")
    .map(([k, v]) => ({
      code: k,
      name: COUNTRY_NAMES[k] || k,
      value: v,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const statCards: {
    icon: typeof Eye;
    label: string;
    value: string;
    secondary?: string;
    delta: number | null;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      icon: Eye,
      label: t("overview.kpis.visits"),
      value: filteredViews.length.toLocaleString(),
      delta: pctChange(filteredViews.length, prevViews.length),
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      icon: ShoppingCart,
      label: t("overview.kpis.orders"),
      value: paidFiltered.length.toLocaleString(),
      delta: pctChange(paidFiltered.length, prevPaid.length),
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      icon: DollarSign,
      label: t("overview.kpis.revenue"),
      value: `${totalRevenueFiltered.toLocaleString()} ${isEn ? "EGP" : "ج.م"}`,
      secondary: `$${totalRevenueUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD`,
      delta: pctChange(totalRevenueFiltered, prevRevenue),
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      icon: Wallet,
      label: t("overview.kpis.balance"),
      value: `${availableBalance.toLocaleString()} ${isEn ? "EGP" : "ج.م"}`,
      secondary: `$${usdBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD`,
      delta: null,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="text-end">
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            {t("overview.greeting", { name: profileName || t("overview.defaultMentor") })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("overview.subtitle")}</p>
        </div>
        <AdvancedDateRangePicker value={overviewDateRange} onChange={setOverviewDateRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="glass-card rounded-2xl p-3 text-end relative overflow-hidden group hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold leading-tight truncate">{s.value}</p>
            {s.secondary ? (
              <>
                <div className="my-1.5 border-t border-dashed border-border/60" />
                <p className="text-sm font-bold text-muted-foreground leading-tight truncate" dir="ltr">
                  {s.secondary}
                </p>
              </>
            ) : null}
            <div className="mt-1 min-h-[14px]">
              {s.delta !== null && s.delta !== undefined ? (
                <Delta value={s.delta} />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Visits + Orders combined chart */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-end">{t("overview.sections.visitsOrders")}</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t("overview.chart.visits")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />{" "}
              {t("overview.chart.orders")}
            </span>
          </div>
        </div>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={visitsChartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                name={t("overview.chart.visits")}
                stroke="hsl(217 91% 60%)"
                strokeWidth={2.5}
                fill="url(#visitsGrad)"
              />
              <Area
                type="monotone"
                dataKey="orders"
                name={t("overview.chart.orders")}
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#ordersGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue + Order status */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end">{t("overview.sections.revenueOverview")}</h3>
            <div className="text-[11px] px-3 py-1 rounded-full bg-muted/60 text-muted-foreground font-medium">
              {isEn ? "Revenue (EGP / USD)" : "إيرادات (ج.م / دولار)"}
            </div>
          </div>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="revOverviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : `${v}`)}
                />
                <YAxis
                  yAxisId="usd"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--chart-usd))"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}K` : v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                  }}
                  formatter={(v: number, name: string) =>
                    name === "revenueUsd"
                      ? [`$${v.toLocaleString()}`, isEn ? "Revenue (USD)" : "إيرادات (دولار)"]
                      : [`${v.toLocaleString()} ${isEn ? "EGP" : "ج.م"}`, isEn ? "Revenue (EGP)" : "إيرادات (ج.م)"]
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#revOverviewGrad)"
                />
                <Area
                  type="monotone"
                  yAxisId="usd"
                  dataKey="revenueUsd"
                  stroke="hsl(var(--chart-usd))"
                  strokeWidth={2.5}
                  fill="hsl(var(--chart-usd) / 0.08)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold mb-4 text-end">{t("overview.sections.orderStatus")}</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={
                      statusData.every((s) => s.value === 0)
                        ? [
                            {
                              name: "—",
                              value: 1,
                              color: "hsl(var(--muted))",
                            },
                          ]
                        : statusData
                    }
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(statusData.every((s) => s.value === 0)
                      ? [{ color: "hsl(var(--muted))" }]
                      : statusData
                    ).map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-extrabold leading-none">{filteredOrders.length}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{t("overview.totalOrders")}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="font-semibold tabular-nums">{s.value}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audience analytics: devices, OS, sources, countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Devices donut */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end text-sm">{t("overview.sections.devices")}</h3>
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          </div>
          {deviceData.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">{t("overview.noData")}</p>
          ) : (
            <>
              <div className="h-32" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={deviceData}
                      innerRadius={32}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {deviceData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {deviceData.map((d) => {
                  const Icon = DEVICE_ICONS[d.key] || Globe2;
                  const pct = Math.round((d.value / totalDeviceViews) * 100);
                  return (
                    <div key={d.key} className="flex items-center justify-between text-xs">
                      <span className="font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{d.name}</span>
                        <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* OS donut */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end text-sm">{t("overview.sections.os")}</h3>
            <Monitor className="w-4 h-4 text-muted-foreground" />
          </div>
          {osData.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">{t("overview.noData")}</p>
          ) : (
            <>
              <div className="h-32" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={osData}
                      innerRadius={32}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {osData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3">
                {osData.map((d) => {
                  const pct = Math.round((d.value / totalOsViews) * 100);
                  return (
                    <div key={d.key} className="flex items-center justify-between text-xs">
                      <span className="font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{d.name}</span>
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Top sources */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end text-sm">{t("overview.sections.sources")}</h3>
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {topSources.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">{t("overview.noData")}</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5">
                <span>{t("overview.chart.visits")}</span>
                <span>{t("overview.chart.source")}</span>
              </div>
              {topSources.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums">{s.value.toLocaleString()}</span>
                  <span className="text-foreground truncate max-w-[120px]" dir="ltr">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top countries */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end text-sm">{t("overview.sections.countries")}</h3>
            <Globe2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {topCountries.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">{t("overview.noData")}</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5">
                <span>{t("overview.chart.visits")}</span>
                <span>الدولة</span>
              </div>
              {topCountries.map((c) => (
                <div key={c.code} className="flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums">{c.value.toLocaleString()}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{c.code}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: latest orders + top products */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end">{t("mentorDashboard.overview.latestOrders")}</h3>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-primary hover:underline font-medium"
            >
              {t("mentorDashboard.overview.viewAll")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                  <th className="text-end py-2 font-medium">{t("mentorDashboard.overview.colProduct")}</th>
                  <th className="text-end py-2 font-medium">{t("mentorDashboard.overview.colCustomer")}</th>
                  <th className="text-end py-2 font-medium">{t("mentorDashboard.overview.colAmount")}</th>
                  <th className="text-end py-2 font-medium">{t("mentorDashboard.overview.colStatus")}</th>
                  <th className="text-end py-2 font-medium">{t("mentorDashboard.overview.colDate")}</th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => {
                  const sb = statusBadge(order.payment_status);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 text-xs truncate max-w-[120px]">
                        {order.courses?.title || "-"}
                      </td>
                      <td className="py-3 text-xs">{order.students?.full_name || "-"}</td>
                      <td className="py-3 text-xs font-semibold">
                        {order.gateway === "stripe"
                          ? formatMoney(Number(order.amount_paid || 0), order.currency)
                          : order.gross_amount === 0
                          ? t("mentorDashboard.free")
                          : `${order.gross_amount} ${t("mentorDashboard.egp")}`}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sb.cls}`}>
                          {sb.label}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString(
                          i18n.language?.startsWith("en") ? "en-US" : "ar-EG",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "numeric",
                          },
                        )}
                      </td>
                    </tr>
                  );
                })}
                {latestOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                      {t("mentorDashboard.overview.noOrdersInPeriod")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-end">{t("mentorDashboard.overview.topProductsTitle")}</h3>
            <button
              onClick={() => setActiveTab("courses")}
              className="text-xs text-primary hover:underline font-medium"
            >
              {t("mentorDashboard.overview.viewAll")}
            </button>
          </div>
          {topCourses.length > 0 ? (
            <div className="space-y-4">
              {topCourses.map((c, i) => {
                const pct = Math.max(8, Math.round((c.count / topMax) * 100));
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {t("mentorDashboard.overview.ordersCount", { count: c.count })}
                        </span>
                        <p className="text-sm font-semibold truncate text-end">{c.title}</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-10">
              {t("mentorDashboard.overview.noSalesYet")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
