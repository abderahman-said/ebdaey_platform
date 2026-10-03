import React from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";

interface MentorMobileHeaderProps {
  onOpenSidebar: () => void;
}

export const MentorMobileHeader: React.FC<MentorMobileHeaderProps> = ({ onOpenSidebar }) => {
  const { t } = useTranslation();

  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border">
      <button
        onClick={onOpenSidebar}
        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
        aria-label={t("mentorSidebar.openMenu")}
      >
        <Menu className="w-5 h-5" />
      </button>
      <span className="font-bold text-sm">{t("mentorSidebar.dashboardTitle")}</span>
      <div className="w-10 h-10" />
    </div>
  );
};
