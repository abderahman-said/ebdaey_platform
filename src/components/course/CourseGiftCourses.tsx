import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import VideoThumbnail from "@/components/media/VideoThumbnail";
import OptimizedImage from "@/components/media/OptimizedImage";
import { toArPrice } from "@/lib/utils";
import { GiftDisplay, GIFT_KIND_LABEL } from "@/lib/giftItems";
import DOMPurify from "dompurify";

interface Props {
  giftCourses: GiftDisplay[];
  mentorPath: (path: string) => string;
}

const CourseGiftCourses = ({ giftCourses, mentorPath }: Props) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 px-3 sm:px-4 py-1 sm:py-2 rounded-full mb-3 sm:mb-4">
          <span className="text-base">🎁</span>
          <span className="text-xs sm:text-sm font-semibold text-primary">{t("coursePage.gifts.badge")}</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground">
          {t("coursePage.gifts.title")}
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {giftCourses.map((gc) => (
          <Link
            key={`${gc.kind}:${gc.id}`}
            to={mentorPath(gc.path)}
            className="group flex flex-col justify-between bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
          >
            <div className="h-40 gradient-primary relative">
              {gc.thumbnail_url ? (
                <OptimizedImage
                  src={gc.thumbnail_url}
                  alt={gc.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : gc.banner_type === "video" && gc.banner_video_url ? (
                <VideoThumbnail videoUrl={gc.banner_video_url} alt={gc.title} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-primary-foreground/50" />
                </div>
              )}
              <span className="absolute top-2 right-2 text-[10px] font-bold bg-background/90 text-foreground px-2 py-0.5 rounded-full backdrop-blur">
                {GIFT_KIND_LABEL[gc.kind]}
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                {gc.title}
              </h3>
              {gc.description && (
                <div
                  className="text-muted-foreground text-sm mb-4 line-clamp-2 prose prose-sm max-w-none [&_*]:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(gc.description || "") }}
                />
              )}
              <div className="flex items-center gap-2">
                {gc.price > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    {toArPrice(gc.price)}
                  </span>
                )}
                <span className="text-xl font-black text-green-600">{t("coursePage.gifts.free")}</span>
              </div>
            </div>
            <div className="px-5 pb-4">
              <Button className="w-full mt-3 gradient-primary text-primary-foreground border-0 rounded-full">
                {gc.card_button_text || t("coursePage.gifts.viewDefault")}
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CourseGiftCourses;
