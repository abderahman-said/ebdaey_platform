import { useMemo } from "react";
import { getSubdomainInfo, getMentorSiteUrl, withCurrentLang } from "@/lib/subdomain";

const BASE_DOMAIN = "ebdaey.com";

/**
 * Hook that provides URL builders aware of subdomain routing.
 * On production subdomains, generates simple paths.
 * On dev/preview, generates /mentor/:slug/... paths.
 */
export function useMentorUrls(mentorSlug?: string) {
  const info = useMemo(() => getSubdomainInfo(), []);
  const isSubdomain = info.isSubdomainMode && info.context === "mentor-site";

  /** Build a path within the current mentor site */
  const mentorPath = (path: string) => {
    if (isSubdomain) return path;
    return `/${mentorSlug}${path}`;
  };

  /** Full URL to a specific mentor's site (cross-subdomain) */
  const mentorSiteUrl = (slug: string, path: string = "/") => {
    return getMentorSiteUrl(slug, path);
  };

  /** URL to the mentor's home/profile */
  const profileUrl = () => {
    if (isSubdomain) return "/";
    return mentorSlug ? `/${mentorSlug}` : "/";
  };

  /** URL to a course page */
  const courseUrl = (courseSlug: string) => mentorPath(`/c/${courseSlug}`);

  /** URL to course checkout */
  const checkoutUrl = (courseSlug: string, query?: string) =>
    mentorPath(`/c/${courseSlug}/contact${query ? `?${query}` : ""}`);

  /** URL to payment result */
  const paymentUrl = (courseSlug: string, query?: string) =>
    mentorPath(`/c/${courseSlug}/payment${query ? `?${query}` : ""}`);




  /** URL to lesson viewer */
  const lessonUrl = (courseSlug: string, lessonId?: string) =>
    mentorPath(`/c/${courseSlug}/lesson${lessonId ? `/${lessonId}` : ""}`);

  /** URL to content bank */
  const contentBankUrl = (courseSlug: string) =>
    mentorPath(`/c/${courseSlug}/content-bank`);

  /** URL to student account/auth */
  const studentAuthUrl = () => mentorPath("/account");

  /** URL to student dashboard */
  const studentDashboardUrl = () => mentorPath("/dashboard");

  /** URL to the admin dashboard */
  const adminUrl = (path: string = "") => {
    if (info.isSubdomainMode) {
      if (info.context === "admin") return path || "/";
      const protocol = window.location.protocol;
      return `${protocol}//admin.${BASE_DOMAIN}${path}`;
    }
    return `/admin${path}`;
  };

  /** URL to the mentor app dashboard */
  const mentorAppUrl = (path: string = "") => {
    if (info.isSubdomainMode) {
      if (info.context === "mentor-app") return path || "/";
      const protocol = window.location.protocol;
      return withCurrentLang(`${protocol}//app.${BASE_DOMAIN}${path}`);
    }
    // Dev/preview fallback: "/app" is the login page, the dashboard lives at /app/dashboard
    if (!path || path === "/") return "/app/dashboard";
    return `/app${path}`;
  };

  /** URL to the main landing page */
  const mainUrl = (path: string = "/") => {
    if (info.isSubdomainMode) {
      if (info.context === "main") return path;
      const protocol = window.location.protocol;
      return `${protocol}//${BASE_DOMAIN}${path}`;
    }
    return path;
  };

  return {
    isSubdomain,
    mentorPath,
    mentorSiteUrl,
    profileUrl,
    courseUrl,
    checkoutUrl,
    paymentUrl,
    lessonUrl,
    contentBankUrl,
    studentAuthUrl,
    studentDashboardUrl,
    adminUrl,
    mentorAppUrl,
    mainUrl,
  };
}
