import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePwaManifest, hslTokenToHex } from "@/hooks/usePwaManifest";
import { getMentorSlugForRoute } from "@/i18n/mentorPublicLanguage";

interface TenantBrand {
  slug: string;
  name: string;
  image: string | null;
  color: string | null;
  lang: "ar" | "en";
}

const cache = new Map<string, TenantBrand>();

/**
 * On mentor public pages, the installable app identity (home-screen name +
 * icon) follows the mentor's academy instead of the Ebdaey platform default.
 * The mentor dashboard and the student dashboard set their own identity.
 */
const MentorPwaIdentity = () => {
  const { pathname } = useLocation();
  const slug = getMentorSlugForRoute(pathname);
  const isDashboard = pathname.includes("/dashboard");
  const [brand, setBrand] = useState<TenantBrand | null>(slug ? cache.get(slug) ?? null : null);

  useEffect(() => {
    if (!slug || isDashboard) {
      setBrand(null);
      return;
    }
    const cached = cache.get(slug);
    if (cached) {
      setBrand(cached);
      return;
    }
    let cancelled = false;
    supabase
      .from("public_tenants")
      .select("name, profile_image_url, primary_color, public_language")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.name) return;
        const next: TenantBrand = {
          slug,
          name: data.name,
          image: data.profile_image_url || null,
          color: data.primary_color || null,
          lang: data.public_language === "en" ? "en" : "ar",
        };
        cache.set(slug, next);
        setBrand(next);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isDashboard]);

  const startPath =
    brand && pathname.startsWith(`/${brand.slug}`) ? `/${brand.slug}` : "/";

  usePwaManifest(
    brand && !isDashboard
      ? {
          name: brand.name,
          shortName: brand.name,
          icon: brand.image,
          themeColor: hslTokenToHex(brand.color) || "#00d655",
          startPath,
          dir: brand.lang === "en" ? "ltr" : "rtl",
          lang: brand.lang,
        }
      : null,
  );

  return null;
};

export default MentorPwaIdentity;
