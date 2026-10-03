import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CoursePageSkeleton from "@/components/common/CoursePageSkeleton";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useInView } from "@/hooks/useInView";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queries";
import { dpQk, fetchDigitalProductBundle } from "@/lib/digitalProductQueries";
import { usePageReady } from "@/hooks/usePageReady";
import { useTrackVisit } from "@/hooks/useTrackVisit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PixelInjector, { firePixelEvent } from "@/components/common/PixelInjector";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";
import TrustedBadge from "@/components/common/TrustedBadge";
import CourseHeader from "@/components/course/CourseHeader";
import CourseFeatureBadges from "@/components/course/CourseFeatureBadges";
import CourseDescription from "@/components/course/CourseDescription";
import ProductPurchaseCard from "@/components/product/ProductPurchaseCard";
import ProductMobileBottomBar from "@/components/product/ProductMobileBottomBar";
import ProductHero from "@/components/product/ProductHero";
import DigitalProductSamplePreview from "@/components/product/DigitalProductSamplePreview";
import { SeoHead } from "@/components/common/SeoHead";
import { mentorCanonical, plainText, aggregateRating, offerSchema, reviewSchemas, faqPageSchema, AUDIENCE_AREA_SERVED } from "@/lib/seo";

const CourseGiftCourses = lazy(() => import("@/components/course/CourseGiftCourses"));
const CourseReviews = lazy(() => import("@/components/course/CourseReviews"));
const CourseFaqs = lazy(() => import("@/components/course/CourseFaqs"));
const CourseMentorCard = lazy(() => import("@/components/course/CourseMentorCard"));

