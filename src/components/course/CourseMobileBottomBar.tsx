import { currencySymbol } from "@/lib/currency";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
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
  lessonsCount: number;
  totalDurationSeconds: number;
  courseSlug: string;
  lessonUrl: (slug: string) => string;
  onBuy: () => void;
}

const CourseMobileBottomBar = ({
  course,
  isGiftEnrollment,
  isEnrolled,
  pendingOrder,
  reviews,
  roundedRating,
  lessonsCount,
  totalDurationSeconds,
  courseSlug,
  lessonUrl,
  onBuy,
}: Props) => {
  const { t } = useTranslation();
  const currency = currencySymbol(course.currency);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hourLabel = t("coursePage.hero.hour");
  const minLabel = t("coursePage.hero.minute");
  const andLabel = t("coursePage.hero.and");
  const durationValue =
    hours > 0
      ? `${hours} ${hourLabel}${mins > 0 ? ` ${andLabel} ${mins} ${minLabel}` : ""}`
      : `${totalMinutes} ${minLabel}`;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white/80 backdrop-blur-lg border-t border-[#d7dce6] rounded-t-[20px] text-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {isGiftEnrollment && course.price > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-foreground/40 line-through">{toArPrice(course.price)}</span>
                <span className="text-lg font-black text-green-500">{t("coursePage.purchaseCard.freeGift")}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                {course.price_before_discount && course.price_before_discount > course.price && (
                  <span className="text-[11px] text-foreground/35 line-through">{toAr(course.price_before_discount)}</span>
                )}
                <span className="text-xl font-medium text-foreground leading-none">
                  {course.price > 0 ? toAr(course.price) : t("coursePage.purchaseCard.free")}
                </span>
                {course.price > 0 && <span className={`text-sm text-foreground/45 font-bold ${course.currency === "SAR" ? "product-sar-symbol" : ""}`}>{currency}</span>}
              </div>
            )}
            {!isGiftEnrollment && course.price_before_discount && course.price_before_discount > course.price && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                {t("coursePage.purchaseCard.discount", { value: toAr(Math.round(((course.price_before_discount - course.price) / course.price_before_discount) * 100)) })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-foreground/50 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30 border border-primary/50" />
              {toAr(lessonsCount)} {t("coursePage.curriculum.lectureLabel")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30 border border-primary/50" />
              {toAr(durationValue)}
            </span>
          </div>
        </div>

        <div className="pb-3 px-[20px]">
          {isEnrolled ? (
            <Link to={lessonUrl(courseSlug)} className="block">
              <Button className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                <ArrowRight className="w-4 h-4 me-1.5" />
                {t("coursePage.purchaseCard.watchNow")}
              </Button>
            </Link>
          ) : pendingOrder ? (
            <Button
              className="w-full h-[46px] text-sm font-bold rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-md"
              onClick={onBuy}
            >
              <ArrowRight className="w-4 h-4 me-1.5" />
              {t("coursePage.purchaseCard.continuePayment")}
            </Button>
          ) : (
            <Button
              className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={onBuy}
            >
              <ArrowRight className="w-4 h-4 me-1.5" />
              {course.buy_button_text ||
                (course.price > 0 ? t("coursePage.purchaseCard.buyPaidShort") : t("coursePage.purchaseCard.buyFree"))}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-2">
            {reviews.length > 0 && (
              <>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-2.5 h-2.5 ${s <= Math.round(roundedRating) ? "fill-amber-400 text-amber-400" : "text-foreground/15"}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-amber-500 font-bold ms-0.5">{toAr(roundedRating)}</span>
                {(() => {
                  const positiveReviews = reviews.filter((r) => ((r as any).rating_v2 ?? r.rating) >= 4).length;
                  const positivePercentage = Math.round((positiveReviews / reviews.length) * 100);
                  return (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {t("coursePage.reviews.positive", { value: toAr(positivePercentage) })}
                    </span>
                  );
                })()}
              </>
            )}
          </div>
          {course.price > 0 && <PaymentBadges currency={course.currency} imgClassName="h-4 object-contain" />}
        </div>
      </div>
    </div>
  );
};

export default CourseMobileBottomBar;
