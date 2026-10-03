import { Toaster } from "@/components/ui/toaster";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useTranslation } from "react-i18next";
import { isRtl } from "@/i18n";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, prefetchMentor, prefetchCourse } from "@/lib/queries";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { NoIndex } from "@/components/common/NoIndex";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import TopLoadingBar from "./components/common/TopLoadingBar";
import FaviconSwitcher from "./components/common/FaviconSwitcher";
import { onPageReady } from "./hooks/usePageReady";
import { getSubdomainInfo } from "@/lib/subdomain";
import { LanguageRouteScope } from "@/i18n/LanguageRouteScope";
import { MentorPublicLanguageLoader } from "@/i18n/MentorPublicLanguageLoader";
import MentorPwaIdentity from "@/components/pwa/MentorPwaIdentity";
import PaymentResultErrorBoundary from "@/components/checkout/PaymentResultErrorBoundary";

// Lazy load non-critical UI
const WhatsAppButton = lazy(() => import("./components/common/WhatsAppButton"));

// Landing page is heavy (pulls in GSAP + ScrollTrigger). Lazy-load so mentor
// subdomains, dashboards, and admin routes don't pay its bundle cost.
const Index = lazy(() => import("./pages/public/Index"));

// Lazy load all other pages — store import functions for preloading
const pageImports = {
  MentorProfile: () => import("./pages/mentor/MentorProfile"),
  CoursePage: () => import("./pages/course/CoursePage"),
  CheckoutPage: () => import("./pages/checkout/CheckoutPage"),
  PaymentResult: () => import("./pages/checkout/PaymentResult"),
  LessonViewer: () => import("./pages/course/LessonViewer"),
  ContentBankPage: () => import("./pages/public/ContentBankPage"),
  MentorDashboard: () => import("./pages/mentor/MentorDashboard"),
  StudentDashboard: () => import("./pages/student/StudentDashboard"),
  AdminDashboard: () => import("./pages/admin/AdminDashboard"),
  AuthPage: () => import("./pages/auth/AuthPage"),
  ResetPassword: () => import("./pages/auth/ResetPassword"),
  NotFound: () => import("./pages/public/NotFound"),
  PrivacyPolicy: () => import("./pages/legal/PrivacyPolicy"),
  TermsConditions: () => import("./pages/legal/TermsConditions"),
  RefundPolicy: () => import("./pages/legal/RefundPolicy"),
  ContactUs: () => import("./pages/public/ContactUs"),
  AboutUs: () => import("./pages/public/AboutUs"),
  CountryLanding: () => import("./pages/public/CountryLanding"),
  DeliveryPolicy: () => import("./pages/legal/DeliveryPolicy"),
  ZoomIntegration: () => import("./pages/legal/ZoomIntegration"),
  DigitalProductPage: () => import("./pages/public/DigitalProductPage"),
  DigitalProductCheckoutPage: () => import("./pages/public/DigitalProductCheckoutPage"),
  DigitalProductPaymentPage: () => import("./pages/public/DigitalProductPaymentPage"),
  DigitalProductDeliveryPage: () => import("./pages/public/DigitalProductDeliveryPage"),
  LiveCoursePage: () => import("./pages/course/LiveCoursePage"),
  LiveCourseCheckoutPage: () => import("./pages/course/LiveCourseCheckoutPage"),
  LiveCoursePaymentPage: () => import("./pages/course/LiveCoursePaymentPage"),
  SessionBundleBookingPage: () => import("./pages/course/SessionBundleBookingPage"),
  VerifyCertificate: () => import("./pages/public/VerifyCertificate"),
  ZoomOAuthCallback: () => import("./pages/legal/ZoomOAuthCallback"),
  SubscriptionCheckoutPage: () => import("./pages/checkout/SubscriptionCheckoutPage"),
  SubscriptionPaymentPage: () => import("./pages/checkout/SubscriptionPaymentPage"),


};

