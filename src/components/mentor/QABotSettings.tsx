import { useEffect, useState, useCallback } from "react";
import { Bot, Loader2, Sparkles, FileText, Video, AudioLines, RefreshCw, CheckCircle2, AlertTriangle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  courseId: string;
}


type IndexedLesson = {
  lesson_id: string;
  title: string;
  content_type: string | null;
  source_types: string[];
  chunk_count: number;
};

type FailedLesson = {
  lesson_id: string;
  title: string;
  error: string | null;
};

const QABotSettings = ({ courseId }: Props) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const mx = isRtl ? "ml-1.5" : "mr-1.5";
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [indexed, setIndexed] = useState<IndexedLesson[]>([]);
  const [failed, setFailed] = useState<FailedLesson[]>([]);
  const [loadingIndexed, setLoadingIndexed] = useState(false);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("qa_bot_enabled")
        .eq("id", courseId)
        .single();
      setEnabled(!!data?.qa_bot_enabled);
      setLoading(false);
    })();
  }, [courseId]);

  const loadIndexed = useCallback(async () => {
    setLoadingIndexed(true);
    const [{ data: chunks }, { data: failedRows }] = await Promise.all([
      supabase
        .from("course_qa_chunks")
        .select("lesson_id, source_type")
        .eq("course_id", courseId),
      supabase
        .from("lesson_transcripts")
        .select("lesson_id, error")
        .eq("course_id", courseId)
        .eq("status", "failed"),
    ]);

    const byLesson = new Map<string, { sources: Set<string>; count: number }>();
    (chunks || []).forEach((c: any) => {
      if (!c.lesson_id) return;
      const e = byLesson.get(c.lesson_id) || { sources: new Set<string>(), count: 0 };
      if (c.source_type) e.sources.add(c.source_type);
      e.count += 1;
      byLesson.set(c.lesson_id, e);
    });

    const indexedIds = Array.from(byLesson.keys());
    const failedIds = (failedRows || []).map((r: any) => r.lesson_id);
    const allIds = Array.from(new Set([...indexedIds, ...failedIds]));

    let lessonsMap = new Map<string, { title: string; content_type: string | null }>();
    if (allIds.length > 0) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, content_type")
        .in("id", allIds);
      (lessons || []).forEach((l: any) =>
        lessonsMap.set(l.id, { title: l.title, content_type: l.content_type })
      );
    }

    const indexedList: IndexedLesson[] = indexedIds.map((id) => {
      const e = byLesson.get(id)!;
      const l = lessonsMap.get(id);
      return {
        lesson_id: id,
        title: l?.title || t("qaBot.deletedLesson"),
        content_type: l?.content_type ?? null,
        source_types: Array.from(e.sources),
        chunk_count: e.count,
      };
    });
    indexedList.sort((a, b) => a.title.localeCompare(b.title, "ar"));

    const failedList: FailedLesson[] = (failedRows || []).map((r: any) => ({
      lesson_id: r.lesson_id,
      title: lessonsMap.get(r.lesson_id)?.title || t("qaBot.deletedLesson"),
      error: r.error,
    }));
    failedList.sort((a, b) => a.title.localeCompare(b.title, "ar"));

    setIndexed(indexedList);
    setFailed(failedList);
    setLoadingIndexed(false);
  }, [courseId]);

  const retryLesson = async (lessonId: string) => {
    setRetrying((prev) => new Set(prev).add(lessonId));
    try {
      const { error } = await supabase.functions.invoke("qa-transcribe-lesson", {
        body: { lesson_id: lessonId },
      });
      if (error) throw error;
      toast({ title: t("qaBot.retryStarted"), description: t("qaBot.retryStartedDesc") });
      setTimeout(() => loadIndexed(), 3000);
    } catch (e: any) {
      toast({ title: t("qaBot.retryFailed"), description: e.message, variant: "destructive" });
    } finally {
      setRetrying((prev) => {
        const n = new Set(prev);
        n.delete(lessonId);
        return n;
      });
    }
  };

  const retryAll = async () => {
    for (const f of failed) {
      await retryLesson(f.lesson_id);
    }
  };


  useEffect(() => {
    if (enabled) loadIndexed();
  }, [enabled, loadIndexed]);

  const toggle = async (v: boolean) => {
    setBusy(true);
    const { error } = await supabase
      .from("courses")
      .update({ qa_bot_enabled: v })
      .eq("id", courseId);
    if (error) {
      toast({ title: t("qaBot.toggleErrorTitle"), description: error.message, variant: "destructive" });
    } else {
      setEnabled(v);
      toast({
        title: v ? t("qaBot.enabled") : t("qaBot.disabled"),
        description: v ? t("qaBot.enabledDesc") : undefined,
      });
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const iconFor = (ct: string | null, sources: string[]) => {
    if (ct === "video" || sources.includes("video")) return Video;
    if (ct === "audio" || sources.includes("audio")) return AudioLines;
    return FileText;
  };

  const labelFor = (sources: string[]) => {
    if (sources.includes("video") || sources.includes("audio")) return t("qaBot.indexed.sourceAudio");
    return t("qaBot.indexed.sourceText");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">{t("qaBot.header.title")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("qaBot.header.subtitle")}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} disabled={busy} />
        </div>
      </div>

      {enabled && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{t("qaBot.auto.title")}</p>
              <ul className={`text-muted-foreground space-y-1 list-disc ${isRtl ? "pr-5" : "pl-5"}`}>
                <li>{t("qaBot.auto.b1")}</li>
                <li>{t("qaBot.auto.b2")}</li>
                <li>{t("qaBot.auto.b3")}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-base mb-1">{t("qaBot.indexed.title")}</h4>
              <p className="text-xs text-muted-foreground">
                {indexed.length > 0
                  ? t("qaBot.indexed.count", { count: indexed.length })
                  : t("qaBot.indexed.none")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadIndexed}
              disabled={loadingIndexed}
              className="h-8"
            >
              <RefreshCw className={`w-4 h-4 ${loadingIndexed ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loadingIndexed ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : indexed.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t("qaBot.indexed.empty")}
            </div>
          ) : (
            <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {indexed.map((l) => {
                const Icon = iconFor(l.content_type, l.source_types);
                return (
                  <li
                    key={l.lesson_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {labelFor(l.source_types)} • {t("qaBot.indexed.chunks", { count: l.chunk_count })}
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {enabled && failed.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base mb-1">{t("qaBot.failed.title")}</h4>
                <p className="text-xs text-muted-foreground">
                  {t("qaBot.failed.subtitle", { count: failed.length })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={retryAll}
              disabled={retrying.size > 0}
              className="h-8"
            >
              <RotateCw className={`w-3.5 h-3.5 ${mx} ${retrying.size > 0 ? "animate-spin" : ""}`} />
              {t("qaBot.failed.retryAll")}
            </Button>
          </div>

          <ul className="space-y-2">
            {failed.map((f) => {
              const isRetrying = retrying.has(f.lesson_id);
              return (
                <li
                  key={f.lesson_id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20"
                >
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    {f.error && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {f.error}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => retryLesson(f.lesson_id)}
                    disabled={isRetrying}
                    className="h-8"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <RotateCw className={`w-3.5 h-3.5 ${mx}`} />
                        {t("qaBot.failed.retry")}
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>

  );
};

export default QABotSettings;
