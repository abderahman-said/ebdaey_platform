import { Skeleton } from "@/components/ui/skeleton";

type Variant = "cards" | "list" | "pricing" | "faq" | "cta" | "footer";

export default function SectionSkeleton({
  variant = "cards",
  minHeight,
}: {
  variant?: Variant;
  minHeight?: number;
}) {
  return (
    <section
      className="relative z-10 bg-[#eef7f1] py-16 md:py-20"
      style={minHeight ? { minHeight } : undefined}
      aria-hidden="true"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Heading block */}
        <div className="mb-10 max-w-2xl space-y-4">
          <Skeleton className="h-4 w-32 bg-[#0f2e22]/10" />
          <Skeleton className="h-10 sm:h-12 w-3/4 bg-[#0f2e22]/10" />
          <Skeleton className="h-10 sm:h-12 w-1/2 bg-[#0f2e22]/10" />
        </div>

        {variant === "cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex bg-white rounded-2xl overflow-hidden border border-[#0f2e22]/10 h-32"
              >
                <Skeleton className="w-24 h-full rounded-none bg-[#0f2e22]/15" />
                <div className="flex-1 p-6 space-y-3">
                  <Skeleton className="h-5 w-1/2 bg-[#0f2e22]/10" />
                  <Skeleton className="h-3 w-full bg-[#0f2e22]/10" />
                  <Skeleton className="h-3 w-4/5 bg-[#0f2e22]/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "list" && (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-5">
                <Skeleton className="w-14 h-14 rounded-full bg-[#0f2e22]/15 flex-shrink-0" />
                <div className="flex-1 bg-white rounded-[28px] px-6 py-5 space-y-3">
                  <Skeleton className="h-5 w-1/3 bg-[#0f2e22]/10" />
                  <Skeleton className="h-3 w-3/4 bg-[#0f2e22]/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "pricing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 space-y-4 border border-[#0f2e22]/10">
                <Skeleton className="h-6 w-1/3 bg-[#0f2e22]/10" />
                <Skeleton className="h-12 w-1/2 bg-[#0f2e22]/10" />
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-full bg-[#0f2e22]/10" />
                  ))}
                </div>
                <Skeleton className="h-12 w-full rounded-xl bg-[#0f2e22]/15 mt-6" />
              </div>
            ))}
          </div>
        )}

        {variant === "faq" && (
          <div className="max-w-3xl mx-auto space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/80 border border-[#0f2e22]/10 rounded-2xl px-6 py-5 flex items-center justify-between"
              >
                <Skeleton className="h-5 w-2/3 bg-[#0f2e22]/10" />
                <Skeleton className="w-8 h-8 rounded-full bg-[#0f2e22]/10" />
              </div>
            ))}
          </div>
        )}

        {variant === "cta" && (
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Skeleton className="h-12 w-3/4 mx-auto bg-[#0f2e22]/10" />
            <Skeleton className="h-4 w-1/2 mx-auto bg-[#0f2e22]/10" />
            <Skeleton className="h-14 w-56 mx-auto rounded-2xl bg-[#0f2e22]/15" />
          </div>
        )}

        {variant === "footer" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Skeleton className="h-8 w-32 bg-[#0f2e22]/10" />
            <Skeleton className="h-4 w-64 bg-[#0f2e22]/10" />
          </div>
        )}
      </div>
    </section>
  );
}
