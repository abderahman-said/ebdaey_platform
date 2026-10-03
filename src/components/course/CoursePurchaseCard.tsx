import { currencySymbol } from "@/lib/currency";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Shield, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import PaymentBadges from "@/components/common/PaymentBadges";
import { toAr, toArPrice } from "@/lib/utils";

interface Props {
  course: any;
  isGiftEnrollment: boolean;
  isEnrolled: boolean;
  pendingOrder: any;
  reviews: { rating: number }[];
  roundedRating: number;
  communityLink: string;
  courseSlug: string;
  lessonUrl: (slug: string) => string;
  onBuy: () => void;
}

const CoursePurchaseCard = ({
  course,
  isGiftEnrollment,
  isEnrolled,
  pendingOrder,
  reviews,
  roundedRating,
  communityLink,
  courseSlug,
  lessonUrl,
  onBuy,
}: Props) => {
  const { t } = useTranslation();
  const currency = currencySymbol(course.currency);

  return (
    <div className="hidden lg:block relative">
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[28px] blur-sm" />

      <div className="relative bg-card border border-border/50 rounded-[24px] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-l from-primary via-primary/80 to-primary/40" />

        <div className="p-6 space-y-5">
          <div className="relative bg-muted/40 rounded-2xl p-5">
            {!isGiftEnrollment &&
              course.price_before_discount &&
              course.price_before_discount > course.price && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-destructive text-destructive-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                    {t("coursePage.purchaseCard.discount", { value: toAr(Math.round(((course.price_before_discount - course.price) / course.price_before_discount) * 100)) })}
                  </span>
                </div>
              )}

            <div className="flex items-end justify-between gap-3">
              <div>
                {isGiftEnrollment && course.price > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground line-through">{toArPrice(course.price)}</span>
                    <span className="text-3xl font-black text-green-600">{t("coursePage.purchaseCard.freeGift")}</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-medium text-foreground tracking-tight leading-none text-4xl">
                        {course.price > 0 ? toAr(course.price) : t("coursePage.purchaseCard.free")}
                      </span>
                      {course.price > 0 && <span className={`text-sm text-muted-foreground font-bold ${course.currency === "SAR" ? "product-sar-symbol" : ""}`}>{currency}</span>}
                    </div>
                    {course.price_before_discount && course.price_before_discount > course.price && (
                      <span className="text-sm text-muted-foreground line-through font-medium mt-1 block">
                        {toAr(course.price_before_discount)} <span className={course.currency === "SAR" ? "product-sar-symbol" : ""}>{currency}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              {reviews.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5 border border-border/40 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-foreground">{toAr(roundedRating)}</span>
                    <span className="text-[10px] text-muted-foreground">({toAr(reviews.length)})</span>
                  </div>
                  {(() => {
                    const positiveReviews = reviews.filter((r) => ((r as any).rating_v2 ?? r.rating) >= 4).length;
                    const positivePercentage = Math.round((positiveReviews / reviews.length) * 100);
                    return (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {t("coursePage.reviews.positive", { value: toAr(positivePercentage) })}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {isGiftEnrollment && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700 font-semibold">{t("coursePage.purchaseCard.giftNote")}</p>
            </div>
          )}

          {isEnrolled ? (
            <Link to={lessonUrl(courseSlug)} className="block">
              <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-300">
                <ArrowRight className="w-5 h-5 me-2" />
                {t("coursePage.purchaseCard.watchNow")}
              </Button>
            </Link>
          ) : pendingOrder ? (
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              onClick={onBuy}
            >
              <ArrowRight className="w-5 h-5 me-2" />
              {t("coursePage.purchaseCard.continuePayment")}
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-300"
              onClick={onBuy}
            >
              <ArrowRight className="w-5 h-5 me-2" />
              {course.buy_button_text ||
                (course.price > 0 ? t("coursePage.purchaseCard.buyPaid") : t("coursePage.purchaseCard.buyFree"))}
            </Button>
          )}

          {!isGiftEnrollment && course.price > 0 && (
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t("coursePage.purchaseCard.securePayment")}</span>
              </div>
              <PaymentBadges currency={course.currency} />
            </div>
          )}

          {isEnrolled && communityLink && (
            <div className="pt-1">
              <a href={communityLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-semibold rounded-xl border-2 border-primary/15 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <MessageCircle className="w-4 h-4 me-2 group-hover:scale-110 transition-transform" />
                  {t("coursePage.purchaseCard.joinCommunity")}
                </Button>
              </a>
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">{t("coursePage.purchaseCard.communityHint")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePurchaseCard;
