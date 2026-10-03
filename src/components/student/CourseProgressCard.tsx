import { Link } from "react-router-dom";
import { BookOpen, Play, Award, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import CourseCertificate from "./CourseCertificate";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import OptimizedImage from "@/components/media/OptimizedImage";
import { toAr } from "@/lib/utils";

interface CourseProgressCardProps {
  mentorSlug: string;
  courseSlug: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  studentName: string;
  mentorName: string;
  completionDate?: string | null;
  certificateId?: string;
  tenantId: string;
}

const CourseProgressCard = ({
  mentorSlug, courseSlug, courseTitle, thumbnailUrl,
  totalLessons, completedLessons, studentName, mentorName,
  completionDate, certificateId, tenantId,
}: CourseProgressCardProps) => {
  const { t } = useTranslation();
  const urls = useMentorUrls(mentorSlug);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isCompleted = progress === 100;

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all group">
      {/* Thumbnail */}
      <div className="h-36 relative overflow-hidden">
        {thumbnailUrl ? (
          <OptimizedImage
            src={thumbnailUrl}
            alt={courseTitle}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary/30" />
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-3 left-3 bg-success text-success-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
            <CheckCircle className="w-3 h-3" />
            {t("miscPublic.studentDashboard.courseCard.completed")}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg mb-1 line-clamp-2">{courseTitle}</h3>

        {/* Progress info */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            {t("miscPublic.studentDashboard.courseCard.lessonsProgress", { done: toAr(completedLessons), total: toAr(totalLessons) })}
          </span>
          <span
            className={`font-bold ${
              isCompleted ? "text-success" : progress > 50 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {toAr(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link to={urls.lessonUrl(courseSlug)} className="flex-1">
            <Button
              className={`w-full ${
                isCompleted
                  ? "bg-success hover:bg-success/90 text-success-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <Play className="w-4 h-4 ml-2" />
              {isCompleted ? t("miscPublic.studentDashboard.courseCard.reviewCourse") : t("miscPublic.studentDashboard.courseCard.continueLearning")}
            </Button>
          </Link>

          {isCompleted && completionDate && certificateId && (
            <CourseCertificate
              studentName={studentName}
              courseName={courseTitle}
              mentorName={mentorName}
              completionDate={completionDate}
              certificateId={certificateId}
              tenantId={tenantId}
              mentorSlug={mentorSlug}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseProgressCard;
