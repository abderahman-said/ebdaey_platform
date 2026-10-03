import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { Button } from "@/components/ui/button";
import InstallAppBanner from "@/components/pwa/InstallAppBanner";
import MentorTabSkeleton from "@/components/mentor/dashboard/skeletons/MentorTabSkeleton";
import type { AdvancedRangeValue } from "@/components/mentor/AdvancedDateRangePicker";
import { revenueUsd } from "@/components/mentor/dashboard/helpers";

// Eager imports for lightweight UI components
import MarketingPixels from "@/components/mentor/MarketingPixels";
import ChangePassword from "@/components/auth/ChangePassword";
import EditMyDataTab from "@/components/mentor/EditMyDataTab";
import MembershipCard from "@/components/mentor/MembershipCard";
import MentorUpcomingAppointments from "@/components/mentor/MentorUpcomingAppointments";

// Sidebar & Layout components
import { MentorSidebar } from "@/components/mentor/dashboard/sidebar/MentorSidebar";
import { MentorMobileHeader } from "@/components/mentor/dashboard/sidebar/MentorMobileHeader";
import { ImpersonationBanner } from "@/components/mentor/dashboard/sidebar/ImpersonationBanner";
import { MentorSitePreviewDialog } from "@/components/mentor/dashboard/sidebar/MentorSitePreviewDialog";

// Dashboard Data hook
import { useMentorDashboardData } from "@/components/mentor/dashboard/hooks/useMentorDashboardData";

// Per-tab components: lazy-loaded for optimal initial bundle size
const OverviewTab = lazy(() => import("@/components/mentor/dashboard/tabs/OverviewTab"));
const CoursesTab = lazy(() => import("@/components/mentor/dashboard/tabs/CoursesTab"));
const OrdersTab = lazy(() => import("@/components/mentor/dashboard/tabs/OrdersTab"));
const ProfileTab = lazy(() => import("@/components/mentor/dashboard/tabs/ProfileTab"));
const MentorSubscriptionsTab = lazy(() => import("@/components/mentor/dashboard/tabs/MentorSubscriptionsTab"));
const CertificateTemplateEditor = lazy(() => import("@/components/mentor/CertificateTemplateEditor"));
const DigitalProductsManager = lazy(() => import("@/components/mentor/DigitalProductsManager"));
const LiveCoursesManager = lazy(() => import("@/components/mentor/LiveCoursesManager"));
const MentorSchedulesManager = lazy(() => import("@/components/mentor/MentorSchedulesManager"));
const ReviewsManager = lazy(() => import("@/components/mentor/ReviewsManager"));
const SubscriptionPlansManager = lazy(() => import("@/components/mentor/SubscriptionPlansManager"));
const NotificationsManager = lazy(() => import("@/components/mentor/NotificationsManager"));
const TransactionsTab = lazy(() => import("@/components/mentor/TransactionsTab"));
const TransfersTab = lazy(() => import("@/components/mentor/TransfersTab"));
const CouponsTab = lazy(() => import("@/components/mentor/CouponsTab"));
const PromotionalOffersManager = lazy(() => import("@/components/mentor/PromotionalOffersManager"));
const PaymentGatewaysTab = lazy(() => import("@/components/mentor/dashboard/tabs/PaymentGatewaysTab"));
const SettingsTab = lazy(() => import("@/components/mentor/dashboard/tabs/SettingsTab"));
const StudentsTab = lazy(() => import("@/components/mentor/dashboard/tabs/StudentsTab"));
const WithdrawalsTab = lazy(() => import("@/components/mentor/dashboard/tabs/WithdrawalsTab"));

