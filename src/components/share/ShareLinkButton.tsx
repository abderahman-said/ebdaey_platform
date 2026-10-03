import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

const BASE_DOMAIN = "ebdaey.com";

export type ShareType = "course" | "product" | "live" | "mentor";

interface ShareLinkButtonProps {
  mentorSlug: string;
  type: ShareType;
  itemSlug?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

/**
 * Builds the REAL public page URL for sharing on the mentor subdomain.
 * The Cloudflare Worker intercepts these URLs for social crawlers and
 * serves OG meta tags; real users get the SPA.
 */
export function buildShareUrl(mentorSlug: string, type: ShareType, itemSlug?: string) {
  const base = `https://${encodeURIComponent(mentorSlug)}.${BASE_DOMAIN}`;
  if (type === "mentor" || !itemSlug) return base;
  const seg = type === "course" ? "c" : type === "product" ? "p" : "l";
  return `${base}/${seg}/${encodeURIComponent(itemSlug)}`;
}

export function ShareLinkButton({
  mentorSlug,
  type,
  itemSlug,
  variant = "outline",
  size = "default",
  className,
  label = "نسخ رابط المشاركة",
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = buildShareUrl(mentorSlug, type, itemSlug);
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("تم نسخ رابط المشاركة");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share — silent
    }
  };

  return (
    <Button onClick={handleShare} variant={variant} size={size} className={className}>
      {copied ? <Check className="h-4 w-4 ml-2" /> : <Share2 className="h-4 w-4 ml-2" />}
      {label}
    </Button>
  );
}
