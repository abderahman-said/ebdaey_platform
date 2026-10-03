import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RefreshCw, Save, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  template_key: string;
  category: "mentor" | "student" | "auth";
  display_name: string;
  description: string | null;
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
  default_subject: string;
  default_body: string;
}

const CATEGORY_LABELS: Record<Template["category"], string> = {
  mentor: "المنتور",
  student: "الطالب",
  auth: "المصادقة",
};

export default function EmailNotificationsManager() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_templates")
      .select(
        "id, template_key, category, display_name, description, subject, body, variables, enabled, default_subject, default_body",
      )
      .order("category")
      .order("display_name");
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setItems(
        (data ?? []).map((r: any) => ({
          ...r,
          variables: Array.isArray(r.variables) ? r.variables : [],
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const g: Record<Template["category"], Template[]> = {
      mentor: [],
      student: [],
      auth: [],
    };
    for (const t of items) g[t.category].push(t);
    return g;
  }, [items]);

  const toggleEnabled = async (t: Template, enabled: boolean) => {
    setSavingId(t.id);
    const { error } = await supabase.from("notification_templates").update({ enabled }).eq("id", t.id);
    setSavingId(null);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled } : x)));
  };

  const saveEditing = async (subject: string, body: string) => {
    if (!editing) return;
    setSavingId(editing.id);
    const { error } = await supabase.from("notification_templates").update({ subject, body }).eq("id", editing.id);
    setSavingId(null);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, subject, body } : x)));
    setEditing(null);
    toast({ title: "تم الحفظ", description: "تم تحديث القالب بنجاح" });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-bold">إشعارات البريد الإلكتروني ✉️</h1>
          <p className="text-muted-foreground text-sm mt-1">تحكم في تفعيل وتخصيص جميع رسائل البريد المرسلة من المنصة</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="mentor" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="mentor">المنتور ({grouped.mentor.length})</TabsTrigger>
            <TabsTrigger value="student">الطالب ({grouped.student.length})</TabsTrigger>
            <TabsTrigger value="auth">المصادقة ({grouped.auth.length})</TabsTrigger>
          </TabsList>

          {(["mentor", "student", "auth"] as const).map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[cat].map((t) => (
                  <div key={t.id} className="glass-card rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-start flex-1">
                        <div className="flex items-center gap-2 ">
                          <h3 className="text-sm font-bold">{t.display_name}</h3>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          </div>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{t.template_key}</p>
                      </div>
                      <Switch
                        checked={t.enabled}
                        disabled={savingId === t.id}
                        onCheckedChange={(v) => toggleEnabled(t, v)}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(t)}>
                        تعديل القالب
                      </Button>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          t.enabled
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {t.enabled ? "مفعل" : "غير مفعل"}
                      </span>
                    </div>
                  </div>
                ))}
                {grouped[cat].length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                    لا توجد قوالب في {CATEGORY_LABELS[cat]}
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <TemplateEditorDialog
        template={editing}
        saving={savingId === editing?.id}
        onClose={() => setEditing(null)}
        onSave={saveEditing}
      />
    </>
  );
}

function TemplateEditorDialog({
  template,
  saving,
  onClose,
  onSave,
}: {
  template: Template | null;
  saving: boolean;
  onClose: () => void;
  onSave: (subject: string, body: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }, [template]);

  const copyVar = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`);
    setCopied(v);
    setTimeout(() => setCopied(null), 1200);
  };

  const resetToDefault = () => {
    if (!template) return;
    setSubject(template.default_subject);
    setBody(template.default_body);
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-start">
          <DialogTitle>{template?.display_name}</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{template?.template_key}</p>
        </DialogHeader>

        {template && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5 text-start">عنوان الرسالة (Subject)</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-background dark:bg-input text-start" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5 text-start">نص الرسالة</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="bg-background dark:bg-input text-start min-h-[220px] font-mono text-sm leading-relaxed"
              />
            </div>

            {template.variables.length > 0 && (
              <div>
                <label className="text-xs font-semibold block mb-2 text-start">المتغيرات المتاحة (اضغط للنسخ)</label>
                <div className="flex flex-wrap gap-1.5 ">
                  {template.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => copyVar(v)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                    >
                      {copied === v ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 text-start">معاينة</p>
              <div className="bg-background dark:bg-input rounded-lg p-4 text-start">
                <p className="text-sm font-bold mb-2">{subject}</p>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">{body}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={saving}>
            <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
            استعادة الافتراضي
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button size="sm" onClick={() => onSave(subject, body)} disabled={saving}>
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 ml-1.5" />
              )}
              حفظ
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
