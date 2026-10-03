import { getSubdomainInfo } from "@/lib/subdomain";

const BASE_DOMAIN = "ebdaey.com";

/** Optionally reduces a mentor name to its first and last name only. */
export function formatCertificateMentorName(name: string, shortNameOnly?: boolean) {
  if (!shortNameOnly) return name;
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
export const CERTIFICATE_VERIFY_BASE_URL = `https://${BASE_DOMAIN}`;

/** Builds an absolute, scannable verification URL for a certificate. */
export function getCertificateVerifyUrl(certificateId: string, mentorSlug?: string) {
  const path = `/verify/${encodeURIComponent(certificateId)}`;
  const safeMentorSlug = mentorSlug?.trim().toLowerCase();

  // Certificate QR codes must always verify on the mentor public website,
  // even when generated from the Lovable preview or app domain.
  if (safeMentorSlug) {
    return `https://${safeMentorSlug}.${BASE_DOMAIN}${path}`;
  }

  const info = typeof window !== "undefined" ? getSubdomainInfo() : null;
  if (info?.context === "mentor-site" && info.mentorSlug) {
    return `https://${info.mentorSlug}.${BASE_DOMAIN}${path}`;
  }

  return `${CERTIFICATE_VERIFY_BASE_URL}${path}`;
}
