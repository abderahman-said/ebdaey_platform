import { currencySymbol } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarClock, Clock, Video, MapPin, Users, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentBadges from "@/components/common/PaymentBadges";
import { toAr } from "@/lib/utils";

interface Props {
  course: any;
  isConsultation: boolean;
  isEnrolled: boolean;
  isFull: boolean;
  seatsRemaining: number | null;
  sessionsCount: number;
  attendanceLabel: string;
  bookingReady: boolean;
  attendanceLink?: string | null;
  onBuy: () => void;
}

const LiveCourseMobileBottomBar = ({
  course,
  isConsultation,
  isEnrolled,
  isFull,
  seatsRemaining,
  sessionsCount,
  attendanceLabel,
  bookingReady,
  attendanceLink,
  onBuy,
}: Props) => {
  const { t } = useTranslation();
  const AttendanceIcon = course.attendance_type === "in_person" ? MapPin : Video;

  const buttonLabel = isConsultation
    ? bookingReady
      ? t("liveCourse.mobileBar.completeBooking")
      : t("liveCourse.mobileBar.chooseTimeFirst")
    : course.buy_button_text || (course.price > 0 ? t("liveCourse.mobileBar.bookNow") : t("liveCourse.mobileBar.registerFree"));

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white/80 backdrop-blur-lg border-t border-[#d7dce6] rounded-t-[20px] text-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-baseline gap-1">
              {course.price_before_discount && course.price_before_discount > course.price && (
                <span className="text-[11px] text-foreground/35 line-through">
                  {toAr(course.price_before_discount)}
                </span>
              )}
              <span className="text-xl font-medium text-foreground leading-none">
                {course.price > 0 ? toAr(course.price) : t("liveCourse.mobileBar.free")}
              </span>
              {course.price > 0 && <span className={`text-[11px] text-foreground/45 font-bold ${course.currency === "SAR" ? "product-sar-symbol" : ""}`}>{currencySymbol(course.currency)}</span>}
            </div>
            {course.price_before_discount && course.price_before_discount > course.price && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                {t("liveCourse.mobileBar.discount")} {toAr(Math.round(((course.price_before_discount - course.price) / course.price_before_discount) * 100))}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-foreground/50 font-medium">
            {isConsultation ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {toAr(course.session_duration_minutes || 30)} {t("liveCourse.mobileBar.minute")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {toAr(sessionsCount)} {t("liveCourse.mobileBar.lecture")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <AttendanceIcon className="w-3 h-3" />
              {attendanceLabel}
            </span>
            {!isConsultation && seatsRemaining != null && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {toAr(seatsRemaining)}
              </span>
            )}
          </div>
        </div>

        <div className="pb-3 px-[20px]">
          {isEnrolled ? (
            attendanceLink ? (
              <a href={attendanceLink} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <ExternalLink className="w-4 h-4 me-1.5" />
                  {isConsultation ? t("liveCourse.mobileBar.enterSession") : t("liveCourse.mobileBar.enterCourse")}
                </Button>
              </a>
            ) : (
              <Button disabled className="w-full h-[46px] text-sm font-bold rounded-2xl bg-green-500/90 text-white">
                {isConsultation ? t("liveCourse.mobileBar.confirmed") : t("liveCourse.mobileBar.enrolled")}
              </Button>
            )
          ) : isFull ? (
            <Button disabled className="w-full h-[46px] text-sm font-bold rounded-2xl">
              {t("liveCourse.mobileBar.full")}
            </Button>
          ) : (
            <Button
              disabled={isConsultation && !bookingReady}
              className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:opacity-60"
              onClick={() => onBuy()}
            >
              <ArrowRight className="w-4 h-4 me-1.5" />
              {buttonLabel}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/50 font-medium">
            <Shield className="w-3 h-3 text-green-500" />
            <span>{t("liveCourse.mobileBar.securePayment")}</span>
          </div>
          {course.price > 0 && <PaymentBadges currency={course.currency} imgClassName="h-4 object-contain" />}
        </div>
      </div>
    </div>
  );
};

export default LiveCourseMobileBottomBar;
