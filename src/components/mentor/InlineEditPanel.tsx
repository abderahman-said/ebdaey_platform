import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Drop-in inline replacement for the Dialog primitives used by the product
 * editors. Instead of opening a modal, the editing fields expand inline on
 * the same page.
 */

export const InlineEdit = ({
  open,
  children,
}: {
  open: boolean;
  onOpenChange?: (v: boolean) => void;
  children: ReactNode;
}) => {
  if (!open) return null;
  return <div className="mt-4">{children}</div>;
};

export const InlineEditContent = ({
  children,
  className,
  dir,
}: {
  children: ReactNode;
  className?: string;
  dir?: string;
}) => (
  <div
    dir={dir}
    className={cn(
      "rounded-2xl border border-primary/30 bg-card/60 p-4 sm:p-5 space-y-4",
      className,
    )}
  >
    {children}
  </div>
);

export const InlineEditHeader = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn("space-y-1", className)}>{children}</div>;

export const InlineEditTitle = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <h4 className={cn("text-sm font-bold", className)}>{children}</h4>;

export const InlineEditDescription = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>
);

export const InlineEditFooter = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/60",
      className,
    )}
  >
    {children}
  </div>
);
