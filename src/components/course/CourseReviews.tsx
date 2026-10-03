import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toAr } from "@/lib/utils";

interface Review {
  id: string;
  first_name: string;
  last_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Props {
  reviews: Review[];
  isEnrolled: boolean;
}

const CourseReviews = ({ reviews, isEnrolled }: Props) => {
  const { t } = useTranslation();

  const formatRelative = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const sec = Math.max(1, Math.floor(diffMs / 1000));
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const month = Math.floor(day / 30);
    const year = Math.floor(day / 365);
    if (year >= 1)
      return year === 1
        ? t("coursePage.reviews.time.year")
        : year === 2
          ? t("coursePage.reviews.time.twoYears")
          : t("coursePage.reviews.time.years", { n: toAr(year) });
    if (month >= 1)
      return month === 1
        ? t("coursePage.reviews.time.month")
        : month === 2
          ? t("coursePage.reviews.time.twoMonths")
          : t("coursePage.reviews.time.months", { n: toAr(month) });
    if (day >= 1)
      return day === 1
        ? t("coursePage.reviews.time.day")
        : day === 2
          ? t("coursePage.reviews.time.twoDays")
          : t("coursePage.reviews.time.days", { n: toAr(day) });
    if (hr >= 1)
      return hr === 1
        ? t("coursePage.reviews.time.hour")
        : hr === 2
          ? t("coursePage.reviews.time.twoHours")
          : t("coursePage.reviews.time.hours", { n: toAr(hr) });
    if (min >= 1)
      return min === 1
        ? t("coursePage.reviews.time.minute")
        : min === 2
          ? t("coursePage.reviews.time.twoMinutes")
          : t("coursePage.reviews.time.minutes", { n: toAr(min) });
    return t("coursePage.reviews.time.moments");
  };

  if (reviews.length === 0) return null;
  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          {t("coursePage.reviews.title")}
        </h2>
      </div>

      {reviews.length > 0 && (
        <ul className="divide-y divide-border/60 max-w-3xl mx-auto">
          {reviews.map((review) => (
            <li key={review.id} className="py-5 sm:py-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                {review.first_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {review.first_name} {review.last_name}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i <= Math.floor((review as any).rating_v2 ?? review.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviews.length === 0 && !isEnrolled && (
        <div className="text-center py-8 text-muted-foreground text-sm">{t("coursePage.reviews.empty")}</div>
      )}
    </div>
  );
};

export default CourseReviews;
