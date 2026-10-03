import { Award, RefreshCw, MessageCircle, Users, Star, icons as lucideIcons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  course: any;
  landingFeatures: { text: string; icon: string }[];
}

const CourseFeatureBadges = ({ course, landingFeatures }: Props) => {
  const { t } = useTranslation();
  const badges = [
    { enabled: course.has_certificate, icon: Award, label: t("coursePage.features.certificate") },
    { enabled: course.has_lifetime_updates, icon: RefreshCw, label: t("coursePage.features.lifetimeUpdates") },
    { enabled: course.has_community, icon: MessageCircle, label: t("coursePage.features.community") },
    { enabled: course.has_individual_support, icon: Users, label: t("coursePage.features.individualSupport") },
  ].filter((b) => b.enabled);

  return (
    <>
      {landingFeatures.length > 0 && (
        <div
          id="section-features"
          className="scroll-mt-20 flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto"
        >
          {landingFeatures.map((feature, index) => {
            const FeatureIcon =
              (lucideIcons as Record<string, LucideIcon>)[feature.icon] || Star;
            return (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white/70 border-border/30 shadow-[0_2px_12px_#00000008]"
              >
                <FeatureIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white/70 border-border/30 shadow-[0_2px_12px_#00000008]"
            >
              <badge.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{badge.label}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default CourseFeatureBadges;
