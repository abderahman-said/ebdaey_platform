import { useState, useEffect } from "react";
import { Plus, Trash2, Bell, Mail, Send, Clock, Eye, Users, BookOpen, ChevronLeft, Calendar, Search, Filter } from "lucide-react";
import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const availableIcons = [
  "Bell", "Star", "Heart", "Award", "Trophy", "Zap", "Shield", "CheckCircle",
  "BookOpen", "GraduationCap", "Lightbulb", "Rocket", "Crown", "Gem",
  "ThumbsUp", "Clock", "Users", "Globe", "Gift", "PartyPopper",
  "Megaphone", "AlertCircle", "Info", "MessageCircle", "Mail",
  "Calendar", "TrendingUp", "Sparkles", "Flame", "Target",
];

// Template variables consumed by the backend — keep as Arabic literals
const VAR_STUDENT = "{{اسم_الطالب}}";
const VAR_COURSE = "{{اسم_الكورس}}";

interface CourseOption {
  id: string;
  title: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  icon_name: string;
  link_url: string | null;
  channel_bell: boolean;
  channel_email: boolean;
  email_subject: string | null;
  email_body: string | null;
  email_cta_text: string | null;
  email_cta_url: string | null;
  target_type: string;
  target_course_ids: string[];
  is_scheduled: boolean;
  scheduled_at: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  email_open_count: number;
  created_at: string;
}

interface NotificationsManagerProps {
  tenantId: string;
}

const INITIAL_FORM = {
  title: "",
  description: "",
  icon_name: "Bell",
  link_url: "",
  channel_bell: true,
  channel_email: false,
  email_subject: "",
  email_body: "",
  email_cta_text: "",
  email_cta_url: "",
  target_type: "all",
  target_course_ids: [] as string[],
  is_scheduled: false,
  scheduled_at: "",
};