const MentorProfile = lazy(pageImports.MentorProfile);
const CoursePage = lazy(pageImports.CoursePage);
const CheckoutPage = lazy(pageImports.CheckoutPage);
const PaymentResult = lazy(pageImports.PaymentResult);
const LessonViewer = lazy(pageImports.LessonViewer);
const ContentBankPage = lazy(pageImports.ContentBankPage);
const MentorDashboard = lazy(pageImports.MentorDashboard);
const StudentDashboard = lazy(pageImports.StudentDashboard);
const AdminDashboard = lazy(pageImports.AdminDashboard);
const AuthPage = lazy(pageImports.AuthPage);
const ResetPassword = lazy(pageImports.ResetPassword);
const NotFound = lazy(pageImports.NotFound);
const PrivacyPolicy = lazy(pageImports.PrivacyPolicy);
const TermsConditions = lazy(pageImports.TermsConditions);
const RefundPolicy = lazy(pageImports.RefundPolicy);
const ContactUs = lazy(pageImports.ContactUs);
const AboutUs = lazy(pageImports.AboutUs);
const CountryLanding = lazy(pageImports.CountryLanding);
const DeliveryPolicy = lazy(pageImports.DeliveryPolicy);
const ZoomIntegration = lazy(pageImports.ZoomIntegration);
const DigitalProductPage = lazy(pageImports.DigitalProductPage);
const DigitalProductCheckoutPage = lazy(pageImports.DigitalProductCheckoutPage);
const DigitalProductPaymentPage = lazy(pageImports.DigitalProductPaymentPage);
const DigitalProductDeliveryPage = lazy(pageImports.DigitalProductDeliveryPage);
const LiveCoursePage = lazy(pageImports.LiveCoursePage);
const LiveCourseCheckoutPage = lazy(pageImports.LiveCourseCheckoutPage);
const LiveCoursePaymentPage = lazy(pageImports.LiveCoursePaymentPage);
const SessionBundleBookingPage = lazy(pageImports.SessionBundleBookingPage);
const VerifyCertificate = lazy(pageImports.VerifyCertificate);
const ZoomOAuthCallback = lazy(pageImports.ZoomOAuthCallback);
const SubscriptionCheckoutPage = lazy(pageImports.SubscriptionCheckoutPage);
const SubscriptionPaymentPage = lazy(pageImports.SubscriptionPaymentPage);

const preloadRoute = (pathname: string) => {
  const currentHost = typeof window !== "undefined" ? window.location.host.toLowerCase() : "";
  if (pathname === "/") {
    // app.ebdaey.com root renders the mentor dashboard directly.
    return currentHost === "app.ebdaey.com" ? pageImports.MentorDashboard() : Promise.resolve();
  }
  if (pathname === "/auth" || pathname === "/login" || pathname === "/app/login" || pathname === "/admin-login" || pathname === "/app" || pathname.includes("/account")) return pageImports.AuthPage();
  if (pathname === "/reset-password") return pageImports.ResetPassword();
  if (pathname.endsWith("/subscribe")) return pageImports.SubscriptionCheckoutPage();
  if (pathname.endsWith("/subscribe/payment")) return pageImports.SubscriptionPaymentPage();
  if (pathname.includes("/checkout")) return pageImports.CheckoutPage();
  if (pathname.includes("/payment")) return pageImports.PaymentResult();
  if (pathname.includes("/lesson")) return pageImports.LessonViewer();
  if (pathname.includes("/content-bank")) return pageImports.ContentBankPage();
  if (pathname === "/app/dashboard" || pathname.includes("/impersonate/") || pathname.endsWith("/admin")) return pageImports.MentorDashboard();
  if (pathname === "/admin") return pageImports.AdminDashboard();
  if (pathname === "/dashboard") {
    const host = typeof window !== "undefined" ? window.location.host.toLowerCase() : "";
    const isMentorApp = host === "app.ebdaey.com" || host === "ebdaey.com" || host === "www.ebdaey.com";
    return isMentorApp ? pageImports.MentorDashboard() : pageImports.StudentDashboard();
  }
  if (pathname.endsWith("/dashboard")) return pageImports.StudentDashboard();

  // Mentor site routes: both legacy `/mentor/:slug/...` and new `/:slug/...`
  const mentorParts = (() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "mentor") return parts.slice(1);
    const RESERVED = new Set([
      "auth","admin-login","reset-password","app","admin","privacy-policy",
      "terms","refund-policy","contact","about","delivery-policy","verify","mentor","zoom-integration","zoom"
    ]);
    if (parts[0] && !RESERVED.has(parts[0])) return parts;
    return null;
  })();
  if (mentorParts) {
    if (mentorParts[1] === "course" && mentorParts[2]) {
      prefetchCourse(mentorParts[0], mentorParts[2]);
      return pageImports.CoursePage();
    }
    if ((mentorParts[1] === "product" || mentorParts[1] === "p" || mentorParts[1] === "I") && mentorParts[2]) return pageImports.DigitalProductPage();
    if (mentorParts[1] === "live" && mentorParts[2]) return pageImports.LiveCoursePage();
    if (mentorParts.length === 1) {
      prefetchMentor(mentorParts[0]);
      return pageImports.MentorProfile();
    }
    return pageImports.MentorProfile();
  }
  if (pathname === "/privacy-policy") return pageImports.PrivacyPolicy();
  if (pathname === "/terms") return pageImports.TermsConditions();
  if (pathname === "/refund-policy") return pageImports.RefundPolicy();
  if (pathname === "/contact") return pageImports.ContactUs();
  if (pathname === "/about") return pageImports.AboutUs();
  if (pathname.startsWith("/country/")) return pageImports.CountryLanding();
  if (pathname === "/delivery-policy") return pageImports.DeliveryPolicy();
  if (pathname === "/zoom-integration") return pageImports.ZoomIntegration();
  return pageImports.NotFound();
};


