import { ReactNode } from "react";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import { useTranslation } from "react-i18next";

export type ResultStatus = "loading" | "success" | "failed";

interface Props {
  status: ResultStatus;
  primaryColor?: string | null;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

const UnifiedPaymentResultLayout = ({ status, primaryColor, title, subtitle, children, actions }: Props) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const Icon = status === "loading" ? Loader2 : status === "success" ? CheckCircle2 : XCircle;
  const isFail = status === "failed";
  const spin = status === "loading" ? "animate-spin" : "";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 px-4 py-8" dir={isRtl ? "rtl" : "ltr"}>
      {primaryColor && <TenantThemeInjector primaryColor={primaryColor} />}
      <div className="w-full max-w-[420px]">
        <div className="bg-card rounded-[2rem] border border-border/60 shadow-[0_32px_64px_-16px_hsl(var(--foreground)/0.08)] overflow-hidden">
          {/* Header */}
          <div className="pt-10 pb-4 flex flex-col items-center text-center px-8">
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 rounded-full scale-125 blur-xl opacity-60 ${
                  isFail ? "bg-destructive/20" : "bg-primary/20"
                }`}
              />
              <div
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                  isFail
                    ? "bg-destructive shadow-destructive/20"
                    : "bg-primary shadow-primary/25"
                }`}
              >
                <Icon
                  className={`w-10 h-10 text-primary-foreground ${spin}`}
                  strokeWidth={3}
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm leading-relaxed px-2">{subtitle}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 pb-8">
            {children}
            {actions && <div className="space-y-3 pt-2">{actions}</div>}

            {status === "success" && (
              <div className="mt-8 flex items-center justify-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                <p className="text-[11px] font-medium tracking-wide uppercase rtl:tracking-normal">
                  {t("coursePage.checkout.result.secureBadge", { defaultValue: "Secure 256-bit Encryption" })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedPaymentResultLayout;
