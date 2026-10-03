import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton mirroring the CoursePage layout (header + hero with purchase card on desktop,
 * bottom action bar on mobile). Keeps the perceived layout stable while data loads.
 */
const CoursePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#f8f8f9]">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-40 container mx-auto px-4 sm:px-6 mt-0">
        <div className="relative backdrop-blur-xl border border-border/80 py-3 px-4 sm:px-4 flex items-center justify-between gap-2 bg-transparent">
          {/* Right: mentor */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>

          {/* Center: nav (desktop) */}
          <nav className="hidden md:flex items-center gap-2 bg-muted/40 rounded-full p-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </nav>

          {/* Left: auth */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 sm:h-9 w-20 sm:w-28 rounded-full" />
            <Skeleton className="md:hidden w-7 h-7 rounded-full" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
           {/* Sticky purchase card (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card border border-border/40 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] space-y-5">
              <Skeleton className="w-full aspect-video rounded-2xl" />
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </aside>
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title block */}
           

            {/* Banner / video */}
            <Skeleton className="w-full aspect-video rounded-2xl sm:rounded-3xl" />

            {/* Stats row */}
            <div className="hidden sm:flex items-center justify-center gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <div className="text-center max-w-4xl mx-auto space-y-3">
              <Skeleton className="h-7 sm:h-8 w-3/4 mx-auto" />
              <Skeleton className="h-5 sm:h-6 w-2/3 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </div>

         
        </div>
      </section>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-white/80 backdrop-blur-lg border-t border-[#d7dce6] rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Skeleton className="h-6 w-20" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="pb-3 px-5">
            <Skeleton className="h-[46px] w-full rounded-2xl" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePageSkeleton;
