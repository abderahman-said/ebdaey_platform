import { useParams } from "react-router-dom";
import { getSubdomainInfo } from "@/lib/subdomain";

/**
 * Gets the current mentor slug from either:
 * 1. The subdomain (on production: slug.ebdaey.com)
 * 2. The URL params (on dev: /mentor/:mentorSlug/...)
 */
export function useMentorSlug(): string | undefined {
  const { mentorSlug } = useParams<{ mentorSlug?: string }>();
  const info = getSubdomainInfo();
  
  // Subdomain takes priority
  if (info.context === "mentor-site" && info.mentorSlug) {
    return info.mentorSlug;
  }
  
  return mentorSlug;
}
