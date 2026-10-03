import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import mentorDashboardLogo from "@/assets/logo-auth-black.png.asset.json";
import mentorDashboardLogoEn from "@/assets/logo-ebdaey-english-black.png.asset.json";
import { navGroups, itemMatchesTab, type NavItemDef } from "../navConfig";
import { MentorAccountDock } from "./MentorAccountDock";
import type { Language } from "@/i18n";

interface MentorSidebarProps {
  activeTab: string;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  profileImageUrl: string;
  profileName: string;
  personalName: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  saveDashboardLanguage: (lang: Language) => void;
  handleSignOut: () => void;
  onOpenSitePreview: () => void;
  onNavigateTab: (tab: string) => void;
}

export const MentorSidebar: React.FC<MentorSidebarProps> = ({
  activeTab,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  profileImageUrl,
  profileName,
  personalName,
  darkMode,
  toggleDarkMode,
  saveDashboardLanguage,
  handleSignOut,
  onOpenSitePreview,
  onNavigateTab,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const renderDock = (mobile: boolean) => (
    <MentorAccountDock
      mobile={mobile}
      profileImageUrl={profileImageUrl}
      profileName={profileName}
      personalName={personalName}
      activeTab={activeTab}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      saveDashboardLanguage={saveDashboardLanguage}
      handleSignOut={handleSignOut}
      onOpenSitePreview={onOpenSitePreview}
      onNavigateTab={onNavigateTab}
      onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
    />
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`mentor-obsidian-sidebar fixed inset-y-0 right-0 overflow-y-auto z-50 w-64 glass-sidebar shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:relative lg:translate-x-0 lg:flex flex-col`}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src={isEn ? mentorDashboardLogoEn.url : mentorDashboardLogo.url}
              alt="ebdaey"
              className="h-9 dark:invert"
            />
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.key}
              className={groupIndex > 0 ? "mt-1.5 pt-1.5 border-t border-sidebar-border/50" : ""}
            >
              {group.key !== "home" && <p className="sidebar-section-label">{t(group.labelKey)}</p>}
              <div className="space-y-0.5">
                {group.items.map((item: NavItemDef) => (
                  <Link
                    key={item.key}
                    to={`?tab=${item.key}`}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`sidebar-nav-item w-full flex items-center justify-between py-1 ${
                      itemMatchesTab(item, activeTab)
                        ? "sidebar-nav-item-active"
                        : "sidebar-nav-item-inactive"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="mentor-nav-icon-shell">
                        <item.icon className="w-[18px] h-[18px] sidebar-icon" />
                      </span>
                      {t(item.labelKey)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mx-3 mb-2 border-t border-sidebar-border pt-2">{renderDock(true)}</div>
      </aside>

      {/* Desktop Sidebar — expanded with accordion groups */}
      <aside className="mentor-obsidian-sidebar hidden lg:flex sticky top-0 h-screen shrink-0 z-40">
        <div className="w-64 h-full border-l border-sidebar-border flex flex-col py-3 order-1">
          <a
            href="https://ebdaey.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 px-5 flex items-center justify-start h-9"
          >
            <img
              src={isEn ? mentorDashboardLogoEn.url : mentorDashboardLogo.url}
              alt="ebdaey"
              className="h-7 w-auto object-contain dark:invert"
            />
          </a>

          <div className="mentor-sidebar-scroll flex-1 overflow-y-auto px-3 space-y-1.5">
            {navGroups.map((group, groupIndex) => (
              <div
                key={group.key}
                className={groupIndex > 0 ? "pt-1.5 border-t border-sidebar-border/50" : ""}
              >
                {group.key !== "home" && <p className="sidebar-section-label">{t(group.labelKey)}</p>}
                <div className="space-y-0.5">
                  {group.items.map((item: NavItemDef) => (
                    <Link
                      key={item.key}
                      to={`?tab=${item.key}`}
                      className={`mentor-sidebar-item w-full flex items-center gap-2.5 px-2 py-1 rounded-md text-[13px] transition-colors duration-200 ${
                        itemMatchesTab(item, activeTab) ? "is-active font-semibold" : ""
                      }`}
                    >
                      <span className="mentor-nav-icon-shell">
                        <item.icon className="w-[17px] h-[17px] shrink-0" />
                      </span>
                      <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-0 rounded-lg bg-muted/30 px-2 pt-1">{renderDock(false)}</div>
        </div>
      </aside>
    </>
  );
};
