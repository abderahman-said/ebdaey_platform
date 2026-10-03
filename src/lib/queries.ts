import { applyLocalPrice } from "@/lib/localPrice";
import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchGiftDisplays, loadGiftCoursesFor } from "@/lib/giftItems";

// Singleton client (consumed in App.tsx and used directly for prefetching)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        // Don't retry on 404 or authentication errors
        if (error instanceof Error && error.message.includes('404')) return false;
        if (error instanceof Error && error.message.includes('auth')) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// ─── Query keys ───────────────────────────────────────────────
export const qk = {
  mentor: (slug: string) => ["mentor", slug] as const,
  mentorCourses: (tenantId: string) => ["mentor-courses", tenantId] as const,
  mentorPlans: (tenantId: string) => ["mentor-plans", tenantId] as const,
  mentorReviews: (tenantId: string) => ["mentor-reviews", tenantId] as const,
  course: (tenantSlug: string, courseSlug: string) => ["course", tenantSlug, courseSlug] as const,
  courseCurriculum: (courseId: string) => ["course-curriculum", courseId] as const,
  courseReviews: (courseId: string, tenantId: string) => ["course-reviews", courseId, tenantId] as const,
  courseGifts: (courseId: string) => ["course-gifts", courseId] as const,
  digitalProduct: (tenantSlug: string, productSlug: string) => ["digital-product", tenantSlug, productSlug] as const,
  liveCourse: (tenantSlug: string, courseSlug: string) => ["live-course", tenantSlug, courseSlug] as const,
};

export interface PublicTenantData {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  whatsapp_number: string | null;
  whatsapp_default_color: boolean | null;
  subscriptions_enabled: boolean | null;
  show_reviews_on_profile: boolean | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_x: string | null;
  social_tiktok: string | null;
  social_instagram: string | null;
}

interface PublicCurriculumLesson {
  id: string;
  section_id: string;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  is_preview: boolean;
  video_url?: string | null;
}

// ─── Fetchers ─────────────────────────────────────────────────
export const fetchMentor = async (slug: string): Promise<PublicTenantData | null> => {
  const cached = queryClient.getQueryData<PublicTenantData>(qk.mentor(slug));
  if (cached) return cached;

  const { data } = await supabase
    .from("public_tenants")
    .select(
      "id, name, bio, specialty, profile_image_url, cover_image_url, primary_color, whatsapp_number, whatsapp_default_color, subscriptions_enabled, show_reviews_on_profile, social_facebook, social_linkedin, social_youtube, social_x, social_tiktok, social_instagram",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    queryClient.setQueryData(qk.mentor(slug), data as unknown as PublicTenantData);
  }
  return (data as unknown as PublicTenantData) || null;
};

export const fetchMentorCourses = async (tenantId: string) => {
  const { data } = await supabase
    .from("courses")
    .select(
      "id, slug, title, description, price, thumbnail_url, banner_type, banner_video_url, price_before_discount, card_button_text, display_order, is_unlisted",
    )
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .order("display_order", { ascending: true });
  return (data || []).filter((c: { is_unlisted?: boolean }) => !c.is_unlisted);
};

export const fetchCourseBundle = async (tenantSlug: string, courseSlug: string) => {
  const tenant = await fetchMentor(tenantSlug);
  if (!tenant) return null;

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("slug", courseSlug)
    .maybeSingle();

  await applyLocalPrice("course", course);
  if (!course) return { tenant, course: null, sections: [], reviews: [], giftCourses: [], lessonsCount: 0 };

  const [sectionsRes, giftItems, reviewsRes, lessonsRes] = await Promise.all([
    supabase.from("course_sections").select("*").eq("course_id", course.id).order("sort_order"),
    loadGiftCoursesFor({ courseId: course.id }),
    supabase
      .from("reviews")
      .select("id, first_name, last_name, rating, rating_v2, comment, created_at")
      .eq("is_published", true)
      .eq("tenant_id", tenant.id)
      .or(`and(product_type.eq.course,product_id.eq.${course.id}),and(product_type.is.null,product_id.is.null,course_id.is.null),and(product_type.is.null,course_id.eq.${course.id})`)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("get_public_course_curriculum", { _course_id: course.id }),
  ]);

  const giftCourses = await fetchGiftDisplays(giftItems);
  const sectionsData = (sectionsRes.data || []) as Array<{ id: string; [key: string]: unknown }>;

  const lessonsBySection = new Map<string, PublicCurriculumLesson[]>();
  (((lessonsRes?.data as unknown) as PublicCurriculumLesson[]) || []).forEach((l) => {
    const arr = lessonsBySection.get(l.section_id) || [];
    arr.push(l);
    lessonsBySection.set(l.section_id, arr);
  });

  const sections = sectionsData.map((s) => ({
    ...s,
    lessons: lessonsBySection.get(s.id) || [],
  }));

  return {
    tenant,
    course,
    sections,
    reviews: reviewsRes.data || [],
    giftCourses,
    lessonsCount: (((lessonsRes?.data as unknown) as PublicCurriculumLesson[]) || []).length,
  };
};

// ─── Prefetch helpers (used on hover) ─────────────────────────
export const prefetchMentor = (slug: string) =>
  queryClient.prefetchQuery({ 
    queryKey: qk.mentor(slug), 
    queryFn: () => fetchMentor(slug),
    staleTime: 15 * 60 * 1000, // 15 minutes for mentor data
  });

export const prefetchCourse = (tenantSlug: string, courseSlug: string) =>
  queryClient.prefetchQuery({
    queryKey: qk.course(tenantSlug, courseSlug),
    queryFn: () => fetchCourseBundle(tenantSlug, courseSlug),
    staleTime: 10 * 60 * 1000, // 10 minutes for course data
  });

export const prefetchDigitalProduct = (tenantSlug: string, productSlug: string) =>
  queryClient.prefetchQuery({
    queryKey: qk.digitalProduct(tenantSlug, productSlug),
    queryFn: () => import("@/lib/digitalProductQueries").then(m => m.fetchDigitalProductBundle(tenantSlug, productSlug)),
    staleTime: 10 * 60 * 1000, // 10 minutes for product data
  });

export const prefetchLiveCourse = (tenantSlug: string, courseSlug: string) =>
  queryClient.prefetchQuery({
    queryKey: qk.liveCourse(tenantSlug, courseSlug),
    queryFn: () => import("@/lib/liveCourseQueries").then(m => m.fetchLiveCourseBundle(tenantSlug, courseSlug)),
    staleTime: 5 * 60 * 1000, // 5 minutes for live course data
  });
