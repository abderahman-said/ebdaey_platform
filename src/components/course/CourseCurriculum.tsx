import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Eye,
  Play,
  FileText,
  Headphones,
  Image,
  Type,
  Code2,
  Download,
  ListChecks,
  BookMarked,
  FileSpreadsheet,
  Video,
  Star,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toAr } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  is_preview: boolean;
}
interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

const iconCls = "w-3 h-3 text-muted-foreground/60 shrink-0";

const contentIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Play className={`${iconCls} fill-muted-foreground/50`} />;
    case "pdf":
      return <FileText className={iconCls} />;
    case "audio":
      return <Headphones className={iconCls} />;
    case "image":
      return <Image className={iconCls} />;
    case "text":
      return <Type className={iconCls} />;
    case "embed":
      return <Code2 className={iconCls} />;
    case "download":
      return <Download className={iconCls} />;
    case "quiz":
      return <ListChecks className={iconCls} />;
    case "epub":
      return <BookMarked className={iconCls} />;
    case "office":
      return <FileSpreadsheet className={iconCls} />;
    case "zoom":
      return <Video className={iconCls} />;
    case "featured_product":
      return <Star className={iconCls} />;
    case "upsell":
      return <Gift className={iconCls} />;
    default:
      return <BookOpen className={iconCls} />;
  }
};


interface Props {
  sections: Section[];
  isEnrolled: boolean;
  courseSlug: string;
  lessonUrl: (slug: string, lessonId?: string) => string;
  onPreview: (lessonId: string) => void;
}

const CourseCurriculum = ({ sections, isEnrolled, courseSlug, lessonUrl, onPreview }: Props) => {
  const { t } = useTranslation();

  const contentTypeLabel = (type: string) =>
    t(`coursePage.curriculum.contentTypes.${type}`, {
      defaultValue: t("coursePage.curriculum.contentTypes.default"),
    });



  return (
    <div id="section-curriculum" className="scroll-mt-20">
      <div className="text-center mb-6 sm:mb-8 lg:mb-12">
        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">{t("coursePage.curriculum.title")}</h2>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {sections.map((section, sectionIndex) => {
          const totalSeconds = section.lessons.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
          const totalMinutes = Math.floor(totalSeconds / 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const durationLabel =
            totalSeconds > 0
              ? hours > 0
                ? `${toAr(hours)} ${t("coursePage.curriculum.shortHour")} ${toAr(minutes)} ${t("coursePage.curriculum.shortMinute")}`
                : `${toAr(minutes)} ${t("coursePage.curriculum.shortMinute")}`
              : null;
          return (
            <div key={section.id} className="group">
              <div className="bg-white/80 border-border/30 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-[0_2px_12px_#00000008] border overflow-hidden transition-all duration-300">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 sm:p-4 lg:p-6 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-12 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base lg:text-lg">
                        {toAr(sectionIndex + 1)}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">{section.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>
                            {toAr(section.lessons.length)}{" "}
                            {section.lessons.length === 1
                              ? t("coursePage.curriculum.lesson")
                              : t("coursePage.curriculum.lessons")}
                          </span>
                          {durationLabel && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {durationLabel}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-start">
                      <span className="text-lg sm:text-xl lg:text-2xl font-black text-primary">
                        {toAr(section.lessons.length)}
                      </span>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t("coursePage.curriculum.lessonWord")}</p>
                    </div>
                  </div>
                </div>
                <div className="p-1 sm:p-2">
                  <ul className="space-y-1 sm:space-y-2">
                    {section.lessons.map((lesson, lessonIndex) => {
                      const isClickable = lesson.is_preview || isEnrolled;
                      const content = (
                        <div
                          className={`flex items-center gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 rounded-lg lg:rounded-2xl transition-all duration-200 ${isClickable ? "hover:bg-primary/5 cursor-pointer" : "hover:bg-muted/30 cursor-default"}`}
                        >
                          <div className="flex items-center gap-1.5 shrink-0 px-2 h-8 sm:h-9 lg:h-10 rounded-lg lg:rounded-xl bg-primary/5 text-muted-foreground group-hover/lesson:bg-primary/10 group-hover/lesson:text-primary transition-colors">
                            {contentIcon(lesson.content_type)}
                            <span className="text-xs sm:text-sm">
                              {toAr(lessonIndex + 1)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-medium text-foreground group-hover/lesson:text-primary transition-colors break-words">
                                {lesson.title}
                              </p>
                              {lesson.is_preview && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold border border-green-200">
                                  <Eye className="w-3 h-3" />
                                  {t("coursePage.curriculum.previewBadge")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <span>{contentTypeLabel(lesson.content_type)}</span>
                              {!!lesson.duration_seconds && lesson.duration_seconds > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {toAr(Math.floor(lesson.duration_seconds / 60))}:
                                  {toAr(String(lesson.duration_seconds % 60).padStart(2, "0"))}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                      return (
                        <li key={lesson.id} className="group/lesson">
                          {isEnrolled ? (
                            <Link to={lessonUrl(courseSlug, lesson.id)}>{content}</Link>
                          ) : lesson.is_preview ? (
                            <div onClick={() => onPreview(lesson.id)} className="cursor-pointer">
                              {content}
                            </div>
                          ) : (
                            content
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}

        {sections.length === 0 && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-8 sm:p-12 lg:p-16 text-center border border-border/30">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">{t("coursePage.curriculum.comingSoon")}</h3>
            <p className="text-sm text-muted-foreground">{t("coursePage.curriculum.comingSoonHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCurriculum;
