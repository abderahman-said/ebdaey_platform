import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Send, X, Loader2, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  courseId: string;
  onJumpToLesson?: (lessonId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  refs?: { lesson_id: string; lesson_title: string; start_time?: number }[];
}

const StudentQAChat = ({ courseId, onJumpToLesson, open: openProp, onOpenChange, hideTrigger }: Props) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = openProp !== undefined ? openProp : openUncontrolled;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    if (openProp === undefined) setOpenUncontrolled(v);
  };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing conversation
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!student) return;

      // Load today's usage so counter persists across reloads
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supabase
        .from("course_qa_usage")
        .select("question_count")
        .eq("student_id", student.id)
        .eq("course_id", courseId)
        .eq("day", today)
        .maybeSingle();
      setRemaining(Math.max(0, 20 - (usage?.question_count || 0)));

      const { data: conv } = await supabase
        .from("course_qa_conversations")
        .select("id")
        .eq("student_id", student.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!conv) return;
      const { data: msgs } = await supabase
        .from("course_qa_messages")
        .select("role, content, refs")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          role: m.role,
          content: m.content,
          refs: Array.isArray(m.refs) ? m.refs : [],
        })));
      }
    })();
  }, [open, courseId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: t("auth.toast.loginRequired"), variant: "destructive" });
        return;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qa-ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ course_id: courseId, question: q }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: t("auth.toast.errorTitle"), description: data.error || t("auth.toast.requestFailed"), variant: "destructive" });
        setMessages((m) => [...m, { role: "assistant", content: data.error || "حدث خطأ." }]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.answer, refs: data.refs || [] }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch (e: any) {
      toast({ title: t("auth.toast.errorTitle"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && !hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 left-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="مساعد الكورس الذكي"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 left-4 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[600px] max-h-[75vh] glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">مساعد الكورس</p>
                {remaining !== null && (
                  <p className="text-[10px] text-muted-foreground">تبقى {remaining} من 20 سؤال اليوم</p>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                اسأل أي سؤال عن محتوى الكورس وسأجاوبك من الدروس مباشرة.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content.replace(/\*\*/g, "").replace(/\[\s*مرجع\s*\d+\s*\]/g, "").replace(/\[\s*ref(?:erence)?\s*\d+\s*\]/gi, "").replace(/[ \t]{2,}/g, " ").trim()}</p>
                  {m.refs && m.refs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/30">
                      {m.refs.map((r, j) => (
                        <button
                          key={j}
                          onClick={() => onJumpToLesson?.(r.lesson_id)}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-background/60 hover:bg-background border border-border/50 transition-colors"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          {r.lesson_title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background/50">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="اسأل عن أي شيء في الكورس..."
                className="flex-1 bg-background rounded-full px-4 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={loading || remaining === 0}
              />
              <Button size="icon" onClick={send} disabled={loading || !input.trim() || remaining === 0} className="rounded-full">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentQAChat;
