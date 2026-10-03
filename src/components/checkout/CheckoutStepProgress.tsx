import { cn } from "@/lib/utils";

export interface CheckoutStep {
  label: string;
  hint?: string;
}

interface Props {
  steps: CheckoutStep[];
  currentStep: number; // 1-based
  className?: string;
}

const CheckoutStepProgress = ({ steps, currentStep, className }: Props) => {
  const total = steps.length;

  return (
    <div className={cn("w-full max-w-sm mx-auto mb-6 px-2", className)}>
      <ol
        className="relative grid items-start"
        style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
      >
        {/* Thin connector line */}
        <div
          className="absolute top-[5px] h-px bg-border"
          style={{ insetInlineStart: `${50 / total}%`, insetInlineEnd: `${50 / total}%` }}
          aria-hidden
        />

        {steps.map((s, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const reached = isDone || isActive;

          return (
            <li key={idx} className="flex flex-col items-center text-center relative">
              <span
                className={cn(
                  "relative flex items-center justify-center transition-all duration-300",
                  isActive ? "w-2.5 h-2.5" : "w-2 h-2"
                )}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" />
                )}
                <span
                  className={cn(
                    "relative rounded-full transition-colors",
                    isActive ? "w-2.5 h-2.5 bg-primary" : isDone ? "w-2 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30"
                  )}
                />
              </span>
              <div
                className={cn(
                  "mt-2 text-[11px] sm:text-xs font-semibold tracking-tight transition-colors",
                  reached ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </div>
              {s.hint && (
                <div
                  className={cn(
                    "hidden sm:block text-[10px] mt-0.5 transition-colors",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/70"
                  )}
                >
                  {s.hint}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default CheckoutStepProgress;
