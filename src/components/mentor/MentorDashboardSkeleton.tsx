/**
 * Shimmer skeleton used while MentorDashboard loads its initial data.
 * Mimics the overview layout (header, 4 stat cards, chart row, table rows)
 * so the page feels populated instead of showing zeros and empty tabs.
 */
const Shimmer = ({
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

const MentorDashboardSkeleton = () => {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="text-end space-y-2">
          <Shimmer className="h-7 w-56 ml-auto" />
          <Shimmer className="h-3 w-40 ml-auto" />
        </div>
        <Shimmer className="h-10 w-44 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts row */}
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

      {/* Two-column lists */}
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

      {/* Latest orders table */}
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
};

export default MentorDashboardSkeleton;
