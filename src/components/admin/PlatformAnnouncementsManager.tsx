import { useEffect, useState } from "react";
import { Megaphone, Trash2, Plus, Sparkles, Info, AlertTriangle, CheckCircle2, Bell, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ANNOUNCEMENT_ICONS, ANNOUNCEMENT_ICON_NAMES } from "@/lib/announcementIcons";

const ICON_MAP: Record<string, any> = ANNOUNCEMENT_ICONS;
const ICON_OPTIONS = ANNOUNCEMENT_ICON_NAMES.map((value) => ({ value, Icon: ANNOUNCEMENT_ICONS[value] }));

type Item = {
  id: string;
  title: string;
  body: string | null;
  icon_name: string;
  link_url: string | null;
  audience: string;
  created_at: string;
};

export default function PlatformAnnouncementsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    icon_name: "Megaphone",
    link_url: "",
    audience: "mentors",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data || []) as Item[]);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", body: "", icon_name: "Megaphone", link_url: "", audience: "mentors" });
    setOpen(true);
  };

  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({
      title: it.title,
      body: it.body || "",
      icon_name: it.icon_name,
      link_url: it.link_url || "",
      audience: it.audience,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      icon_name: form.icon_name,
      link_url: form.link_url.trim() || null,
      audience: form.audience,
    };
    const { error } = editing
      ? await supabase.from("platform_announcements").update(payload).eq("id", editing.id)
      : await supabase.from("platform_announcements").insert({ ...payload, created_by: user?.id });
    setSaving(false);
    if (error) {
      toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "تم تحديث الإعلان" : "تم نشر الإعلان" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const { error } = await supabase.from("platform_announcements").delete().eq("id", id);
    if (error) {
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="text-start">
          <h1 className="text-2xl font-bold">تحديثات المنصة 📢</h1>
          <p className="text-muted-foreground text-sm mt-1">إعلانات وتحديثات تظهر للمدربين في لوحة تحكمهم</p>
        </div>
        <Button size="sm" onClick={openNew} className="gradient-primary text-primary-foreground border-0">
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إعلان جديد
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
            لا توجد إعلانات بعد. أنشئ أول إعلان لإبلاغ المدربين بالتحديثات.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((it) => {
            const Icon = ICON_MAP[it.icon_name] || Megaphone;
            return (
              <Card key={it.id} className="glass-card">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold">{it.title}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {it.audience === "all" ? "الجميع" : "المدربون"}
                      </Badge>
                    </div>
                    {it.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{it.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(it.created_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(it)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => remove(it.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">الوصف</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الأيقونة</Label>
                <Select value={form.icon_name} onValueChange={(v) => setForm({ ...form, icon_name: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="grid grid-cols-6 gap-1 p-1">
                      {ICON_OPTIONS.map(({ value, Icon }) => (
                        <SelectItem
                          key={value}
                          value={value}
                          title={value}
                          className="justify-center p-2 pl-2 pr-2 [&>span:first-child]:hidden data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                        >
                          <Icon className="w-5 h-5" />
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الجمهور</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentors">المدربون فقط</SelectItem>
                    <SelectItem value="all">الجميع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">رابط (اختياري)</Label>
              <Input
                placeholder="https://..."
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "جاري الحفظ..." : editing ? "تحديث" : "نشر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
