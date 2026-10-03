/**
 * Per-tab skeleton loaders for the Mentor Dashboard.
 * Each variant mirrors the structure of the corresponding tab so the loading
 * state feels natural instead of flashing an overview shape everywhere.
 */
import { useTranslation } from "react-i18next";

export const Shimmer = ({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`relative overflow-hidden rounded-md bg-muted/60 ${className}`}
    style={style}
    aria-hidden="true"
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
  </div>
);

/* ------------------------------ Building blocks ---------------------------- */

const PageHeader = ({ withActions = true }: { withActions?: boolean }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
    <div className="space-y-2">
      <Shimmer className="h-7 w-56" />
      <Shimmer className="h-3 w-40" />
    </div>
    {withActions && (
      <div className="flex items-center gap-2">
        <Shimmer className="h-10 w-40 rounded-xl" />
        <Shimmer className="h-10 w-28 rounded-xl" />
      </div>
    )}
  </div>
);

const StatCardSkeleton = () => (
  <div className="glass-card rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <Shimmer className="h-10 w-10 rounded-xl" />
      <Shimmer className="h-3 w-16" />
    </div>
    <Shimmer className="h-7 w-24 mb-2" />
    <Shimmer className="h-3 w-20" />
  </div>
);

/* --------------------------------- Variants -------------------------------- */

