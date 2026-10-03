import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, CalendarRange, Clock } from "lucide-react";
import MentorScheduleEditor from "./MentorScheduleEditor";

interface Props { tenantId: string; }

interface Row {
  id: string;
  title: string;
  timezone: string;
  is_default: boolean;
}

const MentorSchedulesManager = ({ tenantId }: Props) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ["mentor-schedules", tenantId], [tenantId]);
  const cachedSchedules = queryClient.getQueryData<Row[]>(cacheKey);

  const [items, setItems] = useState<Row[]>(() => cachedSchedules || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedSchedules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent && !queryClient.getQueryData<Row[]>(cacheKey)) {
      setLoading(true);
    }
    const { data } = await supabase
      .from("mentor_schedules" as any)
      .select("id, title, timezone, is_default")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    const list = (data as any) || [];
    setItems(list);
    queryClient.setQueryData(cacheKey, list);
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) {
      const hasCache = Boolean(queryClient.getQueryData<Row[]>(cacheKey));
      load(hasCache);
    }
  }, [tenantId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({ title: t("schedulesManager.toast.nameRequired"), variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("mentor_schedules" as any)
      .insert({ tenant_id: tenantId, title: newTitle.trim(), is_default: items.length === 0 } as any)
      .select("id").single();
    setCreating(false);
    if (error) {
      toast({ title: t("schedulesManager.toast.createError"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("schedulesManager.toast.created") });
    setCreateOpen(false);
    setNewTitle("");
    setEditingId((data as any).id);
    load(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("mentor_schedules" as any).delete().eq("id", deleteId);
    if (error) toast({ title: t("schedulesManager.toast.error"), description: error.message, variant: "destructive" });
    else {
      toast({ title: t("schedulesManager.toast.deleted") });
      setItems((prev) => {
        const next = prev.filter((s) => s.id !== deleteId);
        queryClient.setQueryData(cacheKey, next);
        return next;
      });
    }
    setDeleteId(null);
  };

  if (editingId) {
    return (
      <MentorScheduleEditor
        scheduleId={editingId}
        tenantId={tenantId}
        onBack={() => { setEditingId(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            {t("schedulesManager.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("schedulesManager.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("schedulesManager.new")}
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t("schedulesManager.loading")}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-card/30 backdrop-blur-sm">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">{t("schedulesManager.empty")}</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> {t("schedulesManager.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 hover:shadow-lg hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarRange className="h-5 w-5" />
                </div>
                {s.is_default && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    {t("schedulesManager.default")}
                  </span>
                )}
              </div>
              <h3 className="font-bold mb-1 line-clamp-1">{s.title}</h3>
              <p className="text-xs text-muted-foreground mb-4" dir="ltr">{s.timezone}</p>
              <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                <Button size="sm" variant="outline" onClick={() => setEditingId(s.id)} className="flex-1 gap-1">
                  <Edit2 className="h-3 w-3" /> {t("schedulesManager.edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{t("schedulesManager.dialog.title")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("schedulesManager.dialog.name")}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("schedulesManager.dialog.namePlaceholder")} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("schedulesManager.dialog.cancel")}</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? t("schedulesManager.dialog.creating") : t("schedulesManager.dialog.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedulesManager.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("schedulesManager.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("schedulesManager.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("schedulesManager.delete.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MentorSchedulesManager;
