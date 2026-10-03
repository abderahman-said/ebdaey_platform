import { BookOpen, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import BannerAutoplayVideo from "@/components/media/BannerAutoplayVideo";
import OptimizedImage from "@/components/media/OptimizedImage";
import { toAr } from "@/lib/utils";

interface Props {
  course: any;
  lessonsCount: number;
  totalDurationSeconds: number;
}

const CourseHero = ({ course, lessonsCount, totalDurationSeconds }: Props) => {
  const { t } = useTranslation();
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

  const stats = [
    { icon: BookOpen, value: toAr(lessonsCount), label: t("coursePage.hero.lecture") },
    { icon: Clock, value: toAr(durationValue), label: "" },
  ];

  return (
    <div id="section-about" className="scroll-mt-20 space-y-6 sm:space-y-8 lg:space-y-12">
      <div className="rounded-2xl lg:rounded-3xl overflow-hidden aspect-video bg-muted shadow-[0_2px_12px_#00000008] lg:shadow-2xl relative group max-w-2xl mx-auto">
        {course.banner_type === "video" && course.banner_video_url ? (
          <BannerAutoplayVideo src={course.banner_video_url} poster={course.thumbnail_url || undefined} />
        ) : course.thumbnail_url ? (
          <>
            <OptimizedImage
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-primary/30" />
          </div>
        )}
      </div>
      <div>
        {course.landing_header && (
          <h2
            className="text-base sm:text-lg lg:text-xl font-bold mb-4 sm:mb-6 leading-tight"
            style={{ color: course.landing_header_color || "#000" }}
          >
            {course.landing_header}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white/60 border-border/30 backdrop-blur-sm rounded-lg p-2 text-center border flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-tight">
                {stat.value} {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-black mb-3 sm:mb-4 leading-tight">{course.title}</h1>
        {course.landing_subheader && (
          <p
            className="text-base leading-relaxed max-w-2xl mx-auto px-4 font-medium"
            style={{ color: course.landing_subheader_color || undefined }}
          >
            {course.landing_subheader}
          </p>
        )}
      </div>
    </div>
  );
};

export default CourseHero;