const OverviewSkeleton = () => (
  <div className="animate-fade-in">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div className="space-y-2">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-3 w-40" />
      </div>
      <Shimmer className="h-10 w-44 rounded-xl" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div className="glass-card rounded-2xl p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-4 w-20" />
        </div>
        <div className="flex items-end gap-2 h-56">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 h-full flex items-end">
              <Shimmer
                className="w-full rounded-t-lg"
                style={{ height: `${30 + ((i * 13) % 65)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card rounded-2xl p-5">
        <Shimmer className="h-5 w-32 mb-5" />
        <div className="flex items-center justify-center py-6">
          <Shimmer className="h-40 w-40 rounded-full" />
        </div>
        <div className="space-y-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {Array.from({ length: 2 }).map((_, c) => (
        <div key={c} className="glass-card rounded-2xl p-5">
          <Shimmer className="h-5 w-40 mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Shimmer className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-3 w-2/3" />
                  <Shimmer className="h-3 w-1/3" />
                </div>
                <Shimmer className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <Shimmer className="h-5 w-36" />
        <Shimmer className="h-4 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
          >
            <Shimmer className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-1/3" />
              <Shimmer className="h-3 w-1/4" />
            </div>
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TableSkeleton = ({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="animate-fade-in">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-3">
      <Shimmer className="h-7 w-56" />
      <div className="flex flex-wrap items-center gap-2">
        <Shimmer className="h-10 w-64 rounded-xl" />
        <Shimmer className="h-9 w-24 rounded-full" />
        <Shimmer className="h-9 w-28 rounded-full" />
        <Shimmer className="h-9 w-24 rounded-full" />
      </div>
    </div>

    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="hidden sm:flex items-center gap-4 pb-3 border-b border-border/40">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-4">
            <Shimmer className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-1/2" />
              <Shimmer className="h-3 w-1/3" />
            </div>
            <Shimmer className="hidden sm:block h-3 w-20" />
            <Shimmer className="hidden md:block h-6 w-20 rounded-full" />
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ListSkeleton = ({
  rows = 6,
  withAvatar = true,
  withActions = true,
}: {
  rows?: number;
  withAvatar?: boolean;
  withActions?: boolean;
}) => (
  <div className="animate-fade-in">
    <PageHeader withActions={withActions} />
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/20"
          >
            {withAvatar && <Shimmer className="h-11 w-11 rounded-xl shrink-0" />}
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-2/5" />
              <Shimmer className="h-3 w-1/4" />
            </div>
            <Shimmer className="hidden sm:block h-6 w-20 rounded-full" />
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CardGridSkeleton = ({ cards = 6 }: { cards?: number }) => (
  <div className="animate-fade-in">
    <PageHeader />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="glass-card rounded-2xl overflow-hidden flex flex-col"
          style={{ height: 340 }}
        >
          <Shimmer className="h-40 w-full rounded-none" />
          <div className="p-4 flex-1 flex flex-col gap-3">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
            <div className="flex items-center gap-2 mt-1">
              <Shimmer className="h-5 w-16 rounded-full" />
              <Shimmer className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
              <Shimmer className="h-4 w-16" />
              <div className="flex items-center gap-2">
                <Shimmer className="h-8 w-8 rounded-lg" />
                <Shimmer className="h-8 w-8 rounded-lg" />
                <Shimmer className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const FormSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="animate-fade-in">
    <PageHeader withActions={false} />
    <div className="max-w-3xl mx-auto glass-card rounded-2xl p-6 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Shimmer className="h-3 w-32" />
          <Shimmer
            className={`h-10 w-full rounded-xl ${i % 4 === 3 ? "h-28" : ""}`}
          />
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 pt-3">
        <Shimmer className="h-10 w-24 rounded-xl" />
        <Shimmer className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  </div>
);

const StatsStripPlusCardSkeleton = () => (
  <div className="animate-fade-in">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
      <Shimmer className="h-7 w-56" />
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30"
          >
            <Shimmer className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Shimmer className="h-2.5 w-16" />
              <Shimmer className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="max-w-xl mx-auto glass-card rounded-2xl p-6 space-y-4 mb-6">
      <Shimmer className="h-5 w-40 mx-auto" />
      <Shimmer className="h-3 w-56 mx-auto" />
      <div className="space-y-3 pt-2">
        <Shimmer className="h-10 w-full rounded-xl" />
        <Shimmer className="h-10 w-full rounded-xl" />
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>
      <Shimmer className="h-10 w-full rounded-xl" />
    </div>

    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="divide-y divide-border/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <Shimmer className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-1/3" />
              <Shimmer className="h-3 w-1/4" />
            </div>
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CardsRowSkeleton = ({ cards = 3 }: { cards?: number }) => (
  <div className="animate-fade-in">
    <PageHeader />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-2/3" />
              <Shimmer className="h-3 w-1/3" />
            </div>
          </div>
          <div className="space-y-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-5/6" />
            <Shimmer className="h-3 w-4/6" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* -------------------------------- Dispatcher ------------------------------- */

export type MentorTabKey = string;

const CARD_GRID_TABS = new Set([
  "courses",
  "live-courses",
  "digital-products",
  "consultations",
]);

const TABLE_TABS = new Set(["orders", "transactions"]);

const LIST_TABS = new Set([
  "students",
  "coupons",
  "promotional-offers",
  "notifications",
  "subscriptions",
  "reviews",
  "upcoming-appointments",
  "schedules",
]);

const FORM_TABS = new Set([
  "profile",
  "edit-my-data",
  "certificate",
  "marketing",
  "settings",
  "change-password",
  "membership",
]);

const CARDS_ROW_TABS = new Set(["plans", "payment-gateways"]);

const STATS_STRIP_TABS = new Set(["transfers", "withdrawals"]);

const MentorTabSkeleton = ({ tab = "overview" }: { tab?: MentorTabKey }) => {
  const { i18n } = useTranslation();
  const dir = i18n.language?.startsWith("ar") ? "rtl" : "ltr";

  let node: React.ReactNode;
  if (tab === "overview") node = <OverviewSkeleton />;
  else if (TABLE_TABS.has(tab)) node = <TableSkeleton />;
  else if (LIST_TABS.has(tab)) node = <ListSkeleton />;
  else if (CARD_GRID_TABS.has(tab)) node = <CardGridSkeleton />;
  else if (FORM_TABS.has(tab)) node = <FormSkeleton />;
  else if (CARDS_ROW_TABS.has(tab)) node = <CardsRowSkeleton />;
  else if (STATS_STRIP_TABS.has(tab)) node = <StatsStripPlusCardSkeleton />;
  else node = <ListSkeleton />;

  return <div dir={dir}>{node}</div>;
};

export default MentorTabSkeleton;
export {
  OverviewSkeleton,
  TableSkeleton,
  ListSkeleton,
  CardGridSkeleton,
  FormSkeleton,
  CardsRowSkeleton,
  StatsStripPlusCardSkeleton,
};
