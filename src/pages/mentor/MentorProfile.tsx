import { setDisplayCurrency, applyLocalPrices } from "@/lib/localPrice";
import { Link } from "react-router-dom";
import MentorProfileSkeleton from "@/components/common/MentorProfileSkeleton";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk, queryClient, fetchMentor, fetchMentorCourses, prefetchCourse, prefetchDigitalProduct, prefetchLiveCourse } from "@/lib/queries";
import { usePageReady } from "@/hooks/usePageReady";
import { useTrackVisit } from "@/hooks/useTrackVisit";
import { Star, BookOpen, Crown, Zap, Check, BadgeCheck, ChevronRight, Sparkles, Facebook, Linkedin, Youtube, Instagram, Package, Radio, GraduationCap, Search, LayoutGrid, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import PixelInjector from "@/components/common/PixelInjector";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import VideoThumbnail from "@/components/media/VideoThumbnail";
import RichTextContent from "@/components/common/RichTextContent";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import OptimizedImage from "@/components/media/OptimizedImage";
import { toAr, toArPrice } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { SeoHead } from "@/components/common/SeoHead";
import { mentorCanonical, plainText, aggregateRating } from "@/lib/seo";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  banner_type: string | null;
  banner_video_url: string | null;
  price_before_discount: number | null;
  card_button_text: string | null;
  display_order: number;
  is_unlisted: boolean;
}

