import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  error?: boolean;
  containerClassName?: string;
  /** Static prefix rendered inside the field (e.g. country flag + dial code) */
  prefix?: React.ReactNode;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, className, containerClassName, id, prefix, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className={cn("relative", containerClassName)}>
        <div
          className={cn(
            "peer w-full h-14 rounded-2xl bg-card border flex items-center gap-2 px-4 transition-all",
            "focus-within:ring-4 focus-within:ring-primary/10",
            error
              ? "border-destructive focus-within:border-destructive"
              : "border-border focus-within:border-primary",
          )}
        >
          {prefix && <div className="flex items-center gap-1.5 shrink-0 select-none">{prefix}</div>}
          <input
            {...props}
            ref={ref}
            id={inputId}
            placeholder=" "
            className={cn(
              "peer/input flex-1 min-w-0 h-full bg-transparent pt-4 pb-1 text-sm text-foreground",
              "placeholder-transparent focus:outline-none",
              className,
            )}
          />
        </div>
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-card px-1 transition-all duration-200 origin-start rtl:tracking-normal",
            "peer-focus-within:top-0 peer-focus-within:text-[11px] peer-focus-within:font-semibold peer-focus-within:text-primary",
            "peer-[:has(:not(:placeholder-shown))]:top-0 peer-[:has(:not(:placeholder-shown))]:text-[11px] peer-[:has(:not(:placeholder-shown))]:font-semibold peer-[:has(:not(:placeholder-shown))]:text-foreground",
            prefix && "top-0 text-[11px] font-semibold text-foreground",
            error && "peer-focus-within:text-destructive text-destructive",
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);

FloatingInput.displayName = "FloatingInput";