const HOST_INFO = getSubdomainInfo();

const MentorSiteRoutes = ({ slug }: { slug: string }) => (
  <Routes>
    <Route path="/" element={<MentorProfile />} />
    {/* New short URL segments */}
    <Route path="/c/:courseSlug" element={<CoursePage />} />
    <Route path="/c/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/c/:courseSlug/contact" element={<CheckoutPage />} />
    <Route path="/c-booking/:bookingId/payment" element={<CheckoutPage />} />
    <Route path="/c/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/c/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/c/:courseSlug/content-bank" element={<ContentBankPage />} />
    <Route path="/p/:productSlug" element={<DigitalProductPage />} />
    <Route path="/p/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/p/:productSlug/contact" element={<DigitalProductCheckoutPage />} />
    <Route path="/booking/:bookingId/payment" element={<DigitalProductCheckoutPage />} />
    <Route path="/p/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/p/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/l/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/l/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/l/:courseSlug/contact" element={<LiveCourseCheckoutPage />} />
    <Route path="/l-booking/:bookingId/payment" element={<LiveCourseCheckoutPage />} />
    <Route path="/l/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/l/:courseSlug/booking" element={<SessionBundleBookingPage />} />
    {/* Legacy segments — kept for backward compatibility with previously shared links */}
    <Route path="/course/:courseSlug" element={<CoursePage />} />
    <Route path="/course/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/course/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/course/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/course/:courseSlug/content-bank" element={<ContentBankPage />} />
    <Route path="/I/:productSlug" element={<DigitalProductPage />} />
    <Route path="/I/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/I/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/I/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/live/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/live/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/live/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/subscribe" element={<SubscriptionCheckoutPage />} />
    <Route path="/subscribe/payment" element={<SubscriptionPaymentPage />} />
    <Route path="/account" element={<AuthPage mode="student" />} />
    <Route path="/dashboard" element={<StudentDashboard />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify/:code" element={<VerifyCertificate />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const ExternalRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
};

const MentorLoginAlias = () => {
  const location = useLocation();
  return <Navigate to={{ pathname: "/login", search: location.search }} replace />;
};

const MentorAppRoutes = () => (
  <Routes>
    <Route path="/" element={<MentorDashboard />} />
    <Route path="/login" element={<AuthPage mode="mentor" />} />
    <Route path="/auth" element={<MentorLoginAlias />} />
    <Route path="/dashboard" element={<MentorDashboard />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);


const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<AdminDashboard />} />
    <Route path="/login" element={<AuthPage mode="admin" />} />
    <Route path="/impersonate/:tenantId" element={<MentorDashboard />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const MainRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route
      path="/auth"
      element={
        HOST_INFO.isSubdomainMode ? (
          <ExternalRedirect to={`${window.location.protocol}//app.ebdaey.com/login${window.location.search}`} />
        ) : (
          <AuthPage mode="mentor" />
        )
      }
    />

    <Route path="/admin-login" element={<AuthPage mode="admin" />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    {/* Path-based mentor routes (dev/preview/legacy backward-compat) */}
    <Route path="/dashboard" element={<MentorDashboard />} />
    <Route path="/:mentorSlug" element={<MentorProfile />} />

    <Route path="/:mentorSlug/subscribe" element={<SubscriptionCheckoutPage />} />
    <Route path="/:mentorSlug/subscribe/payment" element={<SubscriptionPaymentPage />} />
    <Route path="/:mentorSlug/course/:courseSlug" element={<CoursePage />} />
    <Route path="/:mentorSlug/course/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/:mentorSlug/course/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/:mentorSlug/course/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/:mentorSlug/course/:courseSlug/content-bank" element={<ContentBankPage />} />
    <Route path="/:mentorSlug/c/:courseSlug" element={<CoursePage />} />
    <Route path="/:mentorSlug/c/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/:mentorSlug/c/:courseSlug/contact" element={<CheckoutPage />} />
    <Route path="/:mentorSlug/c-booking/:bookingId/payment" element={<CheckoutPage />} />
    <Route path="/:mentorSlug/c/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/:mentorSlug/c/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/:mentorSlug/c/:courseSlug/content-bank" element={<ContentBankPage />} />

    <Route path="/:mentorSlug/p/:productSlug" element={<DigitalProductPage />} />
    <Route path="/:mentorSlug/p/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/:mentorSlug/p/:productSlug/contact" element={<DigitalProductCheckoutPage />} />
    <Route path="/:mentorSlug/booking/:bookingId/payment" element={<DigitalProductCheckoutPage />} />
    <Route path="/:mentorSlug/p/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/:mentorSlug/p/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/:mentorSlug/I/:productSlug" element={<DigitalProductPage />} />
    <Route path="/:mentorSlug/I/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/:mentorSlug/I/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/:mentorSlug/I/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/:mentorSlug/live/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/:mentorSlug/live/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/:mentorSlug/live/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/:mentorSlug/l/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/:mentorSlug/l/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/:mentorSlug/l/:courseSlug/contact" element={<LiveCourseCheckoutPage />} />
    <Route path="/:mentorSlug/l-booking/:bookingId/payment" element={<LiveCourseCheckoutPage />} />
    <Route path="/:mentorSlug/l/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/:mentorSlug/l/:courseSlug/booking" element={<SessionBundleBookingPage />} />
    <Route path="/:mentorSlug/account" element={<AuthPage mode="student" />} />
    <Route path="/:mentorSlug/dashboard" element={<StudentDashboard />} />
    <Route path="/:mentorSlug/admin" element={<MentorDashboard />} />
    <Route path="/mentor/:mentorSlug" element={<MentorProfile />} />
    <Route path="/mentor/:mentorSlug/course/:courseSlug" element={<CoursePage />} />
    <Route path="/mentor/:mentorSlug/course/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/mentor/:mentorSlug/course/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/mentor/:mentorSlug/course/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/mentor/:mentorSlug/course/:courseSlug/content-bank" element={<ContentBankPage />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug" element={<CoursePage />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug/checkout" element={<CheckoutPage />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug/contact" element={<CheckoutPage />} />
    <Route path="/mentor/:mentorSlug/c-booking/:bookingId/payment" element={<CheckoutPage />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug/payment" element={<PaymentResult />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug/lesson/:lessonId?" element={<LessonViewer />} />
    <Route path="/mentor/:mentorSlug/c/:courseSlug/content-bank" element={<ContentBankPage />} />
    <Route path="/mentor/:mentorSlug/p/:productSlug" element={<DigitalProductPage />} />
    <Route path="/mentor/:mentorSlug/p/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/p/:productSlug/contact" element={<DigitalProductCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/booking/:bookingId/payment" element={<DigitalProductCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/p/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/mentor/:mentorSlug/p/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/mentor/:mentorSlug/I/:productSlug" element={<DigitalProductPage />} />
    <Route path="/mentor/:mentorSlug/I/:productSlug/checkout" element={<DigitalProductCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/I/:productSlug/payment" element={<DigitalProductPaymentPage />} />
    <Route path="/mentor/:mentorSlug/I/:productSlug/delivery" element={<DigitalProductDeliveryPage />} />
    <Route path="/mentor/:mentorSlug/live/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/mentor/:mentorSlug/live/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/live/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/mentor/:mentorSlug/l/:courseSlug" element={<LiveCoursePage />} />
    <Route path="/mentor/:mentorSlug/l/:courseSlug/checkout" element={<LiveCourseCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/l/:courseSlug/contact" element={<LiveCourseCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/l-booking/:bookingId/payment" element={<LiveCourseCheckoutPage />} />
    <Route path="/mentor/:mentorSlug/l/:courseSlug/payment" element={<LiveCoursePaymentPage />} />
    <Route path="/mentor/:mentorSlug/l/:courseSlug/booking" element={<SessionBundleBookingPage />} />
    <Route path="/mentor/:mentorSlug/account" element={<AuthPage mode="student" />} />
    <Route path="/mentor/:mentorSlug/dashboard" element={<StudentDashboard />} />
    <Route path="/mentor/:mentorSlug/admin" element={<MentorDashboard />} />
    <Route path="/app" element={<AuthPage mode="mentor" />} />
    <Route path="/app/login" element={<AuthPage mode="mentor" />} />

    <Route path="/app/dashboard" element={<MentorDashboard />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/impersonate/:tenantId" element={<MentorDashboard />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsConditions />} />
    <Route path="/refund-policy" element={<RefundPolicy />} />
    <Route path="/contact" element={<ContactUs />} />
    <Route path="/about" element={<AboutUs />} />
    <Route path="/country/:countryCode" element={<CountryLanding />} />
    <Route path="/delivery-policy" element={<DeliveryPolicy />} />
    <Route path="/zoom-integration" element={<ZoomIntegration />} />
    <Route path="/verify/:code" element={<VerifyCertificate />} />
    <Route path="/zoom/oauth/callback" element={<ZoomOAuthCallback />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const HostRoutes = () => {
  if (HOST_INFO.context === "mentor-site" && HOST_INFO.mentorSlug) {
    return <MentorSiteRoutes slug={HOST_INFO.mentorSlug} />;
  }
  if (HOST_INFO.context === "mentor-app") return <MentorAppRoutes />;
  if (HOST_INFO.context === "admin") return <AdminRoutes />;
  return <MainRoutes />;
};

const AppRoutes = () => {
  const location = useLocation();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === lastPathRef.current) return;
    lastPathRef.current = location.pathname;

    let cancelled = false;
    setIsRouteLoading(true);

    const stop = () => {
      if (!cancelled) setIsRouteLoading(false);
    };

    let off: (() => void) | undefined;
    const fallbackTimer = setTimeout(stop, 4000);

    preloadRoute(location.pathname)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        off = onPageReady(() => {
          off?.();
          clearTimeout(fallbackTimer);
          stop();
        });
      });

    return () => {
      cancelled = true;
      off?.();
      clearTimeout(fallbackTimer);
    };
  }, [location.pathname]);

  const isCourseLandingPage = (location.pathname.includes('/course/') || location.pathname.includes('/c/')) && !location.pathname.includes('/checkout') && !location.pathname.includes('/payment') && !location.pathname.includes('/lesson') && !location.pathname.includes('/content-bank') && !location.pathname.includes('/account');

  // Hide global support WhatsApp button on any mentor-scoped route — those pages
  // render the mentor's own WhatsApp button (when they have set one).
  const hostInfo = HOST_INFO;
  const isMentorSiteRoute = (() => {
    if (hostInfo.context === "mentor-site") return true;
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts[0] === "mentor") return true;
    const RESERVED = new Set([
      "auth", "admin-login", "reset-password", "app", "admin", "privacy-policy",
      "terms", "refund-policy", "contact", "about", "delivery-policy", "verify", "verify-certificate", "zoom-integration", "zoom",
    ]);
    return !!parts[0] && !RESERVED.has(parts[0]);
  })();
  const isMentorDashboard = location.pathname.startsWith('/app');
  const hideGlobalWhatsApp =
    (hostInfo.context === 'admin' ||
    isMentorSiteRoute ||
    location.pathname.startsWith('/admin') ||
    location.pathname.includes('/lesson') ||
    location.pathname.includes('/content-bank') ||
    location.pathname.includes('/dashboard') ||
    location.pathname.includes('/account')) && !isMentorDashboard;


  const isPrivateRoute = /\/(checkout|payment|delivery|booking|lesson|content-bank|dashboard|account|reset-password|upsell)(\/|$)/.test(
    location.pathname,
  );

  return (
    <div className={`min-h-screen flex flex-col ${isCourseLandingPage ? 'pb-[180px] lg:pb-0' : ''}`}>
      {isPrivateRoute && <NoIndex />}
      <LanguageRouteScope />
      <MentorPublicLanguageLoader />
      <MentorPwaIdentity />
      {/* {isRouteLoading ? <TopLoadingBar /> : null} */}
      {!hideGlobalWhatsApp && (
        <div className={isCourseLandingPage ? 'hidden lg:block' : ''}>
          <Suspense fallback={null}>
            <WhatsAppButton />
          </Suspense>
        </div>
      )}
      <FaviconSwitcher />
      <main className="flex-1">
        <PaymentResultErrorBoundary key={location.pathname}>
          <Suspense fallback={<TopLoadingBar />}>
            <HostRoutes />
          </Suspense>
        </PaymentResultErrorBoundary>
      </main>
    </div>
  );
};

const AppInner = () => {
  const { i18n } = useTranslation();
  const dir = isRtl(i18n.language) ? "rtl" : "ltr";
  return (
    <DirectionProvider dir={dir}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </DirectionProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
