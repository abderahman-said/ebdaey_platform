interface TopLoadingBarProps {
  coverPage?: boolean;
}

/**
 * Modern top loading indicator: a thin sweeping gradient bar that glides
 * across the top of the viewport. No spinner — inspired by Vercel/YouTube.
 */
const TopLoadingBar = ({ coverPage = false }: TopLoadingBarProps) => (
  <>
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 w-1/3 animate-[sweep-bar_1.2s_ease-in-out_infinite] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.35) 20%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.35) 80%, transparent 100%)",
          boxShadow: "0 0 12px hsl(var(--primary) / 0.6)",
        }}
      />
    </div>
    {coverPage ? <div className="min-h-screen bg-background" aria-hidden="true" /> : null}
  </>
);

export default TopLoadingBar;
