import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import greenFavicon from "@/assets/favicon-green.png.asset.json";
import redFavicon from "@/assets/favicon-red.png.asset.json";

const DEFAULT_FAVICON = "/favicon.ico?v=green-2";
const MENTOR_DASHBOARD_FAVICON = "/mentor-dashboard-favicon.png?v=3";

// Admin routes use the red favicon.
const ADMIN_PATHS = ["/admin", "/admin-login"];

// Platform (non-student) routes keep the default favicon.
const PLATFORM_PATHS = [
  "/auth",
  "/reset-password",
  "/verify-certificate",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
  "/delivery",
];

// Mentor-scope routes use the black favicon.
const MENTOR_PATHS = ["/app"];

const matchesAny = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isPlatformRoute = (pathname: string) => {
  if (pathname === "/") return true;
  return matchesAny(pathname, PLATFORM_PATHS);
};

const isMentorRoute = (pathname: string) => matchesAny(pathname, MENTOR_PATHS);

const setFavicon = (href: string) => {
  const absoluteHref = new URL(href, window.location.origin).href;
  const iconLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']"),
  );
  const [primaryLink, ...duplicateLinks] = iconLinks;
  duplicateLinks.forEach((link) => link.remove());

  const link = primaryLink || document.createElement("link");
  link.rel = "icon";
  link.type = href.endsWith(".ico") || href.includes(".ico?") ? "image/x-icon" : "image/png";
  if (link.href !== absoluteHref) link.href = href;
  if (!primaryLink) document.head.appendChild(link);
};

export const FaviconSwitcher = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isAdminHost = host.startsWith("admin.");
    const isMentorHost = host.startsWith("app.");
    if (isAdminHost || matchesAny(pathname, ADMIN_PATHS)) {
      setFavicon(redFavicon.url);
    } else if (isMentorHost || isMentorRoute(pathname)) {
      setFavicon(MENTOR_DASHBOARD_FAVICON);
    } else if (isPlatformRoute(pathname)) {
      setFavicon(DEFAULT_FAVICON);
    } else {
      setFavicon(greenFavicon.url);
    }
  }, [pathname]);


  return null;
};

export default FaviconSwitcher;