const MentorProfile = () => {
  setDisplayCurrency("EGP");
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const { t, i18n } = useTranslation();
  const billingCycle = "yearly" as const;
  const [productsCategory, setProductsCategory] = useState<string>("all");
  const [productsSearch, setProductsSearch] = useState<string>("");


  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: qk.mentor(mentorSlug || ""),
    queryFn: () => fetchMentor(mentorSlug!),
    enabled: !!mentorSlug,
    staleTime: 15 * 60 * 1000, // 15 minutes
    initialData: () => (mentorSlug ? queryClient.getQueryData<any>(qk.mentor(mentorSlug)) : undefined),
  });

  const tenantDbId = tenant?.id ?? null;
  useTrackVisit(tenantDbId, "profile");

  const mentor = tenant
    ? {
        name: tenant.name,
        bio: tenant.bio,
        whatsapp: (tenant as any).whatsapp_number,
        profile_image_url: tenant.profile_image_url,
        cover_image_url: (tenant as any).cover_image_url,
        primary_color: (tenant as any).primary_color,
        subscriptions_enabled: (tenant as any).subscriptions_enabled ?? false,
        show_reviews_on_profile: (tenant as any).show_reviews_on_profile ?? false,
        whatsapp_default_color: (tenant as any).whatsapp_default_color ?? true,
        social_facebook: (tenant as any).social_facebook ?? null,
        social_linkedin: (tenant as any).social_linkedin ?? null,
        social_youtube: (tenant as any).social_youtube ?? null,
        social_x: (tenant as any).social_x ?? null,
        social_tiktok: (tenant as any).social_tiktok ?? null,
        social_instagram: (tenant as any).social_instagram ?? null,
      }
    : null;




  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: qk.mentorCourses(tenantDbId || ""),
    queryFn: async () => applyLocalPrices("course", ((await fetchMentorCourses(tenantDbId!)) as any[]) || []),
    enabled: !!tenantDbId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => (tenantDbId ? queryClient.getQueryData(qk.mentorCourses(tenantDbId)) : undefined),
  });
  const courses: Course[] = (coursesData as any[]) || [];

  const { data: plansData } = useQuery({
    queryKey: qk.mentorPlans(tenantDbId || ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .eq("tenant_id", tenantDbId!)
        .eq("is_active", true);
      return applyLocalPrices("subscription_plan", (data as any[]) || []);
    },
    enabled: !!tenantDbId && !!mentor?.subscriptions_enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
    initialData: () => (tenantDbId ? queryClient.getQueryData(qk.mentorPlans(tenantDbId)) : undefined),
  });
  const plans: any[] = (plansData as any[]) || [];

  const { data: digitalProductsData } = useQuery({
    queryKey: ["mentor-digital-products", tenantDbId],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_products")
        .select("id, slug, title, description, price, price_before_discount, thumbnail_url, banner_type, banner_video_url, card_button_text, is_unlisted")
        .eq("tenant_id", tenantDbId!)
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      return applyLocalPrices("digital_product", (data || []).filter((p: any) => !p.is_unlisted));
    },
    enabled: !!tenantDbId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => (tenantDbId ? queryClient.getQueryData(["mentor-digital-products", tenantDbId]) : undefined),
  });
  const digitalProducts: any[] = (digitalProductsData as any[]) || [];

  const { data: liveCoursesData } = useQuery({
    queryKey: ["mentor-live-courses", tenantDbId],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_courses" as any)
        .select("id, slug, title, description, price, price_before_discount, thumbnail_url, banner_type, banner_video_url, card_button_text, is_unlisted, product_type")
        .eq("tenant_id", tenantDbId!)
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      return applyLocalPrices("live_course", ((data as any[]) || []).filter((p: any) => !p.is_unlisted && (p.product_type === "live_course" || !p.product_type)));
    },
    enabled: !!tenantDbId,
    staleTime: 5 * 60 * 1000, // 5 minutes (live courses change more frequently)
    initialData: () => (tenantDbId ? queryClient.getQueryData(["mentor-live-courses", tenantDbId]) : undefined),
  });
  const liveCourses: any[] = (liveCoursesData as any[]) || [];

  const { data: consultationsData } = useQuery({
    queryKey: ["mentor-consultations", tenantDbId],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_courses" as any)
        .select("id, slug, title, description, price, price_before_discount, thumbnail_url, banner_type, banner_video_url, card_button_text, is_unlisted, product_type")
        .eq("tenant_id", tenantDbId!)
        .eq("is_published", true)
        .eq("product_type", "consultation")
        .order("display_order", { ascending: true });
      return applyLocalPrices("live_course", ((data as any[]) || []).filter((p: any) => !p.is_unlisted));
    },
    enabled: !!tenantDbId,
    staleTime: 5 * 60 * 1000,
    initialData: () => (tenantDbId ? queryClient.getQueryData(["mentor-consultations", tenantDbId]) : undefined),
  });
  const consultations: any[] = (consultationsData as any[]) || [];

  const { data: reviewsData } = useQuery({
    queryKey: qk.mentorReviews(tenantDbId || ""),
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, first_name, last_name, rating, rating_v2, comment, course_id, created_at")
        .eq("tenant_id", tenantDbId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantDbId && !!mentor?.show_reviews_on_profile,
    staleTime: 20 * 60 * 1000, // 20 minutes (reviews change less frequently)
    initialData: () => (tenantDbId ? queryClient.getQueryData(qk.mentorReviews(tenantDbId)) : undefined),
  });
  const reviews: any[] = (reviewsData as any[]) || [];

  const loading = tenantLoading || coursesLoading;

  /* ─── Average rating helper ─── */
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + ((r as any).rating_v2 ?? r.rating), 0) / reviews.length).toFixed(1)
      : null;

  /* ─── Loading ─── */
  usePageReady(loading);
  if (loading) {
    return <MentorProfileSkeleton />;
  }

  /* ─── 404 ─── */
  if (!mentor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">{t("mentorPublic.notFound.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("mentorPublic.notFound.hint")}</p>
          <Link to="/">
            <Button className="gradient-primary text-primary-foreground border-0 rounded-full px-8">
              {t("mentorPublic.notFound.backHome")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredPlans = plans.filter((p) => p.plan_type === billingCycle);

  const seoLocale = i18n.language === "en" ? "en" : "ar";
  const profileCanonical = mentorCanonical(mentorSlug, "/");
  const mentorDescription =
    plainText(mentor.bio) ||
    (seoLocale === "ar"
      ? `تعرّف على ${mentor.name} واستكشف الكورسات والمنتجات والاستشارات المتاحة.`
      : `Explore courses, digital products and consultations offered by ${mentor.name}.`);
  const socialLinks = [
    mentor.social_facebook,
    mentor.social_linkedin,
    mentor.social_youtube,
    mentor.social_x,
    mentor.social_tiktok,
    mentor.social_instagram,
  ].filter(Boolean) as string[];

  const personSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: mentor.name,
    url: profileCanonical,
    ...(mentor.profile_image_url ? { image: mentor.profile_image_url } : {}),
    ...(mentor.bio ? { description: plainText(mentor.bio, 500) } : {}),
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
    ...(reviews.length > 0
      ? {
          aggregateRating: aggregateRating({
            count: reviews.length,
            value: Number(avgRating),
          }),
        }
      : {}),
  };

  const allProducts = [
    ...courses.map((p: any) => ({ title: p.title, url: mentorCanonical(mentorSlug, `/c/${p.slug}`) })),
    ...[...liveCourses, ...consultations].map((p: any) => ({ title: p.title, url: mentorCanonical(mentorSlug, `/l/${p.slug}`) })),
    ...digitalProducts.map((p: any) => ({ title: p.title, url: mentorCanonical(mentorSlug, `/p/${p.slug}`) })),
  ];
  const itemListSchema: Record<string, unknown> | null =
    allProducts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: mentor.name,
          itemListElement: allProducts.slice(0, 30).map((p: any, i: number) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.title,
            url: p.url,
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title={`${mentor.name} — ${t("miscPublic.brand")}`}
        description={mentorDescription}
        path={profileCanonical}
        image={mentor.profile_image_url || undefined}
        locale={seoLocale}
        jsonLd={itemListSchema ? [personSchema, itemListSchema] : [personSchema]}
        breadcrumbs={[
          { name: t("miscPublic.brand"), url: "https://ebdaey.com/" },
          { name: mentor.name, url: profileCanonical },
        ]}
      />
      {tenantDbId && <PixelInjector tenantId={tenantDbId} />}
      {mentor && <TenantThemeInjector primaryColor={mentor.primary_color} />}


      {/* ── Hero / Cover ── */}
      <div className="relative h-44 sm:h-56 lg:h-72 overflow-hidden">
        {mentor.cover_image_url ? (
          <OptimizedImage
            src={mentor.cover_image_url}
            alt={`${mentor.name} — ${t("miscPublic.brand")}`}
            className="absolute inset-0 w-full h-full"
            priority
          />
        ) : (
          <div className="absolute inset-0 gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />

        {/* Login button — top corner */}
        <div className="absolute top-4 start-4 sm:top-6 sm:start-6 z-20">
          <AuthStatusButton
            mentorSlug={mentorSlug}
            studentOnly
            size="sm"
            className="bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg px-5 font-semibold shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* ── Profile Header ── */}
      <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="relative -mt-16 sm:-mt-20 z-10 flex flex-col items-center text-center">
          {/* Circular Avatar with verified badge */}
          <div className="relative">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white ring-1 ring-black/5">
              {mentor.profile_image_url ? (
                <OptimizedImage
                  src={mentor.profile_image_url}
                  alt={mentor.name}
                  className="w-full h-full object-cover"
                  priority
                  sizes="144px"
                />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground text-4xl font-black">
                  {mentor.name.charAt(0)}
                </div>
              )}
            </div>
            <BadgeCheck
              className="absolute bottom-1 end-1 w-8 h-8 text-primary drop-shadow"
              fill="white"
            />
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-black mt-5 tracking-tight text-slate-900">
            {mentor.name}
          </h1>

          {/* Bio */}
          {mentor.bio && (
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mt-2">
              {mentor.bio}
            </p>
          )}

          {/* Rating pill */}
          {avgRating && (
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 bg-warning/10 text-warning font-semibold px-4 py-1.5 rounded-full text-sm">
                <Star className="w-4 h-4 fill-warning" />
                {toAr(avgRating)} ({toAr(reviews.length)} {t("mentorPublic.stats.reviews")})
              </span>
            </div>
          )}

          {/* Social icons */}
          {(() => {
            const socials = [
              { url: mentor.social_facebook, icon: <Facebook className="w-4 h-4" />, label: "Facebook" },
              { url: mentor.social_instagram, icon: <Instagram className="w-4 h-4" />, label: "Instagram" },
              { url: mentor.social_youtube, icon: <Youtube className="w-4 h-4" />, label: "YouTube" },
              { url: mentor.social_x, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, label: "X" },
              { url: mentor.social_tiktok, icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.79a4.83 4.83 0 01-1-.1z"/></svg>, label: "TikTok" },
              { url: mentor.social_linkedin, icon: <Linkedin className="w-4 h-4" />, label: "LinkedIn" },
            ].filter(s => s.url);
            if (socials.length === 0) return null;
            return (
              <div className="flex items-center justify-center gap-2 mt-5">
                {socials.map(s => (
                  <a
                    key={s.label}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/40 transition-all hover:-translate-y-0.5"
                    title={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ── Subscription (compact horizontal card) ── */}
        {mentor.subscriptions_enabled && plans.length > 0 && filteredPlans.length > 0 && (
          <section className="mt-12">
            {filteredPlans.map((plan: any) => {
              const featureKeys = [
                "mentorPublic.subscriptions.features.allCourses",
                "mentorPublic.subscriptions.features.updates",
                "mentorPublic.subscriptions.features.certificates",
                "mentorPublic.subscriptions.features.support",
              ];
              if (plan.includes_digital_products) {
                featureKeys.push("mentorPublic.subscriptions.features.digitalProducts");
              }
              return (
                <div
                  key={plan.id}
                  className="bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8"
                >
                  <div className="flex-1 text-start">
                    <span className="inline-flex items-center gap-1.5 text-primary font-bold text-xs tracking-widest uppercase rtl:tracking-normal">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t("mentorPublic.subscriptions.badge")}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black mt-2 text-slate-900">
                      {t("mentorPublic.subscriptions.yearlyPlan")}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
                      {t("mentorPublic.subscriptions.planDescription")}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-start">

                      {featureKeys.map((key) => (
                        <li key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-center md:items-end shrink-0 gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{toArPrice(plan.price, plan.currency)}</span>
                      <span className="text-slate-400 text-sm font-medium">
                        {t("mentorPublic.subscriptions.perYear")}
                      </span>
                    </div>
                    <Link to={urls.mentorPath("/subscribe")} className="w-full md:w-auto">
                      <Button className="w-full md:w-auto gradient-primary text-primary-foreground border-0 rounded-xl font-bold px-8 py-5 shadow-md hover:opacity-90">
                        {t("mentorPublic.subscriptions.subscribe")}
                        <ChevronRight className="w-4 h-4 ms-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Catalog ── */}
        {(() => {
          const renderCard = (
            item: any,
            href: string,
            opts?: { onHover?: () => void; defaultBtn?: string; fallbackIcon?: React.ReactNode; typeBadge?: { label: string; className: string } },
          ) => (
            <Link
              key={item.id}
              to={href}
              onMouseEnter={opts?.onHover}
              onFocus={opts?.onHover}
              className="group flex flex-col"
            >
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 mb-4 ring-1 ring-slate-200/70">
                {item.thumbnail_url ? (
                  <OptimizedImage
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : item.banner_type === "video" && item.banner_video_url ? (
                  <VideoThumbnail videoUrl={item.banner_video_url} alt={item.title} />
                ) : (
                  <div className="absolute inset-0 gradient-primary flex items-center justify-center">
                    {opts?.fallbackIcon ?? <BookOpen className="w-12 h-12 text-primary-foreground/40" />}
                  </div>
                )}

                {opts?.typeBadge && (
                  <span className={`absolute top-3 end-3 text-[11px] px-2.5 py-1 rounded-lg font-bold shadow-sm ${opts.typeBadge.className}`}>
                    {opts.typeBadge.label}
                  </span>
                )}

                {item.price === 0 && (
                  <span className="absolute top-3 start-3 bg-success text-success-foreground text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                    {t("mentorPublic.catalog.free")}
                  </span>
                )}
                {item.price_before_discount && item.price_before_discount > item.price && (
                  <span className="absolute top-3 start-3 bg-destructive text-destructive-foreground text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                    {t("mentorPublic.catalog.discount")}{" "}
                    {toAr(
                      Math.round(
                        ((item.price_before_discount - item.price) / item.price_before_discount) * 100,
                      ),
                    )}
                    %
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-slate-900">
                    {item.price > 0 ? toArPrice(item.price, item.currency) : t("mentorPublic.catalog.free")}
                  </span>
                  {item.price_before_discount && item.price_before_discount > item.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {toArPrice(item.price_before_discount, item.currency)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-primary font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("mentorPublic.catalog.view")} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );

          const emptyState = (icon: React.ReactNode, label: string) => (
            <div className="rounded-2xl p-14 text-center border border-dashed border-slate-200">
              <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center text-slate-300">
                {icon}
              </div>
              <p className="text-slate-500 font-medium">{label}</p>
            </div>
          );

          const categories = [
            { value: "all", label: t("mentorPublic.catalog.categories.all"), icon: LayoutGrid, count: courses.length + digitalProducts.length + liveCourses.length + consultations.length },
            { value: "courses", label: t("mentorPublic.catalog.categories.courses"), icon: GraduationCap, count: courses.length },
            { value: "digital", label: t("mentorPublic.catalog.categories.digital"), icon: Package, count: digitalProducts.length },
            { value: "live", label: t("mentorPublic.catalog.categories.live"), icon: Radio, count: liveCourses.length },
            { value: "consultations", label: t("mentorPublic.catalog.categories.consultations"), icon: User, count: consultations.length },
          ];
          const availableCategories = categories.filter(c => c.count > 0);
          const hasAny = courses.length + digitalProducts.length + liveCourses.length + consultations.length > 0;

          const matchSearch = (title: string) =>
            !productsSearch.trim() || title.toLowerCase().includes(productsSearch.trim().toLowerCase());

          const filteredCourses = courses.filter(c => matchSearch(c.title));
          const filteredDigital = digitalProducts.filter((p: any) => matchSearch(p.title));
          const filteredLive = liveCourses.filter((lc: any) => matchSearch(lc.title));
          const filteredConsultations = consultations.filter((cs: any) => matchSearch(cs.title));

          const showCourses = (productsCategory === "all" || productsCategory === "courses") && filteredCourses.length > 0;
          const showDigital = (productsCategory === "all" || productsCategory === "digital") && filteredDigital.length > 0;
          const showLive = (productsCategory === "all" || productsCategory === "live") && filteredLive.length > 0;
          const showConsultations = (productsCategory === "all" || productsCategory === "consultations") && filteredConsultations.length > 0;
          const nothingMatches = hasAny && !showCourses && !showDigital && !showLive && !showConsultations;

          return (
            <section className="mt-14 pb-20">
              {!hasAny ? (
                emptyState(<Package className="w-12 h-12" />, t("mentorPublic.catalog.empty"))
              ) : (
                <>
                  {/* Inline header: title + search + filter chips */}
                  <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-slate-900">
                      {t("mentorPublic.catalog.title")}
                    </h2>

                    <div className="flex flex-row gap-2.5 w-full md:w-auto">
                      <div className="relative flex-1 sm:min-w-[220px]">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <Input
                          value={productsSearch}
                          onChange={(e) => setProductsSearch(e.target.value)}
                          placeholder={t("mentorPublic.catalog.searchPlaceholder")}
                          className="pe-10 h-11 bg-white border-slate-200 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary"
                        />
                      </div>
                      <Select value={productsCategory} onValueChange={setProductsCategory}>
                        <SelectTrigger className="h-11 w-auto min-w-[160px] bg-white border-slate-200 rounded-xl font-bold text-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="font-bold">
                              {c.label}
                              <span className="ms-1.5 text-[10px] font-bold opacity-60">
                                {toAr(c.count)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {nothingMatches ? (
                    emptyState(<Search className="w-12 h-12" />, t("mentorPublic.catalog.noResults"))
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {showCourses &&
                        filteredCourses.map((c) =>
                          renderCard(c, urls.courseUrl(c.slug), {
                            onHover: () => mentorSlug && prefetchCourse(mentorSlug, c.slug),
                            defaultBtn: t("mentorPublic.catalog.defaultBtn.course"),
                            fallbackIcon: <GraduationCap className="w-12 h-12 text-primary-foreground/40" />,
                            typeBadge: {
                              label: t("mentorPublic.catalog.typeBadge.course"),
                              className: "bg-white/95 backdrop-blur text-slate-800",
                            },
                          }),
                        )}

                      {showDigital &&
                        filteredDigital.map((p: any) =>
                          renderCard(p, urls.mentorPath(`/p/${p.slug}`), {
                            onHover: () => mentorSlug && prefetchDigitalProduct(mentorSlug, p.slug),
                            defaultBtn: t("mentorPublic.catalog.defaultBtn.digital"),
                            fallbackIcon: <Package className="w-12 h-12 text-primary-foreground/40" />,
                            typeBadge: {
                              label: t("mentorPublic.catalog.typeBadge.digital"),
                              className: "bg-white/95 backdrop-blur text-slate-800",
                            },
                          }),
                        )}

                      {showLive &&
                        filteredLive.map((lc: any) =>
                          renderCard(lc, urls.mentorPath(`/l/${lc.slug}`), {
                            onHover: () => mentorSlug && prefetchLiveCourse(mentorSlug, lc.slug),
                            defaultBtn: t("mentorPublic.catalog.defaultBtn.live"),
                            fallbackIcon: <Radio className="w-12 h-12 text-primary-foreground/40" />,
                            typeBadge: {
                              label: t("mentorPublic.catalog.typeBadge.live"),
                              className: "bg-white/95 backdrop-blur text-slate-800",
                            },
                          }),
                        )}

                      {showConsultations &&
                        filteredConsultations.map((cs: any) =>
                          renderCard(cs, urls.mentorPath(`/l/${cs.slug}`), {
                            onHover: () => mentorSlug && prefetchLiveCourse(mentorSlug, cs.slug),
                            defaultBtn: t("mentorPublic.catalog.defaultBtn.consultation"),
                            fallbackIcon: <User className="w-12 h-12 text-primary-foreground/40" />,
                            typeBadge: {
                              label: t("mentorPublic.catalog.typeBadge.consultation"),
                              className: "bg-white/95 backdrop-blur text-slate-800",
                            },
                          }),
                        )}
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })()}

        {/* ── Reviews ── */}
        {mentor.show_reviews_on_profile && reviews.length > 0 && (
          <section className="pb-14">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">
                {t("mentorPublic.reviewsSection.title")}
              </h2>
              {avgRating && (
                <p className="text-slate-500 mt-1.5 text-sm">
                  {t("mentorPublic.reviewsSection.average")}{" "}
                  <strong className="text-slate-900">{toAr(avgRating)}</strong>{" "}
                  {t("mentorPublic.reviewsSection.outOf")} {toAr(reviews.length)}{" "}
                  {t("mentorPublic.reviewsSection.review")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((review) => {
                const courseName = courses.find((c) => c.id === review.course_id)?.title;
                return (
                  <div
                    key={review.id}
                    className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-primary/20 transition-colors flex flex-col shadow-sm"
                  >
                    <div className="flex items-center gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor((review as any).rating_v2 ?? review.rating) ? "text-warning fill-warning" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>

                    {review.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-4 whitespace-pre-wrap break-words">
                        "{review.comment}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-black shrink-0">
                          {review.first_name?.charAt(0)}
                        </div>
                        <span className="font-semibold text-sm text-slate-900">
                          {review.first_name} {review.last_name}
                        </span>
                      </div>
                      {courseName && (
                        <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium truncate max-w-[100px]">
                          {courseName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <TrustedBadge />
      {mentor?.whatsapp && <MentorWhatsAppButton phoneNumber={mentor.whatsapp} />}
    </div>
  );
};

export default MentorProfile;
