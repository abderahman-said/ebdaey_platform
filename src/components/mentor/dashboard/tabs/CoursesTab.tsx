import React, { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Plus,
  Eye,
  EyeOff,
  ExternalLink,
  Edit2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ProductPriceDisplay from "@/components/mentor/ProductPriceDisplay";
import VideoThumbnail from "@/components/media/VideoThumbnail";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMentorSiteUrl } from "@/lib/subdomain";
import { isBunnyUrl, deleteBunnyVideo } from "@/lib/bunny";
import { openExternal } from "@/lib/openExternal";
import { PlayCircleSolid } from "../navConfig";
import type { CourseData } from "../types";

const CourseEditor = lazy(() => import("@/components/mentor/CourseEditor"));

interface CoursesTabProps {
  courses: CourseData[];
  setCourses: React.Dispatch<React.SetStateAction<CourseData[]>>;
  tenantId: string;
  tenantSlug: string;
  editingCourseId: string | null;
  setEditingCourseId: (id: string | null) => void;
  editorInitialTab?: string;
  setEditorInitialTab: (tab?: string) => void;
  onReloadTenantData: () => void;
}

export default function CoursesTab({
  courses,
  setCourses,
  tenantId,
  tenantSlug,
  editingCourseId,
  setEditingCourseId,
  editorInitialTab,
  setEditorInitialTab,
  onReloadTenantData,
}: CoursesTabProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const { toast } = useToast();

  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const [coursesView, setCoursesView] = useState<"grid" | "table">(
    () =>
      (typeof window !== "undefined" &&
        (localStorage.getItem("mentor_courses_view") as "grid" | "table")) ||
      "grid",
  );

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("mentor_courses_view", coursesView);
  }, [coursesView]);

  const createCourse = async () => {
    if (!tenantId) return;
    const title = newCourseTitle.trim();
    if (!title) {
      toast({ title: "أدخل عنوان الدورة", variant: "destructive" });
      return;
    }
    const genSlug = () => {
      const letters = "abcdefghijklmnopqrstuvwyz";
      let s = "";
      for (let i = 0; i < 10; i++) s += letters[Math.floor(Math.random() * letters.length)];
      return s;
    };

    setCreatingCourse(true);
    let inserted: CourseData | null = null;
    let lastError: { message?: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = genSlug();
      const { data, error } = await supabase
        .from("courses")
        .insert({
          tenant_id: tenantId,
          title,
          slug,
          price: 0,
        })
        .select()
        .single();
      if (!error && data) {
        inserted = data as CourseData;
        break;
      }
      lastError = error;
      if (error && !String(error.message || "").toLowerCase().includes("duplicate")) break;
    }
    setCreatingCourse(false);

    if (inserted) {
      setCourses([inserted, ...courses]);
      setCreateCourseOpen(false);
      setNewCourseTitle("");
      setEditingCourseId(inserted.id);
      toast({ title: t("mentorDashboard.toast.createdCourse") });
    } else if (lastError) {
      toast({ title: t("mentorDashboard.toast.createError"), description: lastError.message, variant: "destructive" });
    }
  };

  const togglePublish = async (course: CourseData) => {
    // If we're trying to PUBLISH, first verify the course has a support method configured.
    if (!course.is_published) {
      const { data: full } = await supabase
        .from("courses")
        .select("has_community, has_individual_support")
        .eq("id", course.id)
        .maybeSingle();
      const fullCourse = full as { has_community?: boolean; has_individual_support?: boolean } | null;
      const hasSupport = Boolean(fullCourse?.has_community || fullCourse?.has_individual_support);
      if (!hasSupport) {
        toast({
          title: t("mentorDashboard.toast.chooseSupportTitle"),
          description: t("mentorDashboard.toast.chooseSupportDesc"),
          variant: "destructive",
        });
        setEditorInitialTab("additional-settings");
        setEditingCourseId(course.id);
        return;
      }
    }
    await supabase.from("courses").update({ is_published: !course.is_published }).eq("id", course.id);
    setCourses(courses.map((c) => (c.id === course.id ? { ...c, is_published: !c.is_published } : c)));
  };

  const deleteCourse = async (courseId: string) => {
    // Collect all Bunny video URLs (banner + every lesson) BEFORE deleting the DB rows
    const bunnyUrls: string[] = [];
    const course = courses.find((c) => c.id === courseId);
    if (course?.banner_video_url && isBunnyUrl(course.banner_video_url)) {
      bunnyUrls.push(course.banner_video_url);
    }
    try {
      const { data: sectionRows } = await supabase.from("course_sections").select("id").eq("course_id", courseId);
      const sectionIds = (sectionRows || []).map((s) => s.id);
      if (sectionIds.length) {
        const { data: lessonRows } = await supabase.from("lessons").select("video_url").in("section_id", sectionIds);
        for (const l of lessonRows || []) {
          if (l.video_url && isBunnyUrl(l.video_url)) bunnyUrls.push(l.video_url);
        }
      }
    } catch (e) {
      console.warn("Could not collect Bunny URLs before course delete:", e);
    }

    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      setCourseToDelete(null);
      toast({
        title: t("mentorDashboard.courses.deleteError"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setCourses(courses.filter((c) => c.id !== courseId));
    setCourseToDelete(null);
    toast({ title: t("mentorDashboard.toast.deletedCourse") });

    // Fire-and-forget Bunny cleanup (never block the user)
    if (bunnyUrls.length) void deleteBunnyVideo(bunnyUrls);
  };

  if (editingCourseId && tenantId) {
    return (
      <CourseEditor
        key={`${editingCourseId}-${editorInitialTab || "default"}`}
        courseId={editingCourseId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        initialTab={editorInitialTab}
        onBack={() => {
          setEditingCourseId(null);
          setEditorInitialTab(undefined);
          onReloadTenantData();
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PlayCircleSolid className="h-6 w-6 text-primary" />
            {t("mentorDashboard.courses.pageTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("mentorDashboard.courses.pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setCoursesView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                coursesView === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("mentorDashboard.courses.viewCards")}
            </button>
            <button
              type="button"
              onClick={() => setCoursesView("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                coursesView === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              {t("mentorDashboard.courses.viewTable")}
            </button>
          </div>
          <Button
            onClick={() => setCreateCourseOpen(true)}
            className="gradient-primary text-primary-foreground dark:bg-white dark:text-black border-0"
          >
            <Plus className="w-4 h-4 ml-2" />
            {t("mentorDashboard.courses.new")}
          </Button>
        </div>
      </div>

      <Dialog open={createCourseOpen} onOpenChange={setCreateCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mentorDashboard.courses.newDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("mentorDashboard.courses.titleLabel")}</Label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder={t("mentorDashboard.courses.titlePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creatingCourse) createCourse();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCourseOpen(false)}>
              {t("mentorDashboard.courses.cancel")}
            </Button>
            <Button onClick={createCourse} disabled={creatingCourse}>
              {creatingCourse ? t("mentorDashboard.courses.creating") : t("mentorDashboard.courses.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {coursesView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group glass-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
            >
              <div
                className="relative aspect-video shrink-0 bg-muted overflow-hidden cursor-pointer"
                onClick={() => setEditingCourseId(course.id)}
              >
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : course.banner_type === "video" && course.banner_video_url ? (
                  <VideoThumbnail videoUrl={course.banner_video_url} alt={course.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                    <BookOpen className="w-10 h-10 text-muted-foreground/60" />
                  </div>
                )}
              </div>

              <div className="p-4 min-h-0 flex-1 flex flex-col">
                <div
                  className="cursor-pointer mb-3 min-h-0 flex-1"
                  onClick={() => setEditingCourseId(course.id)}
                >
                  <h3 className="font-bold text-base mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        course.is_published
                          ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                      }`}
                    >
                      {course.is_published
                        ? t("mentorDashboard.courses.published")
                        : t("mentorDashboard.courses.draft")}
                    </span>
                    <ProductPriceDisplay
                      basePrice={course.price}
                      prices={course.product_prices}
                      freeLabel={t("mentorDashboard.free")}
                      className="font-semibold text-foreground shrink-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_36px_36px_36px] items-center gap-2 pt-3 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCourseId(course.id)}
                    className="h-9 min-w-0 gap-1.5"
                  >
                    <Edit2 className="h-4 w-4" /> {t("mentorDashboard.courses.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePublish(course)}
                    className="h-9 w-9 p-0"
                    title={
                      course.is_published
                        ? t("mentorDashboard.courses.unpublish")
                        : t("mentorDashboard.courses.publish")
                    }
                  >
                    {course.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {course.is_published ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      title={t("profileTab.previewSite")}
                      onClick={() => openExternal(getMentorSiteUrl(tenantSlug || "", `/c/${course.slug}`))}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-9 w-9 p-0"
                      title={t("profileTab.previewSite")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCourseToDelete(course.id)}
                    title={t("mentorDashboard.courses.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="glass-card rounded-xl p-8 sm:p-12 text-center col-span-full">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("mentorDashboard.courses.empty")}</p>
              <Button
                onClick={() => setCreateCourseOpen(true)}
                className="gradient-primary text-primary-foreground border-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 ml-2" />
                {t("mentorDashboard.courses.createFirst")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          {courses.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{t("mentorDashboard.courses.empty")}</p>
              <Button
                onClick={() => setCreateCourseOpen(true)}
                className="gradient-primary text-primary-foreground border-0"
              >
                <Plus className="w-4 h-4 ml-2" />
                {t("mentorDashboard.courses.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-end p-4 font-medium text-muted-foreground">
                      {t("mentorDashboard.courses.col.course")}
                    </th>
                    <th className="text-end p-4 font-medium text-muted-foreground hidden md:table-cell">
                      {t("mentorDashboard.courses.col.slug")}
                    </th>
                    <th className="text-end p-4 font-medium text-muted-foreground">
                      {t("mentorDashboard.courses.col.price")}
                    </th>
                    <th className="text-end p-4 font-medium text-muted-foreground">
                      {t("mentorDashboard.courses.col.status")}
                    </th>
                    <th className="text-end p-4 font-medium text-muted-foreground">
                      {t("mentorDashboard.courses.col.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setEditingCourseId(course.id)}
                        >
                          <div className="w-14 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                            {course.thumbnail_url ? (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : course.banner_type === "video" && course.banner_video_url ? (
                              <VideoThumbnail videoUrl={course.banner_video_url} alt={course.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium line-clamp-1 hover:text-primary transition-colors">
                            {course.title}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                        {course.slug}
                      </td>
                      <td className="p-3 font-semibold whitespace-nowrap">
                        <ProductPriceDisplay
                          basePrice={course.price}
                          prices={course.product_prices}
                          freeLabel={t("mentorDashboard.free")}
                        />
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            course.is_published
                              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                          }`}
                        >
                          {course.is_published
                            ? t("mentorDashboard.courses.published")
                            : t("mentorDashboard.courses.draft")}
                        </span>
                      </td>
                      <td className="p-3">
                        <TooltipProvider delayDuration={200}>
                          <div className="flex gap-1.5">
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => togglePublish(course)}
                                >
                                  {course.is_published ? (
                                    <>
                                      <EyeOff className="w-4 h-4" />
                                      <span className="mr-1.5 text-xs">
                                        {t("mentorDashboard.courses.unpublish")}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4" />
                                      <span className="mr-1.5 text-xs">
                                        {t("mentorDashboard.courses.publish")}
                                      </span>
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {course.is_published
                                  ? t("mentorDashboard.courses.unpublish")
                                  : t("mentorDashboard.courses.publish")}
                              </TooltipContent>
                            </UITooltip>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingCourseId(course.id)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("mentorDashboard.courses.edit")}</TooltipContent>
                            </UITooltip>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => setCourseToDelete(course.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("mentorDashboard.courses.delete")}</TooltipContent>
                            </UITooltip>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mentorDashboard.courses.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mentorDashboard.courses.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t("mentorDashboard.courses.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => courseToDelete && deleteCourse(courseToDelete)}
            >
              {t("mentorDashboard.courses.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
