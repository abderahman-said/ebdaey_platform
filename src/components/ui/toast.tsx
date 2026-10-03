import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TOAST_CONFIG,
  TOAST_STYLES,
  TOAST_ANIMATION_CLASS,
} from "@/config/toastStyle";

const ToastProvider = ToastPrimitives.Provider;

const POSITION_CLASS: Record<string, string> = {
  "top-right": "top-0 right-0 flex-col",
  "top-center": "top-0 left-1/2 -translate-x-1/2 flex-col",
  "top-left": "top-0 left-0 flex-col",
  "bottom-right": "bottom-0 right-0 flex-col-reverse",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "bottom-left": "bottom-0 left-0 flex-col-reverse",
};

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed z-[100] flex max-h-screen w-full gap-2 p-4 md:max-w-[420px]",
      POSITION_CLASS[TOAST_CONFIG.position] ?? POSITION_CLASS["bottom-right"],
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const styles = TOAST_STYLES[TOAST_CONFIG.style];

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden p-4 pe-10 transition-all",
    TOAST_CONFIG.radius,
    styles.base,
    TOAST_ANIMATION_CLASS[TOAST_CONFIG.animation],
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  ),
  {
    variants: {
      variant: {
        default: styles.info,
        destructive: cn("destructive group", styles.error),
        success: styles.success,
        warning: styles.warning,
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const ICONS = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  const Icon = ICONS[(variant as keyof typeof ICONS) || "default"] ?? Info;
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <span
        data-toast-icon
        className={cn(
          "flex items-center justify-center w-5 h-5 shrink-0 mt-0.5",
          styles.iconWrap,
        )}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">{children}</div>
      {TOAST_CONFIG.showProgress && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 h-[3px] w-full origin-left animate-toast-progress",
            styles.progress,
          )}
        />
      )}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute end-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-snug", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-80 leading-snug", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