const MentorDashboard = () => {
  const { t } = useTranslation();
  const locationForTab = useLocation();
  const navigateForTab = useNavigate();
  const activeTab = new URLSearchParams(locationForTab.search).get("tab") || "overview";

  // Keep visited tabs mounted in memory for instant 0ms tab switching without flashing or unmounting
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editorInitialTab, setEditorInitialTab] = useState<string | undefined>(undefined);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [, setEditingLiveCourseId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sitePreviewDialogOpen, setSitePreviewDialogOpen] = useState(false);

  const [overviewDateRange, setOverviewDateRange] = useState<AdvancedRangeValue>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return { from, to, compare: null, presetId: "last24h" };
  });

  const setActiveTab = (tab: string) => {
    setEditingCourseId(null);
    setEditorInitialTab(undefined);
    setEditingProductId(null);
    setEditingLiveCourseId(null);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    navigateForTab({ search: params.toString() }, { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const {
    user,
    isLoading,
    isImpersonating,
    impersonatedMentorName,
    tenantId,
    tenantSlug,
    setTenantSlug,
    dataLoaded,
    courses,
    setCourses,
    students,
    setStudents,
    orders,
    coupons,
    setCoupons,
    transactions,
    digitalProducts,
    pageViews,
    totalRevenue,
    totalGatewayFees,
    availableBalance,
    usdBalance,
    paidUsd,
    totalWithdrawn,
    totalWithdrawnUsd,
    profileName,
    setProfileName,
    personalName,
    setPersonalName,
    profileBio,
    setProfileBio,
    profileWhatsapp,
    setProfileWhatsapp,
    profileSpecialty,
    setProfileSpecialty,
    whatsappDefaultColor,
    profileImageUrl,
    coverImageUrl,
    primaryColor,
    setPrimaryColor,
    publicLanguage,
    setPublicLanguage,
    uploadingProfile,
    uploadingCover,
    uploadImage,
    withdrawalLegalName,
    setWithdrawalLegalName,
    withdrawalAddress,
    setWithdrawalAddress,
    withdrawalAccountType,
    setWithdrawalAccountType,
    withdrawalBeneficiaryName,
    setWithdrawalBeneficiaryName,
    withdrawalBankName,
    setWithdrawalBankName,
    withdrawalIban,
    setWithdrawalIban,
    withdrawalSettingsStatus,
    withdrawalRejectionReason,
    withdrawalNationalIdFront,
    withdrawalNationalIdBack,
    uploadNationalId,
    saveWithdrawalSettings,
    darkMode,
    toggleDarkMode,
    saveDashboardLanguage,
    handleSignOut,
    loadTenantData,
    refreshOrders,
  } = useMentorDashboardData(activeTab);

  if (isLoading || (user && !dataLoaded)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopLoadingBar />
        <div className="flex-1 container py-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-28 bg-muted rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
          </div>
          <div className="h-64 bg-muted/30 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user && !isImpersonating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("auth.toast.loginRequired")}</p>
          <Button onClick={() => navigateForTab("/auth")}>{t("auth.actions.login")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <InstallAppBanner />
      {isImpersonating && <ImpersonationBanner mentorName={impersonatedMentorName} />}

      <div className="flex flex-1">
        <MentorSidebar
          activeTab={activeTab}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          profileImageUrl={profileImageUrl}
          profileName={profileName}
          personalName={personalName}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          saveDashboardLanguage={saveDashboardLanguage}
          handleSignOut={handleSignOut}
          onOpenSitePreview={() => setSitePreviewDialogOpen(true)}
          onNavigateTab={setActiveTab}
        />

        <MentorSitePreviewDialog
          open={sitePreviewDialogOpen}
          onOpenChange={setSitePreviewDialogOpen}
          tenantSlug={tenantSlug}
        />

        <main
          className="flex-1 min-h-screen overflow-auto bg-white dark:bg-background"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            animation: "grid-move 20s linear infinite",
          }}
        >
          <MentorMobileHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />

          <div className="p-6 lg:p-8 max-w-[1350px] mx-auto">
            <Suspense fallback={<MentorTabSkeleton tab={activeTab} />}>
              {!dataLoaded ? (
                <MentorTabSkeleton tab={activeTab} />
              ) : (
                <>
                  {visitedTabs.has("overview") && (
                    <div key="overview" className={activeTab === "overview" ? "block" : "hidden"}>
                      <OverviewTab
                        orders={orders}
                        pageViews={pageViews}
                        availableBalance={availableBalance}
                        usdBalance={usdBalance}
                        profileName={profileName}
                        setActiveTab={setActiveTab}
                        overviewDateRange={overviewDateRange}
                        setOverviewDateRange={setOverviewDateRange}
                      />
                    </div>
                  )}

                  {visitedTabs.has("courses") && (
                    <div key="courses" className={activeTab === "courses" ? "block" : "hidden"}>
                      <CoursesTab
                        courses={courses}
                        setCourses={setCourses}
                        tenantId={tenantId || ""}
                        tenantSlug={tenantSlug}
                        editingCourseId={editingCourseId}
                        setEditingCourseId={setEditingCourseId}
                        editorInitialTab={editorInitialTab}
                        setEditorInitialTab={setEditorInitialTab}
                        onReloadTenantData={loadTenantData}
                      />
                    </div>
                  )}

                  {visitedTabs.has("orders") && (
                    <div key="orders" className={activeTab === "orders" ? "block" : "hidden"}>
                      <OrdersTab orders={orders} onDeleted={refreshOrders} />
                    </div>
                  )}

                  {visitedTabs.has("students") && (
                    <div key="students" className={activeTab === "students" ? "block" : "hidden"}>
                      <StudentsTab students={students} setStudents={setStudents} />
                    </div>
                  )}

                  {visitedTabs.has("coupons") && (
                    <div key="coupons" className={activeTab === "coupons" ? "block" : "hidden"}>
                      <CouponsTab
                        tenantId={tenantId || ""}
                        courses={courses}
                        digitalProducts={digitalProducts}
                        coupons={coupons}
                        setCoupons={setCoupons}
                      />
                    </div>
                  )}

                  {visitedTabs.has("transactions") && (
                    <div key="transactions" className={activeTab === "transactions" ? "block" : "hidden"}>
                      <TransactionsTab transactions={transactions as any} />
                    </div>
                  )}

                  {visitedTabs.has("transfers") && (
                    <div key="transfers" className={activeTab === "transfers" ? "block" : "hidden"}>
                      <TransfersTab
                        tenantId={tenantId || ""}
                        tenantSlug={tenantSlug}
                        totalRevenue={totalRevenue}
                        totalWithdrawn={totalWithdrawn}
                        totalGatewayFees={totalGatewayFees}
                        availableBalance={availableBalance}
                        usdBalance={usdBalance}
                        usdRevenue={paidUsd.reduce((a, o) => a + revenueUsd(o), 0)}
                        usdWithdrawn={totalWithdrawnUsd}
                      />
                    </div>
                  )}

                  {visitedTabs.has("withdrawals") && (
                    <div key="withdrawals" className={activeTab === "withdrawals" ? "block" : "hidden"}>
                      <WithdrawalsTab
                        tenantId={tenantId}
                        totalRevenue={totalRevenue}
                        totalWithdrawn={totalWithdrawn}
                        withdrawalSettingsStatus={withdrawalSettingsStatus}
                        withdrawalRejectionReason={withdrawalRejectionReason}
                        withdrawalLegalName={withdrawalLegalName}
                        setWithdrawalLegalName={setWithdrawalLegalName}
                        withdrawalAddress={withdrawalAddress}
                        setWithdrawalAddress={setWithdrawalAddress}
                        withdrawalAccountType={withdrawalAccountType}
                        setWithdrawalAccountType={setWithdrawalAccountType}
                        withdrawalBeneficiaryName={withdrawalBeneficiaryName}
                        setWithdrawalBeneficiaryName={setWithdrawalBeneficiaryName}
                        withdrawalBankName={withdrawalBankName}
                        setWithdrawalBankName={setWithdrawalBankName}
                        withdrawalIban={withdrawalIban}
                        setWithdrawalIban={setWithdrawalIban}
                        withdrawalNationalIdFront={withdrawalNationalIdFront}
                        withdrawalNationalIdBack={withdrawalNationalIdBack}
                        uploadNationalId={uploadNationalId}
                        saveWithdrawalSettings={saveWithdrawalSettings}
                      />
                    </div>
                  )}

                  {visitedTabs.has("profile") && (
                    <div key="profile" className={activeTab === "profile" ? "block" : "hidden"}>
                      <ProfileTab
                        tenantId={tenantId || ""}
                        tenantSlug={tenantSlug}
                        setTenantSlug={setTenantSlug}
                        profileName={profileName}
                        setProfileName={setProfileName}
                        profileBio={profileBio}
                        setProfileBio={setProfileBio}
                        profileWhatsapp={profileWhatsapp}
                        setProfileWhatsapp={setProfileWhatsapp}
                        profileSpecialty={profileSpecialty}
                        setProfileSpecialty={setProfileSpecialty}
                        whatsappDefaultColor={whatsappDefaultColor}
                        profileImageUrl={profileImageUrl}
                        coverImageUrl={coverImageUrl}
                        primaryColor={primaryColor}
                        setPrimaryColor={setPrimaryColor}
                        publicLanguage={publicLanguage}
                        setPublicLanguage={setPublicLanguage}
                        uploadImage={uploadImage}
                        uploadingProfile={uploadingProfile}
                        uploadingCover={uploadingCover}
                      />
                    </div>
                  )}

                  {visitedTabs.has("marketing") && tenantId && (
                    <div key="marketing" className={activeTab === "marketing" ? "block" : "hidden"}>
                      <MarketingPixels tenantId={tenantId} />
                    </div>
                  )}

                  {visitedTabs.has("reviews") && tenantId && (
                    <div key="reviews" className={activeTab === "reviews" ? "block" : "hidden"}>
                      <ReviewsManager tenantId={tenantId} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
                    </div>
                  )}

                  {visitedTabs.has("plans") && tenantId && (
                    <div key="plans" className={activeTab === "plans" ? "block" : "hidden"}>
                      <SubscriptionPlansManager tenantId={tenantId} />
                    </div>
                  )}

                  {visitedTabs.has("subscriptions") && tenantId && (
                    <div key="subscriptions" className={activeTab === "subscriptions" ? "block" : "hidden"}>
                      <MentorSubscriptionsTab tenantId={tenantId} courses={courses} />
                    </div>
                  )}

                  {visitedTabs.has("payment-gateways") && (
                    <div key="payment-gateways" className={activeTab === "payment-gateways" ? "block" : "hidden"}>
                      <PaymentGatewaysTab />
                    </div>
                  )}

                  {visitedTabs.has("digital-products") && tenantId && (
                    <div key="digital-products" className={activeTab === "digital-products" ? "block" : "hidden"}>
                      <DigitalProductsManager
                        tenantId={tenantId}
                        tenantSlug={tenantSlug}
                        externalEditingId={editingProductId}
                        onEditingChange={setEditingProductId}
                      />
                    </div>
                  )}

                  {visitedTabs.has("live-courses") && tenantId && (
                    <div key="live-courses" className={activeTab === "live-courses" ? "block" : "hidden"}>
                      <LiveCoursesManager tenantId={tenantId} tenantSlug={tenantSlug} filterType="live_course" />
                    </div>
                  )}

                  {visitedTabs.has("consultations") && tenantId && (
                    <div key="consultations" className={activeTab === "consultations" ? "block" : "hidden"}>
                      <LiveCoursesManager tenantId={tenantId} tenantSlug={tenantSlug} filterType="consultation" />
                    </div>
                  )}

                  {visitedTabs.has("session-bundles") && tenantId && (
                    <div key="session-bundles" className={activeTab === "session-bundles" ? "block" : "hidden"}>
                      <LiveCoursesManager tenantId={tenantId} tenantSlug={tenantSlug} filterType="session_bundle" />
                    </div>
                  )}

                  {visitedTabs.has("schedules") && tenantId && (
                    <div key="schedules" className={activeTab === "schedules" ? "block" : "hidden"}>
                      <MentorSchedulesManager tenantId={tenantId} />
                    </div>
                  )}

                  {visitedTabs.has("upcoming-appointments") && tenantId && (
                    <div key="upcoming-appointments" className={activeTab === "upcoming-appointments" ? "block" : "hidden"}>
                      <MentorUpcomingAppointments tenantId={tenantId} />
                    </div>
                  )}

                  {visitedTabs.has("promotional-offers") && tenantId && (
                    <div key="promotional-offers" className={activeTab === "promotional-offers" ? "block" : "hidden"}>
                      <div className="max-w-4xl mx-auto w-full">
                        <PromotionalOffersManager tenantId={tenantId} />
                      </div>
                    </div>
                  )}

                  {visitedTabs.has("notifications") && tenantId && (
                    <div key="notifications" className={activeTab === "notifications" ? "block" : "hidden"}>
                      <div className="max-w-4xl mx-auto w-full">
                        <NotificationsManager tenantId={tenantId} />
                      </div>
                    </div>
                  )}

                  {visitedTabs.has("certificate") && tenantId && (
                    <div key="certificate" className={activeTab === "certificate" ? "block" : "hidden"}>
                      <CertificateTemplateEditor
                        tenantId={tenantId}
                        mentorName={profileName}
                        certificateLanguage={publicLanguage}
                      />
                    </div>
                  )}

                  {visitedTabs.has("edit-my-data") && tenantId && (
                    <div key="edit-my-data" className={activeTab === "edit-my-data" ? "block" : "hidden"}>
                      <EditMyDataTab tenantId={tenantId} onPersonalNameChange={(name) => setPersonalName(name)} />
                    </div>
                  )}

                  {visitedTabs.has("membership") && (
                    <div key="membership" className={activeTab === "membership" ? "block" : "hidden"}>
                      <MembershipCard />
                    </div>
                  )}

                  {visitedTabs.has("change-password") && (
                    <div key="change-password" className={activeTab === "change-password" ? "block" : "hidden"}>
                      <ChangePassword />
                    </div>
                  )}

                  {visitedTabs.has("settings") && (
                    <div key="settings" className={activeTab === "settings" ? "block" : "hidden"}>
                      <SettingsTab
                        withdrawalLegalName={withdrawalLegalName}
                        setWithdrawalLegalName={setWithdrawalLegalName}
                        withdrawalIban={withdrawalIban}
                        setWithdrawalIban={setWithdrawalIban}
                        saveWithdrawalSettings={saveWithdrawalSettings}
                      />
                    </div>
                  )}
                </>
              )}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MentorDashboard;
