import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TOAST_CONFIG,
  TOAST_STYLES,
  TOAST_ANIMATION_CLASS,
} from "@/config/toastStyle";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const styles = TOAST_STYLES[TOAST_CONFIG.style];
  const animationClass = TOAST_ANIMATION_CLASS[TOAST_CONFIG.animation];

  const progressClass = TOAST_CONFIG.showProgress
    ? `after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:origin-left ${styles.progress} after:animate-toast-progress`
    : "";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={TOAST_CONFIG.duration}
      position={TOAST_CONFIG.position}
      toastOptions={{
        classNames: {
          toast: cn(
            "group toast relative overflow-hidden p-4 pe-10 gap-3 flex items-start",
            TOAST_CONFIG.radius,
            styles.base,
            animationClass,
            progressClass,
          ),
          success: styles.success,
          error: styles.error,
          info: styles.info,
          warning: styles.warning,
          title: "text-sm font-semibold leading-snug",
          description: "text-sm opacity-80 leading-snug",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:border-0 group-[.toast]:text-current group-[.toast]:opacity-60 hover:group-[.toast]:opacity-100",
          icon: cn(
            "flex items-center justify-center w-5 h-5 shrink-0",
            styles.iconWrap,
          ),
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