const NotificationsManager = ({ tenantId }: NotificationsManagerProps) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dir: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";
  const dateLocale = isRtl ? "ar-EG" : "en-US";
  const [activeSubTab, setActiveSubTab] = useState<"send" | "history">("send");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"bell" | "email">("bell");
  const [sending, setSending] = useState(false);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  useEffect(() => {
    loadStudentCount();
  }, [tenantId, form.target_type, form.target_course_ids]);

  const loadData = async () => {
    setLoading(true);
    const [campaignsRes, coursesRes] = await Promise.all([
      supabase
        .from("notification_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("courses")
        .select("id, title")
        .eq("tenant_id", tenantId)
        .eq("is_published", true)
        .order("title"),
    ]);
    setCampaigns((campaignsRes.data as Campaign[]) || []);
    setCourses((coursesRes.data as CourseOption[]) || []);
    setLoading(false);
  };

  const loadStudentCount = async () => {
    if (!tenantId) {
      setStudentCount(0);
      return;
    }
    try {
      if (form.target_type === "all") {
        const { data, error } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("tenant_id", tenantId);
        if (error) console.error("count all error", error);
        const unique = new Set((data || []).map((e: any) => e.student_id));
        setStudentCount(unique.size);
      } else if (form.target_course_ids.length > 0) {
        const { data, error } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("tenant_id", tenantId)
          .in("course_id", form.target_course_ids);
        if (error) console.error("count specific error", error);
        const unique = new Set((data || []).map((e: any) => e.student_id));
        setStudentCount(unique.size);
      } else {
        setStudentCount(0);
      }
    } catch (e) {
      console.error("loadStudentCount exception", e);
      setStudentCount(0);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim()) {
      toast({ title: t("notificationsManager.toast.needTitle"), variant: "destructive" });
      return;
    }
    if (!form.channel_bell && !form.channel_email) {
      toast({ title: t("notificationsManager.toast.needChannel"), variant: "destructive" });
      return;
    }
    if (form.channel_email && !form.email_subject?.trim()) {
      toast({ title: t("notificationsManager.toast.needSubject"), variant: "destructive" });
      return;
    }
    if (form.target_type === "specific_courses" && form.target_course_ids.length === 0) {
      toast({ title: t("notificationsManager.toast.needCourses"), variant: "destructive" });
      return;
    }
    if (form.is_scheduled && !form.scheduled_at) {
      toast({ title: t("notificationsManager.toast.needSchedule"), variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const campaignData = {
        tenant_id: tenantId,
        title: form.title,
        description: form.description || null,
        icon_name: form.icon_name,
        link_url: form.link_url || null,
        channel_bell: form.channel_bell,
        channel_email: form.channel_email,
        email_subject: form.email_subject || null,
        email_body: form.email_body || null,
        email_cta_text: form.email_cta_text || null,
        email_cta_url: form.email_cta_url || null,
        target_type: form.target_type,
        target_course_ids: form.target_course_ids,
        is_scheduled: form.is_scheduled,
        scheduled_at: form.is_scheduled ? form.scheduled_at : null,
        status: form.is_scheduled ? "scheduled" : "sent",
        total_recipients: studentCount,
        sent_count: form.is_scheduled ? 0 : studentCount,
      };

      await supabase.from("notification_campaigns").insert(campaignData as any);

      if (form.channel_bell && !form.is_scheduled) {
        await supabase.from("notifications").insert({
          tenant_id: tenantId,
          icon_name: form.icon_name,
          title: form.title,
          description: form.description || null,
          source: "mentor",
        } as any);
      }

      toast({
        title: form.is_scheduled
          ? t("notificationsManager.toast.scheduled")
          : t("notificationsManager.toast.sent"),
      });
      setForm(INITIAL_FORM);
      loadData();
    } catch {
      toast({ title: t("notificationsManager.toast.sendError"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("notification_campaigns").delete().eq("id", deleteId);
    toast({ title: t("notificationsManager.toast.deleted") });
    setDeleteId(null);
    loadData();
  };

  const renderIcon = (name: string, className = "w-5 h-5") => {
    const Icon = (icons as Record<string, LucideIcon>)[name] || icons.Bell;
    return <Icon className={className} />;
  };

  const toggleCourseId = (id: string) => {
    setForm(prev => ({
      ...prev,
      target_course_ids: prev.target_course_ids.includes(id)
        ? prev.target_course_ids.filter(c => c !== id)
        : [...prev.target_course_ids, id],
    }));
  };

  const statusBadge = (status: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      scheduled: "secondary",
      draft: "outline",
      partial_failure: "destructive",
      failed: "destructive",
    };
    const variant = variantMap[status] || "outline";
    const label = t(`notificationsManager.status.${status}`, { defaultValue: status });
    return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
  };

  const channelBadges = (bell: boolean, email: boolean) => (
    <div className="flex gap-1">
      {bell && <Badge variant="outline" className="text-[10px] gap-1"><Bell className="w-3 h-3" />{t("notificationsManager.history.channelBell")}</Badge>}
      {email && <Badge variant="outline" className="text-[10px] gap-1"><Mail className="w-3 h-3" />{t("notificationsManager.history.channelEmail")}</Badge>}
    </div>
  );

  const targetLabel = (c: Campaign) => {
    if (c.target_type === "all") return t("notificationsManager.history.targetAll");
    const names = c.target_course_ids
      ?.map(id => courses.find(co => co.id === id)?.title)
      .filter(Boolean);
    return names?.length ? names.join("، ") : t("notificationsManager.history.targetSpecific");
  };

  // ─── PREVIEW ───

  const BellPreview = () => (
    <div className="bg-popover border border-border rounded-xl shadow-xl mx-auto overflow-hidden">
      <div className={`px-4 py-3 border-b border-border ${isRtl ? "text-end" : "text-start"}`}>
        <p className="font-bold text-sm">{t("notificationsManager.preview.bellHeader")}</p>
      </div>
      <div className="px-4 py-3 flex items-start gap-3 bg-primary/5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          {renderIcon(form.icon_name, "w-4 h-4")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{form.title || t("notificationsManager.preview.titleFallback")}</p>
          {form.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">{t("notificationsManager.preview.now")}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      </div>
    </div>
  );

  const EmailPreview = () => (
    <div className="bg-white border border-border rounded-xl shadow-xl max-w-md mx-auto overflow-hidden">
      <div className="bg-muted px-4 py-2 text-xs text-muted-foreground flex justify-between">
        <span>{t("notificationsManager.preview.fromPlatform")}</span>
        <span>{t("notificationsManager.preview.toExample")}</span>
      </div>
      <div className={`px-4 py-2 border-b border-border ${isRtl ? "text-end" : "text-start"}`}>
        <p className="font-bold text-sm">{form.email_subject || t("notificationsManager.preview.subjectFallback")}</p>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {(form.email_body || t("notificationsManager.preview.bodyFallback"))
            .replace(/\{\{اسم_الطالب\}\}/g, t("notificationsManager.preview.sampleStudent"))
            .replace(/\{\{اسم_الكورس\}\}/g, t("notificationsManager.preview.sampleCourse"))}
        </p>
        {form.email_cta_text && (
          <div className="text-center">
            <div className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium">
              {form.email_cta_text}
            </div>
          </div>
        )}
      </div>
      <div className="bg-muted/50 px-4 py-3 text-center text-[10px] text-muted-foreground">
        {t("notificationsManager.preview.footer")}
      </div>
    </div>
  );

  // ─── RENDER ───

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />{t("notificationsManager.heading")}</h1>
          <p className="text-muted-foreground text-xs">{t("notificationsManager.subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as "send" | "history")} dir={dir}>
        <div className="glass-card rounded-2xl p-1.5 mb-4 overflow-x-auto">
          <TabsList className="w-full flex-wrap sm:flex-nowrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="send" className="flex-1 min-w-[80px] sm:min-w-[100px] gap-1.5 sm:gap-2 rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200">
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t("notificationsManager.tabs.send")}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-[80px] sm:min-w-[100px] gap-1.5 sm:gap-2 rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium data-[state=active]:font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all duration-200">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t("notificationsManager.tabs.history")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── SEND TAB ─── */}
        <TabsContent value="send">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Channels */}
              <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
                <h3 className="font-bold text-sm">{t("notificationsManager.channels.title")}</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch dir="ltr" checked={form.channel_bell} onCheckedChange={v => setForm({ ...form, channel_bell: v })} />
                    <Bell className="w-4 h-4" />
                    <span className="text-xs">{t("notificationsManager.channels.bell")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch dir="ltr" checked={form.channel_email} onCheckedChange={v => setForm({ ...form, channel_email: v })} />
                    <Mail className="w-4 h-4" />
                    <span className="text-xs">{t("notificationsManager.channels.email")}</span>
                  </label>
                </div>
              </div>

              {/* Targeting */}
              <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
                <h3 className="font-bold text-sm">{t("notificationsManager.targeting.title")}</h3>
                <Select value={form.target_type} onValueChange={v => setForm({ ...form, target_type: v, target_course_ids: [] })} dir={dir}>
                  <SelectTrigger className="text-xs h-8 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("notificationsManager.targeting.all")}</SelectItem>
                    <SelectItem value="specific_courses">{t("notificationsManager.targeting.specificCourses")}</SelectItem>
                  </SelectContent>
                </Select>

                {form.target_type === "specific_courses" && (
                  <div className="border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {courses.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">{t("notificationsManager.targeting.noPublishedCourses")}</p>
                    ) : (
                      courses.map(c => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <Checkbox
                            checked={form.target_course_ids.includes(c.id)}
                            onCheckedChange={() => toggleCourseId(c.id)}
                          />
                          {c.title}
                        </label>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t("notificationsManager.targeting.studentsCount", { count: studentCount })}</span>
                </div>
              </div>

              {/* Bell Content */}
              {form.channel_bell && (
                <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5"><Bell className="w-4 h-4" />{t("notificationsManager.bellContent.title")}</h3>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.bellContent.pickIcon")}</Label>
                    <div className="grid grid-cols-10 gap-1 mt-1.5 p-2 border border-border rounded-lg max-h-24 overflow-y-auto">
                      {availableIcons.map(name => {
                        const Icon = (icons as Record<string, LucideIcon>)[name];
                        if (!Icon) return null;
                        return (
                          <button key={name} type="button" onClick={() => setForm({ ...form, icon_name: name })}
                            className={`w-7 h-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors ${form.icon_name === name ? "bg-primary/10 ring-2 ring-primary" : ""}`}
                            title={name}>
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.bellContent.titleLabel")}</Label>
                    <Input value={form.title} maxLength={60}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder={t("notificationsManager.bellContent.titlePlaceholder")} className="text-xs mt-1 h-8 max-w-xs" />
                    <span className="text-[10px] text-muted-foreground">{form.title.length}/60</span>
                  </div>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.bellContent.descLabel")}</Label>
                    <Textarea value={form.description} maxLength={160}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder={t("notificationsManager.bellContent.descPlaceholder")} rows={2} className="text-xs mt-1" />
                    <span className="text-[10px] text-muted-foreground">{form.description.length}/160</span>
                  </div>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.bellContent.linkLabel")}</Label>
                    <Input value={form.link_url}
                      onChange={e => setForm({ ...form, link_url: e.target.value })}
                      placeholder="https://..." className="text-xs mt-1 h-8 max-w-xs" dir="ltr" />
                  </div>
                </div>
              )}

              {/* Email Content */}
              {form.channel_email && (
                <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5"><Mail className="w-4 h-4" />{t("notificationsManager.emailContent.title")}</h3>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.emailContent.subjectLabel")}</Label>
                    <Input value={form.email_subject}
                      onChange={e => setForm({ ...form, email_subject: e.target.value })}
                      placeholder={t("notificationsManager.emailContent.subjectPlaceholder")} className="text-xs mt-1" />
                  </div>

                  <div>
                    <Label className="text-xs">{t("notificationsManager.emailContent.bodyLabel")}</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {t("notificationsManager.emailContent.bodyHint", { studentVar: VAR_STUDENT, courseVar: VAR_COURSE })}
                    </p>
                    <Textarea value={form.email_body}
                      onChange={e => setForm({ ...form, email_body: e.target.value })}
                      placeholder={t("notificationsManager.emailContent.bodyPlaceholder", { studentVar: VAR_STUDENT, courseVar: VAR_COURSE })}
                      rows={5} className="text-xs mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t("notificationsManager.emailContent.ctaTextLabel")}</Label>
                      <Input value={form.email_cta_text}
                        onChange={e => setForm({ ...form, email_cta_text: e.target.value })}
                        placeholder={t("notificationsManager.emailContent.ctaTextPlaceholder")} className="text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">{t("notificationsManager.emailContent.ctaUrlLabel")}</Label>
                      <Input value={form.email_cta_url}
                        onChange={e => setForm({ ...form, email_cta_url: e.target.value })}
                        placeholder="https://..." className="text-xs mt-1" dir="ltr" />
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduling */}
              <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
                <h3 className="font-bold text-sm">{t("notificationsManager.scheduling.title")}</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="radio" checked={!form.is_scheduled} onChange={() => setForm({ ...form, is_scheduled: false })} />
                    <Send className="w-3.5 h-3.5" />{t("notificationsManager.scheduling.sendNow")}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="radio" checked={form.is_scheduled} onChange={() => setForm({ ...form, is_scheduled: true })} />
                    <Calendar className="w-3.5 h-3.5" />{t("notificationsManager.scheduling.schedule")}
                  </label>
                </div>
                {form.is_scheduled && (
                  <Input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                    className="text-xs w-auto" dir="ltr" />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => { setPreviewType(form.channel_bell ? "bell" : "email"); setPreviewOpen(true); }}
                  variant="outline" className="gap-1.5 text-xs">
                  <Eye className="w-3.5 h-3.5" />{t("notificationsManager.actions.preview")}
                </Button>
                <Button onClick={handleSend} disabled={sending} className="gap-1.5 text-xs gradient-primary text-primary-foreground  dark:text-black dark:bg-white border-0 flex-1">
                  {sending ? <span className="animate-spin">⏳</span> : form.is_scheduled ? <Calendar className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {form.is_scheduled ? t("notificationsManager.actions.schedule") : t("notificationsManager.actions.sendNow")}
                </Button>
              </div>
            </div>

            {/* Live Preview Sidebar */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm">{t("notificationsManager.preview.live")}</h3>
              {form.channel_bell && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">{t("notificationsManager.preview.bellLabel")}</p>
                  <BellPreview />
                </div>
              )}
              {form.channel_email && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">{t("notificationsManager.preview.emailLabel")}</p>
                  <EmailPreview />
                </div>
              )}
              {!form.channel_bell && !form.channel_email && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  {t("notificationsManager.preview.empty")}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-xs">{t("notificationsManager.history.loading")}</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-card rounded-xl p-12 shadow-card text-center">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-3">{t("notificationsManager.history.empty")}</p>
              <Button onClick={() => setActiveSubTab("send")} variant="outline" className="text-xs">{t("notificationsManager.history.create")}</Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.title")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.channels")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.audience")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.date")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.recipients")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs`}>{t("notificationsManager.history.columns.status")}</TableHead>
                    <TableHead className={`${isRtl ? "text-end" : "text-start"} text-xs w-12`}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {renderIcon(c.icon_name, "w-3.5 h-3.5")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate max-w-[180px]">{c.title}</p>
                            {c.description && <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{c.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{channelBadges(c.channel_bell, c.channel_email)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{targetLabel(c)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(c.scheduled_at || c.created_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-xs">{c.total_recipients}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-sm">{t("notificationsManager.preview.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(form.channel_bell && form.channel_email) && (
              <div className="flex gap-2 justify-center">
                <Button variant={previewType === "bell" ? "default" : "outline"} size="sm" className="text-xs gap-1"
                  onClick={() => setPreviewType("bell")}>
                  <Bell className="w-3.5 h-3.5" />{t("notificationsManager.history.channelBell")}
                </Button>
                <Button variant={previewType === "email" ? "default" : "outline"} size="sm" className="text-xs gap-1"
                  onClick={() => setPreviewType("email")}>
                  <Mail className="w-3.5 h-3.5" />{t("notificationsManager.history.channelEmail")}
                </Button>
              </div>
            )}
            {previewType === "bell" && form.channel_bell ? <BellPreview /> : <EmailPreview />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">{t("notificationsManager.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">{t("notificationsManager.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="text-xs">{t("notificationsManager.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs">{t("notificationsManager.delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsManager;