const DigitalProductPage = () => {
  const { t, i18n } = useTranslation();
  const { productSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { ref: reviewsRef, inView: showReviews } = useInView();
  const { ref: faqsRef, inView: showFaqs } = useInView();
  const { ref: mentorRef, inView: showMentor } = useInView();
  const { ref: giftCoursesRef, inView: showGiftCourses } = useInView();

  const [activeSection, setActiveSection] = useState("section-about");
  const [isPurchased, setIsPurchased] = useState(false);

  const { data: bundle, isLoading: loading } = useQuery({
    queryKey: dpQk.product(mentorSlug || "", productSlug || ""),
    queryFn: () => fetchDigitalProductBundle(mentorSlug!, productSlug!),
    enabled: !!mentorSlug && !!productSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () =>
      mentorSlug && productSlug
        ? queryClient.getQueryData<Awaited<ReturnType<typeof fetchDigitalProductBundle>>>(
            dpQk.product(mentorSlug, productSlug)
          )
        : undefined,
  });

  const tenantDbId = bundle?.tenant?.id ?? null;
  useTrackVisit(tenantDbId, "product");
  const product = bundle?.product ?? null;
  const reviews = bundle?.reviews ?? [];
  const giftCourses = bundle?.giftCourses ?? [];
  const filesCount = bundle?.filesCount ?? 0;
  const samples = useMemo(
    () => ((bundle?.files ?? []) as any[]).filter((f) => f.is_sample),
    [bundle?.files],
  );

  const mentor = bundle?.tenant
    ? {
        name: bundle.tenant.name,
        bio: bundle.tenant.bio,
        specialty: (bundle.tenant as any).specialty,
        profile_image_url: bundle.tenant.profile_image_url,
        primary_color: (bundle.tenant as any).primary_color,
        whatsapp_number: (bundle.tenant as any).whatsapp_number,
        whatsapp_default_color: (bundle.tenant as any).whatsapp_default_color ?? true,
      }
    : null;

  // Active nav link tracking via IntersectionObserver (no scroll listener)
  useEffect(() => {
    if (!product) return;
    const sectionIds = ["section-about", "section-features", "section-faqs"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        const active = sectionIds.find((id) => visible.has(id));
        if (active) setActiveSection(active);
      },
      { rootMargin: "-150px 0px -60% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [product]);

  // Check if already purchased
  useEffect(() => {
    const check = async () => {
      setIsPurchased(false);
      if (!user || !product || !tenantDbId) return;
      // Match the header: mentor/admin sessions are not shown as signed-in students here.
      const role = user.user_metadata?.role;
      if (role === "mentor" || role === "admin") return;
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantDbId)
        .single();
      if (!student) return;
      const { data: purchase } = await supabase
        .from("digital_product_purchases")
        .select("id")
        .eq("student_id", student.id)
        .eq("digital_product_id", product.id)
        .eq("payment_status", "completed")
        .maybeSingle();
      if (purchase) setIsPurchased(true);
    };
    check();
  }, [user, product, tenantDbId]);

  // Pixel event
  useEffect(() => {
    if (product && tenantDbId) {
      firePixelEvent("ViewContent", {
        content_name: product.title,
        content_ids: [product.id],
        value: product.price,
        currency: "EGP",
      });
    }
  }, [product, tenantDbId]);

  const handleBuy = () => {
    navigate(`${urls.mentorPath(`/p/${productSlug}/contact`)}`);
  };

  const deliveryUrl = (slug: string) => urls.mentorPath(`/p/${slug}/delivery`);

  const avgRating = useMemo(
    () => (reviews.length > 0 ? reviews.reduce((sum, r) => sum + ((r as any).rating_v2 ?? r.rating), 0) / reviews.length : 5),
    [reviews],
  );
  const roundedRating = Math.round(avgRating * 10) / 10;

  usePageReady(loading);
  if (loading) return <CoursePageSkeleton />;

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("digitalProduct.page.notFound")}</p>
      </div>
    );
  }

  const landingFeatures: { text: string; icon: string }[] = (product.landing_features as any) || [];
  const faqs: { question: string; answer: string }[] = (product.faqs as any) || [];
  const communityLink: string = (product as any).community_link || "";

  const seoLocale = i18n.language === "en" ? "en" : "ar";
  const productCanonical = mentorCanonical(mentorSlug, `/p/${productSlug}`);
  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: productCanonical,
    ...(product.description ? { description: plainText(product.description, 500) } : {}),
    ...(product.thumbnail_url ? { image: product.thumbnail_url } : {}),
    ...(mentor ? { brand: { "@type": "Person", name: mentor.name } } : {}),
    category: seoLocale === "en" ? "Downloadable digital product" : "منتج رقمي قابل للتنزيل",
    inLanguage: seoLocale === "en" ? "en" : "ar-EG",
    sku: product.id,
    isFamilyFriendly: true,
    ...(Number(product.price ?? 0) === 0 ? { isAccessibleForFree: true } : {}),
    audience: { "@type": "Audience", audienceType: seoLocale === "en" ? "Learners" : "المتعلمون", geographicArea: AUDIENCE_AREA_SERVED },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: seoLocale === "en" ? "Delivery" : "التسليم",
        value: seoLocale === "en" ? "Automatic digital delivery after successful payment" : "تسليم رقمي تلقائي بعد نجاح الدفع",
      },
      ...(samples.length > 0
        ? [{
            "@type": "PropertyValue",
            name: seoLocale === "en" ? "Free preview" : "معاينة مجانية",
            value: seoLocale === "en" ? "Available before purchase" : "متاحة قبل الشراء",
          }]
        : []),
      ...(filesCount > 0
        ? [
            {
              "@type": "PropertyValue",
              name: seoLocale === "en" ? "Files included" : "عدد الملفات",
              value: String(filesCount),
            },
          ]
        : []),
    ],
    offers: offerSchema(product.price, productCanonical, true, {
      sellerName: mentor?.name,
      sellerUrl: mentor ? mentorCanonical(mentorSlug, "/") : undefined,
    }),
    ...(reviews.length > 0
      ? {
          aggregateRating: aggregateRating({ count: reviews.length, value: roundedRating }),
          review: reviewSchemas(reviews as any[]),
        }
      : {}),
  };
  const faqSchema = faqPageSchema(faqs);

  return (
    <div className="min-h-screen bg-[#f8f8f9]" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <SeoHead
        title={`${product.title}${mentor ? ` — ${mentor.name}` : ""}`}
        description={plainText(product.description) || product.title}
        path={productCanonical}
        image={product.thumbnail_url || undefined}
        locale={seoLocale}
        ogType="product"
        price={{ amount: Number(product.price ?? 0) }}
        jsonLd={faqSchema ? [productSchema, faqSchema] : [productSchema]}
        breadcrumbs={[
          ...(mentor ? [{ name: mentor.name, url: mentorCanonical(mentorSlug, "/") }] : []),
          { name: product.title, url: productCanonical },
        ]}
      />
      {tenantDbId && <PixelInjector tenantId={tenantDbId} />}
      {mentor && <TenantThemeInjector primaryColor={mentor.primary_color} />}

      {mentor && (
        <CourseHeader
          mentor={mentor}
          mentorSlug={mentorSlug}
          profileUrl={urls.profileUrl()}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 overflow-x-clip">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start py-6 sm:py-8 lg:py-12">
          <div className="order-2 lg:order-1 lg:sticky lg:top-24 min-w-0">
            <ProductPurchaseCard
              product={product}
              isPurchased={isPurchased}
              reviews={reviews}
              roundedRating={roundedRating}
              communityLink={communityLink}
              productSlug={productSlug!}
              deliveryUrl={deliveryUrl}
              onBuy={handleBuy}
              samples={samples}
            />

            <ProductMobileBottomBar
              product={product}
              isPurchased={isPurchased}
              reviews={reviews}
              roundedRating={roundedRating}
              filesCount={filesCount}
              productSlug={productSlug!}
              deliveryUrl={deliveryUrl}
              onBuy={handleBuy}
              samples={samples}
            />

          </div>

          <div className="lg:col-span-2 order-1 lg:order-2 min-w-0 space-y-6 sm:space-y-8 lg:space-y-12">
            <ProductHero product={product} filesCount={filesCount} samples={samples} isPurchased={isPurchased} />

            <div id="section-features">
              <CourseFeatureBadges course={product} landingFeatures={landingFeatures} />
            </div>

            <CourseDescription course={product} kind="product" />

            {!isPurchased && samples.length > 0 && (
              <div className="lg:hidden">
                <DigitalProductSamplePreview samples={samples} />
              </div>
            )}

            {giftCourses.length > 0 && !isPurchased && (
              <div ref={giftCoursesRef}>
                {showGiftCourses && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseGiftCourses giftCourses={giftCourses} mentorPath={urls.mentorPath} />
                  </Suspense>
                )}
              </div>
            )}

            <div ref={reviewsRef}>
              {showReviews && (
                <Suspense fallback={<CoursePageSkeleton />}>
                  <CourseReviews reviews={reviews} isEnrolled={isPurchased} />
                </Suspense>
              )}
            </div>

            {faqs.length > 0 && (
              <div id="section-faqs" ref={faqsRef}>
                {showFaqs && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseFaqs faqs={faqs} />
                  </Suspense>
                )}
              </div>
            )}

            {mentor && (
              <div ref={mentorRef}>
                {showMentor && (
                  <Suspense fallback={<CoursePageSkeleton />}>
                    <CourseMentorCard mentor={mentor} profileUrl={urls.profileUrl()} />
                  </Suspense>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <TrustedBadge />
      <div className="lg:hidden h-40" aria-hidden="true" />
      <div className="lg:hidden">
        {mentor?.whatsapp_number && <MentorWhatsAppButton phoneNumber={mentor.whatsapp_number} liftOnMobile />}
      </div>
    </div>
  );
};

export default DigitalProductPage;
