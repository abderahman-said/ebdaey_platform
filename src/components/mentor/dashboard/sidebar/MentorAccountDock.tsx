import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Languages,
  Sun,
  Moon,
  LogOut,
  Eye,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PlatformAnnouncementsBell from "@/components/mentor/PlatformAnnouncementsBell";
import { accountNavItems } from "../navConfig";
import type { Language } from "@/i18n";

interface MentorAccountDockProps {
  mobile?: boolean;
  profileImageUrl: string;
  profileName: string;
  personalName: string;
  activeTab: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  saveDashboardLanguage: (lang: Language) => void;
  handleSignOut: () => void;
  onOpenSitePreview: () => void;
  onNavigateTab: (tab: string) => void;
  onCloseMobileSidebar?: () => void;
}

export const MentorAccountDock: React.FC<MentorAccountDockProps> = ({
  mobile = false,
  profileImageUrl,
  profileName,
  personalName,
  activeTab,
  darkMode,
  toggleDarkMode,
  saveDashboardLanguage,
  handleSignOut,
  onOpenSitePreview,
  onNavigateTab,
  onCloseMobileSidebar,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const displayName = profileName || personalName || t("overview.defaultMentor");

  return (
    <div className="mentor-account-dock flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="mentor-account-card h-9 w-full justify-between gap-2 rounded-full border border-sidebar-border/60 bg-sidebar px-3 py-1.5 text-sidebar-foreground shadow-sm transition-colors hover:bg-sidebar-accent"
            aria-label={t("mentorSidebar.accountMenu")}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative shrink-0">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-bold text-foreground">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    displayName.trim().charAt(0).toUpperCase()
                  )}
                </span>
              </span>
              <span className="block truncate py-0.5 text-xs font-normal leading-4 text-sidebar-foreground">
                {displayName}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={10}
          className="mentor-account-menu w-[264px] p-1.5"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("mentorSidebar.accountMenu")}
          </p>
          {accountNavItems.map((item) => (
            <Link
              key={item.key}
              to={`?tab=${item.key}`}
              onClick={() => {
                if (mobile && onCloseMobileSidebar) onCloseMobileSidebar();
              }}
              className={`mentor-account-menu-item ${activeTab === item.key ? "bg-muted text-foreground" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          ))}
          <button
            type="button"
            className="mentor-account-menu-item"
            onClick={() => saveDashboardLanguage(isEn ? "ar" : "en")}
          >
            <Languages className="h-4 w-4" />
            <span>{t("common.language")}</span>
            <span className="ms-auto text-xs text-muted-foreground">{isEn ? "العربية" : "English"}</span>
          </button>
          <button
            type="button"
            id={mobile ? "mobile-theme-toggle" : "desktop-theme-toggle"}
            onClick={toggleDarkMode}
            className="mentor-account-menu-item"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{darkMode ? t("mentorSidebar.lightMode") : t("mentorSidebar.darkMode")}</span>
          </button>
          <div className="my-1.5 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              handleSignOut();
              if (mobile && onCloseMobileSidebar) onCloseMobileSidebar();
            }}
            className="mentor-account-menu-item text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("mentorSidebar.logout")}</span>
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3 grid h-9 grid-cols-4 overflow-hidden rounded-full border border-sidebar-border bg-sidebar shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className="col-span-3 h-9 justify-center gap-1.5 rounded-none border-e border-sidebar-border bg-sidebar px-2 text-xs font-normal text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-[0.98]"
            aria-label={t("mentorSidebar.previewSite")}
            title={t("mentorSidebar.previewSite")}
            onClick={() => {
              onOpenSitePreview();
              if (mobile && onCloseMobileSidebar) onCloseMobileSidebar();
            }}
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("mentorSidebar.previewSite")}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-none p-0 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-[0.96]"
            aria-label={t("mentorSidebar.tabs.profile")}
            title={t("mentorSidebar.tabs.profile")}
            onClick={() => {
              onNavigateTab("profile");
              if (mobile && onCloseMobileSidebar) onCloseMobileSidebar();
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <PlatformAnnouncementsBell variant="dock" />
      </div>
    </div>
  );
};
