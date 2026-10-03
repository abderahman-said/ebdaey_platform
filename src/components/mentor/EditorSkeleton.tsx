// Shimmer skeleton placeholders for course / digital-product editors and managers.

export const Shimmer = ({ className = "" }: { className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-md bg-muted/40 ${className}`}
    style={{
      backgroundImage:
        "linear-gradient(90deg, transparent, hsl(var(--muted)/0.7), transparent)",
      backgroundSize: "200% 100%",
    }}
  >
    <div
      className="absolute inset-0 animate-shimmer"
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.55) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  </div>
);

export const EditorSkeleton = () => (
  <div className="space-y-6">
    {/* Top sticky bar */}
    <div className="glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Shimmer className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1 min-w-0 max-w-xs">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-9 w-24 rounded-lg" />
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>
    </div>

    {/* Tabs strip */}
    <div className="glass-card rounded-2xl p-1.5 flex items-center gap-2 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <Shimmer key={i} className="h-9 flex-1 rounded-xl" />
      ))}
    </div>

    {/* Body */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-24 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Shimmer className="h-10 rounded-lg" />
            <Shimmer className="h-10 rounded-lg" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <Shimmer className="h-5 w-44" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <Shimmer className="h-5 w-24" />
          <Shimmer className="aspect-video w-full rounded-xl" />
          <Shimmer className="h-9 w-full rounded-lg" />
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <Shimmer className="h-5 w-28" />
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const ProductsListSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden"
      >
        <Shimmer className="aspect-video w-full rounded-none" />
        <div className="p-4 space-y-3">
          <Shimmer className="h-5 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
          <div className="flex items-center justify-between pt-2">
            <Shimmer className="h-8 w-20 rounded-lg" />
            <Shimmer className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default EditorSkeleton;
