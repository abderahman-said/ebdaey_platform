import { Check, Crown, Sparkles, MessageCircle, Bot, Award, TrendingUp, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toArPrice } from "@/lib/utils";

const proExtrasIcons = [Bot, Award, TrendingUp];

const MembershipCard = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const mx2 = isRtl ? "ml-2" : "mr-2";

  const creatorsFeatures = t("membership.creatorsFeatures", { returnObjects: true }) as string[];
  const proExtras = t("membership.proExtras", { returnObjects: true }) as string[];

  const priceLabel = i18n.language.startsWith("ar") ? toArPrice(399) : `399 EGP`;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><BadgeCheck className="h-6 w-6 text-primary" />{t("membership.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("membership.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-card border-2 border-primary shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              {t("membership.currentPlan")}
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {t("membership.free")}
            </span>
          </div>

          <h2 className="text-2xl font-black mb-1">{t("membership.proTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("membership.proDesc")}
          </p>

          <div className="mb-5 pb-5 border-b border-border/50 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black line-through text-muted-foreground/60">
                {priceLabel}
              </span>
              <span className="text-sm text-muted-foreground">{t("membership.monthly")}</span>
              <span className="text-lg font-bold text-emerald-600">{t("membership.freeInline")}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black">8%</span>
              <span className="text-sm text-muted-foreground">{t("membership.commissionSuffix")}</span>
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            <p className="text-sm font-bold text-foreground">
              {t("membership.proExtrasHeader")}
            </p>
            {proExtras.map((text, i) => {
              const Icon = proExtrasIcons[i] || Sparkles;
              return (
                <div key={`pro-${i}`} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm leading-relaxed font-medium">{text}</span>
                </div>
              );
            })}
          </div>

          <Button asChild variant="outline" className="mt-auto">
            <a href={`https://wa.me/201505925116?text=${encodeURIComponent(t("membership.supportMessage"))}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className={`w-4 h-4 ${mx2}`} />
              {t("membership.contactSupport")}
            </a>
          </Button>
        </div>

        <div className="rounded-2xl bg-card border border-border/50 shadow-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {t("membership.basicBadge")}
            </div>
          </div>

          <h2 className="text-2xl font-black mb-1">{t("membership.creatorsTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("membership.creatorsDesc")}
          </p>

          <div className="flex items-baseline gap-2 mb-5 pb-5 border-b border-border/50">
            <span className="text-3xl font-black">8%</span>
            <span className="text-sm text-muted-foreground">{t("membership.commissionOnly")}</span>
          </div>

          <div className="space-y-2.5 mb-5">
            {creatorsFeatures.map((text, i) => (
              <div key={`base-${i}`} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-foreground/70" />
                </div>
                <span className="text-sm leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;
