import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, FileArchive, ChevronLeft, Megaphone, TrendingUp, Video } from "lucide-react";

const PlayCircleSolid = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
  </svg>
);
const UserChatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    <circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="currentColor" />
  </svg>
);
const SessionBundleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
    <path d="M15.5 6l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.5 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.5 18l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
import OrderBumpEditor from "./OrderBumpEditor";
import DigitalProductOrderBumpEditor from "./DigitalProductOrderBumpEditor";

interface Props {
  tenantId: string;
}

type ItemType = "course" | "product" | "live_course" | "consultation" | "session_bundle";

interface Item {
  id: string;
  title: string;
  type: ItemType;
  has_bump: boolean;
}

const iconFor = (type: ItemType, className = "w-5 h-5 text-primary shrink-0") => {
  if (type === "course") return <PlayCircleSolid className={className} />;
  if (type === "product") return <FileArchive className={className} />;
  if (type === "live_course") return <Video className={className} />;
  if (type === "session_bundle") return <SessionBundleIcon className={className} />;
  return <UserChatIcon className={className} />;
};

const PromotionalOffersManager = ({ tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ["mentor-promotional-offers", tenantId], [tenantId]);
  const cachedOffers = queryClient.getQueryData<Item[]>(cacheKey);

  const [loading, setLoading] = useState<boolean>(() => !cachedOffers);
  const [items, setItems] = useState<Item[]>(() => cachedOffers || []);
  const [searchParams, setSearchParams] = useSearchParams();
  const offerParam = searchParams.get("offer");
  const selected = offerParam ? items.find(i => `${i.type}-${i.id}` === offerParam) || null : null;

  const openItem = (item: Item) => {
    const next = new URLSearchParams(searchParams);
    next.set("offer", `${item.type}-${item.id}`);
    setSearchParams(next);
  };

  const closeItem = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("offer");
    setSearchParams(next);
    load(false);
  };

  useEffect(() => {
    const hasCache = Boolean(queryClient.getQueryData<Item[]>(cacheKey));
    load(hasCache);
  }, [tenantId]);

  const load = async (silent = false) => {
    if (!silent && !queryClient.getQueryData<Item[]>(cacheKey)) {
      setLoading(true);
    }
    const [coursesRes, productsRes, liveRes, bumpsCoursesRes, bumpsDpRes] = await Promise.all([
      supabase.from("courses").select("id, title").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("digital_products").select("id, title").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("live_courses").select("id, title, product_type").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("order_bumps").select("course_id, live_course_id, is_enabled").eq("tenant_id", tenantId),
      supabase.from("digital_product_order_bumps").select("digital_product_id, is_enabled").eq("tenant_id", tenantId),
    ]);

    const courseBumps = new Set(((bumpsCoursesRes.data as any[]) || []).filter(b => b.is_enabled && b.course_id).map(b => b.course_id));
    const liveBumps = new Set(((bumpsCoursesRes.data as any[]) || []).filter(b => b.is_enabled && b.live_course_id).map(b => b.live_course_id));
    const dpBumps = new Set(((bumpsDpRes.data as any[]) || []).filter(b => b.is_enabled).map(b => b.digital_product_id));

    const all: Item[] = [
      ...((coursesRes.data as any[]) || []).map(c => ({
        id: c.id,
        title: c.title,
        type: "course" as const,
        has_bump: courseBumps.has(c.id),
      })),
      ...((productsRes.data as any[]) || []).map(p => ({
        id: p.id,
        title: p.title,
        type: "product" as const,
        has_bump: dpBumps.has(p.id),
      })),
      ...((liveRes.data as any[]) || []).map(l => {
        let type: ItemType = "live_course";
        if (l.product_type === "consultation") type = "consultation";
        else if (l.product_type === "session_bundle") type = "session_bundle";
        return {
          id: l.id,
          title: l.title,
          type,
          has_bump: liveBumps.has(l.id),
        };
      }),
    ];

    setItems(all);
    queryClient.setQueryData(cacheKey, all);
    setLoading(false);
  };

  if (loading && items.length === 0) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const labelForType = (type: ItemType) => {
    if (type === "course") return t("promotionalOffers.kindCourse");
    if (type === "product") return t("promotionalOffers.kindProduct");
    if (type === "live_course") return t("promotionalOffers.tabs.liveCourses", { defaultValue: dir === "rtl" ? "الكورسات اللايف" : "Live courses" });
    if (type === "session_bundle") return t("promotionalOffers.tabs.sessionBundles", { defaultValue: dir === "rtl" ? "باقات الجلسات" : "Session bundles" });
    return t("promotionalOffers.tabs.consultations", { defaultValue: dir === "rtl" ? "الاستشارات" : "Consultations" });
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeItem}>
            <ChevronLeft className="w-4 h-4 ml-1" />
            {t("promotionalOffers.back")}
          </Button>
          <div className="flex items-center gap-2">
            {iconFor(selected.type, "w-5 h-5 text-primary")}
            <h2 className="font-bold text-lg text-foreground">{selected.title}</h2>
            <span className="text-xs text-muted-foreground">({labelForType(selected.type)})</span>
          </div>
        </div>

        <div className="max-w-2xl">
          {selected.type === "product" ? (
            <DigitalProductOrderBumpEditor digitalProductId={selected.id} tenantId={tenantId} />
          ) : selected.type === "course" ? (
            <OrderBumpEditor courseId={selected.id} tenantId={tenantId} />
          ) : (
            <OrderBumpEditor liveCourseId={selected.id} tenantId={tenantId} />
          )}
        </div>
      </div>
    );
  }

  const courses = items.filter(i => i.type === "course");
  const products = items.filter(i => i.type === "product");
  const liveCourses = items.filter(i => i.type === "live_course");
  const consultations = items.filter(i => i.type === "consultation");
  const sessionBundles = items.filter(i => i.type === "session_bundle");

  const renderList = (list: Item[]) => {
    if (!list.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("promotionalOffers.empty")}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map(item => (
          <Card
            key={`${item.type}-${item.id}`}
            className="p-0 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all overflow-hidden group relative"
            onClick={() => openItem(item)}
          >
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {iconFor(item.type)}
                <div className="min-w-0">
                  <span className="font-medium text-foreground truncate block">{item.title}</span>
                  <span className="text-[10px] text-muted-foreground">{labelForType(item.type)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.has_bump && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">{t("salesOffers.bumpTitle")}</span>
                )}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-primary text-primary-foreground py-2 text-center text-xs font-medium">
              {item.has_bump ? t("promotionalOffers.editBump") : t("promotionalOffers.addBump")}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const triggerCls = "flex-1 min-w-0 gap-1.5 sm:gap-2 rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200";

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" />{t("promotionalOffers.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("promotionalOffers.subtitle")}</p>
      </div>

      <Tabs defaultValue="all" dir={dir as any}>
        <div className="glass-card rounded-2xl p-1.5 mb-4">
          <TabsList className="w-full grid grid-cols-2 sm:flex sm:flex-nowrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="all" className={`${triggerCls} col-span-2 sm:col-span-1`}>
              <span>{t("promotionalOffers.tabs.all")} ({items.length})</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className={triggerCls}>
              <PlayCircleSolid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t("promotionalOffers.tabs.courses")} ({courses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="products" className={triggerCls}>
              <FileArchive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t("promotionalOffers.tabs.products")} ({products.length})</span>
            </TabsTrigger>
            <TabsTrigger value="live_courses" className={triggerCls}>
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{labelForType("live_course")} ({liveCourses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="consultations" className={triggerCls}>
              <UserChatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{labelForType("consultation")} ({consultations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="session_bundles" className={triggerCls}>
              <SessionBundleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{labelForType("session_bundle")} ({sessionBundles.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all" className="mt-4">{renderList(items)}</TabsContent>
        <TabsContent value="courses" className="mt-4">{renderList(courses)}</TabsContent>
        <TabsContent value="products" className="mt-4">{renderList(products)}</TabsContent>
        <TabsContent value="live_courses" className="mt-4">{renderList(liveCourses)}</TabsContent>
        <TabsContent value="consultations" className="mt-4">{renderList(consultations)}</TabsContent>
        <TabsContent value="session_bundles" className="mt-4">{renderList(sessionBundles)}</TabsContent>
      </Tabs>
    </div>
  );
};

export default PromotionalOffersManager;
