import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import RichTextContent from "@/components/common/RichTextContent";

type DescriptionKind = "course" | "product" | "consultation";

interface Props {
  course: any;
  kind?: DescriptionKind;
}

const detectKind = (course: any): DescriptionKind => {
  const type = course?.product_type;
  if (type === "consultation") return "consultation";
  if (type === "course" || type === "live_course") return "course";
  return "product";
};

const CourseDescription = ({ course, kind }: Props) => {
  const { t, i18n } = useTranslation();
  if (!course.description) return null;
  const isEn = i18n.language === "en";

  const resolvedKind = kind ?? detectKind(course);
  const title = t(`coursePage.description.titleByType.${resolvedKind}`);

  return (
    <div className="bg-white/70 border-border/30 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_2px_12px_#00000008] border">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-12 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-primary/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("coursePage.description.subtitle")}</p>
        </div>
      </div>
      <RichTextContent
        html={course.description}
        className={`text-muted-foreground leading-relaxed ${isEn ? "text-start" : "text-end"} prose prose-sm sm:prose-base lg:prose-lg max-w-none [&_*]:text-muted-foreground`}
      />
    </div>
  );
};

export default CourseDescription;
