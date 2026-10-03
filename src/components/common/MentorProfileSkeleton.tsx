import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton mirroring the MentorProfile layout (cover, centered avatar overlapping cover,
 * name/bio/stats, and courses grid). Matches both desktop and mobile.
 */
const MentorProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Cover */}
      <div className="relative h-40 lg:h-[250px] overflow-hidden">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-full" />
        </div>
      </div>

      {/* Profile section */}
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="relative -mt-16 sm:-mt-20 z-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-background border-4 border-card" />
          </div>

          {/* Name */}
          <Skeleton className="h-7 sm:h-8 w-48 mt-3 mb-2" />

          {/* Bio */}
          <div className="space-y-2 max-w-xl mx-auto w-full mt-1">
            <Skeleton className="h-3.5 w-5/6 mx-auto" />
            <Skeleton className="h-3.5 w-3/4 mx-auto" />
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>

        {/* Courses */}
        <section className="mt-14 pb-20">
          <div className="flex items-center justify-between mb-7">
            <Skeleton className="h-7 sm:h-8 w-40" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col bg-card rounded-2xl overflow-hidden shadow-card border border-transparent"
              >
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-2/3" />
                  <div className="flex items-center justify-between pt-3">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-9 w-24 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MentorProfileSkeleton;
