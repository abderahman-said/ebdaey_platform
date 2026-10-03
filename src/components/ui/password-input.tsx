import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  toggleClassName?: string;
}

/**
 * Password input with visibility toggle icon on the inline end.
 * Must be rendered inside a `relative` wrapper (the toggle is absolutely positioned).
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, toggleClassName, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <>
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pe-10 password-input", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className={cn(
            "absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10",
            toggleClassName,
          )}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
