import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n, { STORAGE_KEY, type Language } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePwaManifest } from "@/hooks/usePwaManifest";
import type { ProductPriceValue } from "@/components/mentor/ProductPriceDisplay";
import type { CourseData, StudentData, OrderData, CouponData, PageViewData, TenantData } from "../types";
import { mergeOrdersAndDp } from "../helpers";
import { queryClient } from "@/lib/queries";

interface DashboardBundleCache {
  courses?: CourseData[];
  students?: StudentData[];
  orders?: OrderData[];
  coupons?: CouponData[];
  refundRequests?: unknown[];
  digitalProducts?: Array<{ id: string; title: string }>;
  transactions?: unknown[];
  withdrawalData?: Record<string, string | null> | null;
  totalWithdrawn?: number;
  totalWithdrawnUsd?: number;
  totalBalanceAdjustments?: number;
  usdAdjustments?: number;
  usdSubsNet?: number;
}

export function useMentorDashboardData(activeTab: string) {
  const location = useLocation();
  const { tenantId: impersonatedTenantId } = useParams();
  const navigate = useNavigate();
  const { user, signOut, loading: isLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const isImpersonating =
    !!impersonatedTenantId &&
    (location.pathname.startsWith("/admin/impersonate/") ||
      location.pathname.startsWith("/impersonate/"));
  const [impersonatedMentorName, setImpersonatedMentorName] = useState("");

  // Synchronous cache hydration on hook initialization:
  // If tenant and dashboard bundle are already in queryClient memory,
  // hydrate all states synchronously so the dashboard renders in 0ms without loading screen!
  const initialCache = (() => {
    try {
      const lookupKey = isImpersonating && impersonatedTenantId
        ? ["mentor-tenant-impersonate", impersonatedTenantId]
        : user ? ["mentor-tenant", user.id] : null;
      if (!lookupKey) return null;
      const cachedTenant = queryClient.getQueryData<TenantData>(lookupKey);
      if (!cachedTenant) return null;
      const cachedBundle = queryClient.getQueryData<DashboardBundleCache>(["mentor-dashboard-bundle", cachedTenant.id]);
      return { tenant: cachedTenant, bundle: cachedBundle || null };
    } catch {
      return null;
    }
  })();

  const [tenantId, setTenantId] = useState<string | null>(() => initialCache?.tenant?.id || null);
  const [tenantSlug, setTenantSlug] = useState<string>(() => initialCache?.tenant?.slug || "");
  const [dataLoaded, setDataLoaded] = useState(() => Boolean(initialCache?.bundle));
  const [pageViews, setPageViews] = useState<PageViewData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>(() => initialCache?.bundle?.courses || []);
  const [students, setStudents] = useState<StudentData[]>(() => initialCache?.bundle?.students || []);
  const [orders, setOrders] = useState<OrderData[]>(() => initialCache?.bundle?.orders || []);
  const [coupons, setCoupons] = useState<CouponData[]>(() => initialCache?.bundle?.coupons || []);
  const [refundRequests, setRefundRequests] = useState<unknown[]>(() => initialCache?.bundle?.refundRequests || []);
  const [transactions, setTransactions] = useState<unknown[]>(() => initialCache?.bundle?.transactions || []);
  const [digitalProducts, setDigitalProducts] = useState<Array<{ id: string; title: string }>>(() => initialCache?.bundle?.digitalProducts || []);

  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem("profile_name_temp") || initialCache?.tenant?.name || "";
  });
  const [profileBio, setProfileBio] = useState(() => {
    return localStorage.getItem("profile_bio_temp") || initialCache?.tenant?.bio || "";
  });
  const [profileWhatsapp, setProfileWhatsapp] = useState(() => {
    return localStorage.getItem("profile_whatsapp_temp") || initialCache?.tenant?.whatsapp_number || "";
  });
  const [profileSpecialty, setProfileSpecialty] = useState(() => {
    return localStorage.getItem("profile_specialty_temp") || initialCache?.tenant?.specialty || "";
  });
  const [personalName, setPersonalName] = useState(() => {
    if (!initialCache?.tenant) return "";
    return [initialCache.tenant.first_name, initialCache.tenant.last_name].filter(Boolean).join(" ").trim() || initialCache.tenant.name || "";
  });
  const [whatsappDefaultColor, setWhatsappDefaultColor] = useState(() => initialCache?.tenant?.whatsapp_default_color ?? true);
  const [profileImageUrl, setProfileImageUrl] = useState(() => initialCache?.tenant?.profile_image_url || "");
  const [coverImageUrl, setCoverImageUrl] = useState(() => initialCache?.tenant?.cover_image_url || "");
  const [primaryColor, setPrimaryColor] = useState<string | null>(() => initialCache?.tenant?.primary_color || null);
  const [publicLanguage, setPublicLanguage] = useState<"ar" | "en">(() => (initialCache?.tenant?.public_language === "en" ? "en" : "ar"));

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Withdrawal settings
  const [withdrawalLegalName, setWithdrawalLegalName] = useState(() => initialCache?.bundle?.withdrawalData?.legal_name || "");
  const [withdrawalAddress, setWithdrawalAddress] = useState(() => initialCache?.bundle?.withdrawalData?.address || "");
  const [withdrawalAccountType, setWithdrawalAccountType] = useState<"personal" | "company">(() => (initialCache?.bundle?.withdrawalData?.account_type as "personal" | "company") || "personal");
  const [withdrawalBeneficiaryName, setWithdrawalBeneficiaryName] = useState(() => initialCache?.bundle?.withdrawalData?.beneficiary_name || "");
  const [withdrawalIban, setWithdrawalIban] = useState(() => initialCache?.bundle?.withdrawalData?.iban || "");
  const [withdrawalBankName, setWithdrawalBankName] = useState(() => initialCache?.bundle?.withdrawalData?.bank_name || "");
  const [withdrawalSettingsStatus, setWithdrawalSettingsStatus] = useState(() => initialCache?.bundle?.withdrawalData?.status || "");
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState(() => initialCache?.bundle?.withdrawalData?.rejection_reason || "");
  const [withdrawalNationalIdFront, setWithdrawalNationalIdFront] = useState<string | null>(() => initialCache?.bundle?.withdrawalData?.national_id_front_url || null);
  const [withdrawalNationalIdBack, setWithdrawalNationalIdBack] = useState<string | null>(() => initialCache?.bundle?.withdrawalData?.national_id_back_url || null);
  const [totalWithdrawn, setTotalWithdrawn] = useState(() => initialCache?.bundle?.totalWithdrawn || 0);
  const [totalWithdrawnUsd, setTotalWithdrawnUsd] = useState(() => initialCache?.bundle?.totalWithdrawnUsd || 0);
  const [usdAdjustments, setUsdAdjustments] = useState(() => initialCache?.bundle?.usdAdjustments || 0);
  const [usdSubsNet, setUsdSubsNet] = useState(() => initialCache?.bundle?.usdSubsNet || 0);
  const [totalBalanceAdjustments, setTotalBalanceAdjustments] = useState(() => initialCache?.bundle?.totalBalanceAdjustments || 0);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("mentor_dark_mode");
      if (stored !== null) return stored === "true";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  const getStoredDashboardLanguage = (): Language | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "en" || stored === "ar" ? stored : null;
    } catch {
      return null;
    }
  };

  const getStoredDashboardDarkMode = (): boolean | null => {
    try {
      const stored = localStorage.getItem("mentor_dark_mode");
      if (stored === "true") return true;
      if (stored === "false") return false;
      return null;
    } catch {
      return null;
    }
  };

  const applyDashboardPreferences = (language: Language, isDark: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      localStorage.setItem("mentor_dark_mode", String(isDark));
    } catch {
      /* ignore */
    }
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.lang = language;
    document.documentElement.classList.toggle("dark", isDark);
    setDarkMode(isDark);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mentor_dark_mode", String(next));
      } catch {
        /* ignore */
      }
      if (tenantId && !isImpersonating) {
        supabase
          .from("tenants")
          .update({ dashboard_dark_mode: next } as never)
          .eq("id", tenantId)
          .then(() => {
            /* fire-and-forget */
          });
      }
      return next;
    });
  };

  // Sync dark mode class to <html> element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [darkMode]);

  // Keep browser tab title in dashboard's language
  useEffect(() => {
    const previous = document.title;
    document.title = i18n.language?.startsWith("en") ? "Dashboard | Ebdaey" : "لوحة التحكم | إبداعي";
    return () => {
      document.title = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  // Installable mentor app identity
  usePwaManifest({
    name: i18n.language?.startsWith("en") ? "Ebdaey" : "إبداعي",
    shortName: i18n.language?.startsWith("en") ? "Ebdaey" : "إبداعي",
    startPath: `${window.location.pathname.startsWith("/app") ? "/app" : ""}/dashboard`,
    themeColor: "#00d655",
    dir: i18n.language?.startsWith("en") ? "ltr" : "rtl",
    lang: i18n.language?.startsWith("en") ? "en" : "ar",
  });

  const saveDashboardLanguage = (lang: Language) => {
    applyDashboardPreferences(lang, darkMode);
    if (!tenantId || isImpersonating) return;
    supabase
      .from("tenants")
      .update({ dashboard_language: lang } as never)
      .eq("id", tenantId)
      .then(() => {
        /* fire-and-forget */
      });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Check auth and permissions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const requiredRole = isImpersonating ? "admin" : "mentor";
      const roleKey = ["mentor-role", user.id, requiredRole];
      let roleAllowed = queryClient.getQueryData<boolean>(roleKey);
      if (roleAllowed === undefined) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", requiredRole as never)
          .maybeSingle();
        roleAllowed = !!roleRow;
        queryClient.setQueryData(roleKey, roleAllowed);
      }
      if (!roleAllowed) {
        toast({
          title: t("mentorDashboard.toast.notAllowed"),
          description: isImpersonating
            ? t("mentorDashboard.toast.noPermission")
            : t("mentorDashboard.toast.notMentor"),
          variant: "destructive",
        });
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
        return;
      }
      // Enforce onboarding completeness for mentors (not for admin impersonation)
      let preloadedTenant: TenantData | null = null;
      if (!isImpersonating) {
        const tenantLookupKey = ["mentor-tenant", user.id];
        const cachedTenant = queryClient.getQueryData<TenantData>(tenantLookupKey);
        if (cachedTenant) {
          preloadedTenant = cachedTenant;
        } else {
          const { data: tenant } = await supabase
            .from("tenants")
            .select(
              "id, slug, name, first_name, last_name, bio, whatsapp_number, whatsapp_default_color, profile_image_url, cover_image_url, primary_color, specialty, public_language, dashboard_language, dashboard_dark_mode, phone",
            )
            .eq("owner_id", user.id)
            .maybeSingle();
          const tenantRecord = tenant as { phone?: string; specialty?: string; name?: string } | null;
          const incomplete =
            !tenantRecord ||
            !tenantRecord.phone?.trim() ||
            !tenantRecord.specialty?.trim() ||
            !tenantRecord.name?.trim();
          if (incomplete) {
            navigate("/auth?resume=1", { replace: true });
            return;
          }
          preloadedTenant = tenant as unknown as TenantData;
          queryClient.setQueryData(tenantLookupKey, preloadedTenant);
        }
      }
      loadTenantData(preloadedTenant);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isImpersonating]);

  // Load page views for analytics (only for overview tab, cached in state)
  useEffect(() => {
    if (!tenantId || activeTab !== "overview" || pageViews.length > 0) return;
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    supabase
      .from("page_views" as never)
      .select("created_at, device, os, country, source, path")
      .eq("tenant_id", tenantId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => setPageViews((data as unknown as PageViewData[]) || []));
  }, [tenantId, activeTab, pageViews.length]);

  const refreshOrders = async () => {
    if (!tenantId) return;
    const [coursesOrders, dpPurchases, livePurchases] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "*, students(full_name, email, phone), courses!orders_course_id_fkey(title, price), coupons(code, discount_type, discount_value)",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_product_purchases")
        .select(
          "*, students(full_name, email, phone), digital_products!digital_product_purchases_digital_product_id_fkey(title, price)",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("live_course_purchases")
        .select(
          "*, students(full_name, email, phone), live_courses!live_course_purchases_live_course_id_fkey(title, price, product_type)",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);
    const merged = mergeOrdersAndDp(
      coursesOrders.data as unknown as OrderData[],
      dpPurchases.data as unknown as OrderData[],
      livePurchases.data as unknown as OrderData[],
    );
    setOrders(merged);
    const cacheKey = ["mentor-dashboard-bundle", tenantId];
    const cached = queryClient.getQueryData<DashboardBundleCache>(cacheKey);
    if (cached) {
      queryClient.setQueryData(cacheKey, { ...cached, orders: merged });
    }
  };

  // Refresh data when switching to orders tab
  useEffect(() => {
    if (activeTab === "orders" && tenantId) {
      refreshOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tenantId]);

  const loadTenantData = async (preloadedTenant?: TenantData | null) => {
    let tenant: TenantData | null = preloadedTenant ?? null;

    if (!tenant) {
      if (isImpersonating && impersonatedTenantId) {
        const { data } = await supabase
          .from("tenants")
          .select(
            "id, slug, name, first_name, last_name, bio, whatsapp_number, whatsapp_default_color, profile_image_url, cover_image_url, primary_color, specialty, public_language, dashboard_language, dashboard_dark_mode",
          )
          .eq("id", impersonatedTenantId)
          .single();
        tenant = data as unknown as TenantData | null;
        if (tenant) setImpersonatedMentorName(tenant.name || tenant.slug);
      } else {
        const { data } = await supabase
          .from("tenants")
          .select(
            "id, slug, name, first_name, last_name, bio, whatsapp_number, whatsapp_default_color, profile_image_url, cover_image_url, primary_color, specialty, public_language, dashboard_language, dashboard_dark_mode",
          )
          .eq("owner_id", user!.id)
          .single();
        tenant = data as unknown as TenantData | null;
      }
    }

    if (!tenant) {
      setDataLoaded(true);
      return;
    }

    const tenantLookupKey = isImpersonating && impersonatedTenantId
      ? ["mentor-tenant-impersonate", impersonatedTenantId]
      : user ? ["mentor-tenant", user.id] : null;
    if (tenantLookupKey) {
      queryClient.setQueryData(tenantLookupKey, tenant);
    }

    setTenantId(tenant.id);
    setTenantSlug(tenant.slug);
    setProfileName(tenant.name || "");
    setPersonalName([tenant.first_name, tenant.last_name].filter(Boolean).join(" ").trim() || tenant.name || "");
    setProfileBio(tenant.bio || "");
    setProfileWhatsapp(tenant.whatsapp_number || "");
    setProfileSpecialty(tenant.specialty || "");
    localStorage.removeItem("profile_name_temp");
    localStorage.removeItem("profile_bio_temp");
    localStorage.removeItem("profile_whatsapp_temp");
    localStorage.removeItem("profile_specialty_temp");
    setWhatsappDefaultColor(tenant.whatsapp_default_color ?? true);
    setProfileImageUrl(tenant.profile_image_url || "");
    setCoverImageUrl(tenant.cover_image_url || "");
    setPrimaryColor(tenant.primary_color || null);
    setPublicLanguage(tenant.public_language === "en" ? "en" : "ar");

    const accountLanguage: Language = tenant.dashboard_language === "en" ? "en" : "ar";
    const accountDarkMode = Boolean(tenant.dashboard_dark_mode);
    const storedLanguage = getStoredDashboardLanguage();
    const storedDarkMode = getStoredDashboardDarkMode();
    const bootstrapLanguage = accountLanguage === "ar" && storedLanguage === "en";
    const bootstrapDarkMode = !accountDarkMode && storedDarkMode === true;
    const effectiveLanguage = bootstrapLanguage ? storedLanguage : accountLanguage;
    const effectiveDarkMode = bootstrapDarkMode ? storedDarkMode : accountDarkMode;
    applyDashboardPreferences(effectiveLanguage, effectiveDarkMode);

    if (!isImpersonating && (bootstrapLanguage || bootstrapDarkMode)) {
      supabase
        .from("tenants")
        .update({ dashboard_language: effectiveLanguage, dashboard_dark_mode: effectiveDarkMode } as never)
        .eq("id", tenant.id)
        .then(() => {
          /* fire-and-forget */
        });
    }

    const cacheKey = ["mentor-dashboard-bundle", tenant.id];
    const cached = queryClient.getQueryData<DashboardBundleCache>(cacheKey);
    if (cached) {
      setCourses(cached.courses || []);
      setStudents(cached.students || []);
      setOrders(cached.orders || []);
      setCoupons(cached.coupons || []);
      setRefundRequests(cached.refundRequests || []);
      setDigitalProducts(cached.digitalProducts || []);
      setTransactions(cached.transactions || []);
      if (cached.withdrawalData) {
        setWithdrawalLegalName(cached.withdrawalData.legal_name || "");
        setWithdrawalAddress(cached.withdrawalData.address || "");
        setWithdrawalAccountType((cached.withdrawalData.account_type || "personal") as "company" | "personal");
        setWithdrawalBeneficiaryName(cached.withdrawalData.beneficiary_name || "");
        setWithdrawalIban(cached.withdrawalData.iban || "");
        setWithdrawalBankName(cached.withdrawalData.bank_name || "");
        setWithdrawalSettingsStatus(cached.withdrawalData.status || "");
        setWithdrawalRejectionReason(cached.withdrawalData.rejection_reason || "");
        setWithdrawalNationalIdFront(cached.withdrawalData.national_id_front_url || null);
        setWithdrawalNationalIdBack(cached.withdrawalData.national_id_back_url || null);
      }
      setTotalWithdrawn(cached.totalWithdrawn || 0);
      setTotalWithdrawnUsd(cached.totalWithdrawnUsd || 0);
      setTotalBalanceAdjustments(cached.totalBalanceAdjustments || 0);
      setUsdAdjustments(cached.usdAdjustments || 0);
      setUsdSubsNet(cached.usdSubsNet || 0);
      setDataLoaded(true);
    }

    const [
      coursesRes,
      studentsRes,
      ordersRes,
      dpPurchasesRes,
      livePurchasesRes,
      couponsRes,
      withdrawalRes,
      refundsRes,
      dpRes,
      txRes,
      wrRes,
      balanceAdjustmentsRes,
      usdSubsRes,
    ] = await Promise.all([
      supabase.from("courses").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      supabase.from("students").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "*, students(full_name, email, phone), courses!orders_course_id_fkey(title, price), coupons(code, discount_type, discount_value)",
        )
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_product_purchases")
        .select(
          "*, students(full_name, email, phone), digital_products!digital_product_purchases_digital_product_id_fkey(title, price)",
        )
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("live_course_purchases")
        .select(
          "*, students(full_name, email, phone), live_courses!live_course_purchases_live_course_id_fkey(title, price, product_type)",
        )
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      supabase.from("withdrawal_settings").select("*").eq("tenant_id", tenant.id).maybeSingle(),
      supabase
        .from("refund_requests")
        .select("*, students(full_name, email), orders(gross_amount, courses!orders_course_id_fkey(title))")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_products")
        .select("id, title")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("amount, status, currency").eq("tenant_id", tenant.id),
      supabase.from("balance_adjustments").select("amount, currency").eq("tenant_id", tenant.id),
      supabase
        .from("subscription_purchases")
        .select("mentor_net")
        .eq("tenant_id", tenant.id)
        .eq("gateway", "stripe")
        .eq("payment_status", "completed"),
    ]);

    let finalCourses: CourseData[] = [];
    if (coursesRes.data) {
      const courseRows = coursesRes.data as CourseData[];
      const courseIds = courseRows.map((course) => course.id);
      const { data: priceRows } = courseIds.length
        ? await supabase
            .from("product_prices")
            .select("product_id,country_code,currency,price")
            .eq("product_type", "course")
            .in("product_id", courseIds)
            .order("sort_order")
        : { data: [] };
      const typedPriceRows = (priceRows || []) as Array<{
        product_id: string;
        country_code: string;
        currency: string;
        price: number;
      }>;
      const pricesByCourse = new Map<string, ProductPriceValue[]>();
      typedPriceRows.forEach((row) => {
        const values = pricesByCourse.get(row.product_id) || [];
        values.push({ country_code: row.country_code, currency: row.currency, price: Number(row.price) || 0 });
        pricesByCourse.set(row.product_id, values);
      });
      finalCourses = courseRows.map((course) => ({ ...course, product_prices: pricesByCourse.get(course.id) || [] }));
      setCourses(finalCourses);
    }
    const finalStudents = (studentsRes.data as StudentData[]) || [];
    setStudents(finalStudents);

    const finalOrders = mergeOrdersAndDp(
      ordersRes.data as unknown as OrderData[],
      dpPurchasesRes.data as unknown as OrderData[],
      livePurchasesRes.data as unknown as OrderData[],
    );
    setOrders(finalOrders);

    const finalCoupons = (couponsRes.data as CouponData[]) || [];
    setCoupons(finalCoupons);

    const finalRefunds = refundsRes.data || [];
    setRefundRequests(finalRefunds);

    const finalDp = (dpRes.data as Array<{ id: string; title: string }>) || [];
    setDigitalProducts(finalDp);

    const finalTx = txRes.data || [];
    setTransactions(finalTx);

    let finalWithdrawalData: Record<string, string | null> | null = null;
    if (withdrawalRes.data) {
      const wData = withdrawalRes.data as Record<string, unknown>;
      finalWithdrawalData = {
        legal_name: (wData.legal_name as string) || "",
        address: (wData.address as string) || "",
        account_type: (wData.account_type as string) || "personal",
        beneficiary_name: (wData.beneficiary_name as string) || "",
        iban: (wData.iban as string) || "",
        bank_name: (wData.bank_name as string) || "",
        status: (wData.status as string) || "",
        rejection_reason: (wData.rejection_reason as string) || "",
        national_id_front_url: (wData.national_id_front_url as string) || null,
        national_id_back_url: (wData.national_id_back_url as string) || null,
      };
      setWithdrawalLegalName(finalWithdrawalData.legal_name || "");
      setWithdrawalAddress(finalWithdrawalData.address || "");
      setWithdrawalAccountType((finalWithdrawalData.account_type as "personal" | "company") || "personal");
      setWithdrawalBeneficiaryName(finalWithdrawalData.beneficiary_name || "");
      setWithdrawalIban(finalWithdrawalData.iban || "");
      setWithdrawalBankName(finalWithdrawalData.bank_name || "");
      setWithdrawalSettingsStatus(finalWithdrawalData.status || "");
      setWithdrawalRejectionReason(finalWithdrawalData.rejection_reason || "");
      setWithdrawalNationalIdFront(finalWithdrawalData.national_id_front_url || null);
      setWithdrawalNationalIdBack(finalWithdrawalData.national_id_back_url || null);
    }

    let finalTotalWithdrawn = 0;
    let finalTotalWithdrawnUsd = 0;
    if (wrRes.data) {
      const typedWithdrawals = wrRes.data as Array<{ status: string; currency?: string; amount?: number }>;
      const done = typedWithdrawals.filter((w) =>
        ["approved", "completed", "paid"].includes(String(w.status).toLowerCase()),
      );
      finalTotalWithdrawn = done
        .filter((w) => (w.currency || "EGP") === "EGP")
        .reduce((sum: number, w) => sum + Number(w.amount || 0), 0);
      finalTotalWithdrawnUsd = done
        .filter((w) => w.currency === "USD")
        .reduce((sum: number, w) => sum + Number(w.amount || 0), 0);
      setTotalWithdrawn(finalTotalWithdrawn);
      setTotalWithdrawnUsd(finalTotalWithdrawnUsd);
    }
    let finalTotalBalanceAdjustments = 0;
    let finalUsdAdjustments = 0;
    if (balanceAdjustmentsRes.data) {
      const typedAdjustments = balanceAdjustmentsRes.data as Array<{ currency?: string; amount?: number }>;
      finalTotalBalanceAdjustments = typedAdjustments
        .filter((a) => (a.currency || "EGP") !== "USD")
        .reduce((sum, adjustment) => sum + Number(adjustment.amount || 0), 0);
      finalUsdAdjustments = typedAdjustments
        .filter((a) => a.currency === "USD")
        .reduce((sum, a) => sum + Number(a.amount || 0), 0);
      setTotalBalanceAdjustments(finalTotalBalanceAdjustments);
      setUsdAdjustments(finalUsdAdjustments);
    }
    const typedUsdSubs = (usdSubsRes.data || []) as Array<{ mentor_net?: number }>;
    const finalUsdSubsNet = typedUsdSubs.reduce((a, r) => a + Number(r.mentor_net || 0), 0);
    setUsdSubsNet(finalUsdSubsNet);

    queryClient.setQueryData(cacheKey, {
      courses: finalCourses,
      students: finalStudents,
      orders: finalOrders,
      coupons: finalCoupons,
      refundRequests: finalRefunds,
      digitalProducts: finalDp,
      transactions: finalTx,
      withdrawalData: finalWithdrawalData,
      totalWithdrawn: finalTotalWithdrawn,
      totalWithdrawnUsd: finalTotalWithdrawnUsd,
      totalBalanceAdjustments: finalTotalBalanceAdjustments,
      usdAdjustments: finalUsdAdjustments,
      usdSubsNet: finalUsdSubsNet,
    });

    setDataLoaded(true);
  };

  const uploadImage = async (file: File, type: "profile" | "cover") => {
    if (!tenantId) return;
    const setter = type === "profile" ? setUploadingProfile : setUploadingCover;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("course-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-assets").getPublicUrl(path);

      const updateField = type === "profile" ? "profile_image_url" : "cover_image_url";
      await supabase
        .from("tenants")
        .update({ [updateField]: publicUrl } as never)
        .eq("id", tenantId);

      if (type === "profile") setProfileImageUrl(publicUrl);
      else setCoverImageUrl(publicUrl);

      toast({ title: t("mentorDashboard.toast.imageUploaded") });
    } catch {
      toast({ title: t("mentorDashboard.toast.imageUploadError"), variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  const uploadNationalId = async (file: File, side: "front" | "back") => {
    if (!tenantId) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${tenantId}/national-id-${side}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("mentor-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({
        title: t("mentorDashboard.toast.imageUploadFailed"),
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
    if (side === "front") setWithdrawalNationalIdFront(path);
    else setWithdrawalNationalIdBack(path);
    return path;
  };

  const saveWithdrawalSettings = async () => {
    if (!tenantId) return;
    if (
      !withdrawalLegalName ||
      !withdrawalAddress ||
      !withdrawalAccountType ||
      !withdrawalBeneficiaryName ||
      !withdrawalIban ||
      !withdrawalBankName ||
      !withdrawalNationalIdFront ||
      !withdrawalNationalIdBack
    ) {
      toast({
        title: t("mentorDashboard.toast.fillAllFields"),
        variant: "destructive",
      });
      return;
    }
    await supabase.from("withdrawal_settings").upsert(
      {
        tenant_id: tenantId,
        legal_name: withdrawalLegalName,
        address: withdrawalAddress,
        account_type: withdrawalAccountType,
        beneficiary_name: withdrawalBeneficiaryName,
        iban: withdrawalIban,
        bank_name: withdrawalBankName,
        national_id_front_url: withdrawalNationalIdFront,
        national_id_back_url: withdrawalNationalIdBack,
        status: "pending",
      } as never,
      { onConflict: "tenant_id" },
    );
    setWithdrawalSettingsStatus("pending");
    toast({
      title: t("mentorDashboard.toast.withdrawalSent"),
      description: t("mentorDashboard.toast.withdrawalSentDesc"),
    });
  };

  // Financial calculations
  const paidEgp = orders.filter((o) => o.payment_status === "paid" && o.gateway !== "stripe");
  const paidUsd = orders.filter((o) => o.payment_status === "paid" && o.gateway === "stripe");
  const totalRevenue = paidEgp.reduce((a, o) => a + o.gross_amount, 0);
  const totalGatewayFees = paidEgp.reduce((a, o) => a + (o.gateway_fee || 0), 0);
  const totalMentorNet = paidEgp.reduce((a, o) => a + o.mentor_net, 0);
  const availableBalance = Math.max(0, totalMentorNet + totalBalanceAdjustments - totalWithdrawn);
  const usdMentorNet = paidUsd.reduce((a, o) => a + Number(o.mentor_net || 0), 0);
  const usdBalance = Math.max(
    0,
    Math.round((usdMentorNet + usdSubsNet + usdAdjustments - totalWithdrawnUsd) * 100) / 100,
  );

  return {
    user,
    isLoading,
    isImpersonating,
    impersonatedMentorName,
    tenantId,
    tenantSlug,
    setTenantSlug,
    dataLoaded,
    courses,
    setCourses,
    students,
    setStudents,
    orders,
    coupons,
    setCoupons,
    refundRequests,
    transactions,
    digitalProducts,
    pageViews,
    // Financials
    totalRevenue,
    totalGatewayFees,
    availableBalance,
    usdBalance,
    paidUsd,
    totalWithdrawn,
    totalWithdrawnUsd,
    // Profile
    profileName,
    setProfileName,
    personalName,
    setPersonalName,
    profileBio,
    setProfileBio,
    profileWhatsapp,
    setProfileWhatsapp,
    profileSpecialty,
    setProfileSpecialty,
    whatsappDefaultColor,
    profileImageUrl,
    setProfileImageUrl,
    coverImageUrl,
    setCoverImageUrl,
    primaryColor,
    setPrimaryColor,
    publicLanguage,
    setPublicLanguage,
    uploadingProfile,
    uploadingCover,
    uploadImage,
    // Withdrawal settings
    withdrawalLegalName,
    setWithdrawalLegalName,
    withdrawalAddress,
    setWithdrawalAddress,
    withdrawalAccountType,
    setWithdrawalAccountType,
    withdrawalBeneficiaryName,
    setWithdrawalBeneficiaryName,
    withdrawalBankName,
    setWithdrawalBankName,
    withdrawalIban,
    setWithdrawalIban,
    withdrawalSettingsStatus,
    withdrawalRejectionReason,
    withdrawalNationalIdFront,
    withdrawalNationalIdBack,
    uploadNationalId,
    saveWithdrawalSettings,
    // Preferences & actions
    darkMode,
    toggleDarkMode,
    saveDashboardLanguage,
    handleSignOut,
    loadTenantData,
    refreshOrders,
  };
}
