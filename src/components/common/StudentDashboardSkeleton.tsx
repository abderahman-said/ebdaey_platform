import { Skeleton } from "@/components/ui/skeleton";
import TopLoadingBar from "@/components/common/TopLoadingBar";

/**
 * Skeleton mirroring the StudentDashboard layout:
 * Sticky top header, welcome & stats cards, and course grid.
 * Avoids any full-page blank flash while initial data loads.
 */
const StudentDashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <TopLoadingBar />

      {/* Header */}
      <header className="glass-strong border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="hidden sm:inline-block h-8 w-20 rounded-md" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl px-3 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome & Stats Row */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-card p-4 rounded-xl border border-border/50 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="bg-card p-4 rounded-xl border border-border/50 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="col-span-2 sm:col-span-1 bg-card p-4 rounded-xl border border-border/50 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>

        {/* Tabs / Filter bar */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border/50 overflow-hidden space-y-3 p-3 sm:p-4"
            >
              <Skeleton className="h-36 sm:h-40 w-full rounded-lg" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <div className="space-y-1.5 pt-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboardSkeleton;
