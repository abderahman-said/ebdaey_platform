import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, GripVertical, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuizEditorProps {
  lessonId: string;
  courseId: string;
  tenantId: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  sort_order: number;
  options: QuizOption[];
}

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

const QuizEditor = ({ lessonId, courseId, tenantId }: QuizEditorProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [quizId, setQuizId] = useState<string | null>(null);
  const [passPercentage, setPassPercentage] = useState(60);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuiz();
  }, [lessonId]);

  const loadQuiz = async () => {
    setLoading(true);
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (quiz) {
      setQuizId(quiz.id);
      setPassPercentage(quiz.pass_percentage);

      const { data: questionsData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("sort_order");

      if (questionsData) {
        const withOptions: QuizQuestion[] = [];
        for (const q of questionsData) {
          const { data: options } = await supabase
            .from("quiz_options")
            .select("*")
            .eq("question_id", q.id)
            .order("sort_order");
          withOptions.push({ ...q, options: (options || []) as QuizOption[] });
        }
        setQuestions(withOptions);
      }
    }
    setLoading(false);
  };

  const ensureQuiz = async (): Promise<string> => {
    if (quizId) return quizId;
    const { data } = await supabase
      .from("quizzes")
      .insert({ lesson_id: lessonId, course_id: courseId, tenant_id: tenantId, title: "", pass_percentage: passPercentage })
      .select()
      .single();
    if (data) {
      setQuizId(data.id);
      return data.id;
    }
    throw new Error("Failed to create quiz");
  };

  const updatePassPercentage = async (val: number) => {
    setPassPercentage(val);
    if (quizId) {
      await supabase.from("quizzes").update({ pass_percentage: val }).eq("id", quizId);
    }
  };

  const addQuestion = async () => {
    const qId = await ensureQuiz();
    const { data } = await supabase
      .from("quiz_questions")
      .insert({ quiz_id: qId, question_text: "سؤال جديد", sort_order: questions.length })
      .select()
      .single();
    if (data) {
      // Add 2 default options
      const { data: opts } = await supabase
        .from("quiz_options")
        .insert([
          { question_id: data.id, option_text: "الخيار 1", is_correct: true, sort_order: 0 },
          { question_id: data.id, option_text: "الخيار 2", is_correct: false, sort_order: 1 },
        ])
        .select();
      setQuestions([...questions, { ...data, options: (opts || []) as QuizOption[] }]);
    }
  };

  const updateQuestion = async (questionId: string, text: string) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, question_text: text } : q));
    await supabase.from("quiz_questions").update({ question_text: text }).eq("id", questionId);
  };

  const deleteQuestion = async (questionId: string) => {
    await supabase.from("quiz_questions").delete().eq("id", questionId);
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const addOption = async (questionId: string) => {
    const q = questions.find(q => q.id === questionId);
    const { data } = await supabase
      .from("quiz_options")
      .insert({ question_id: questionId, option_text: "خيار جديد", is_correct: false, sort_order: q?.options.length || 0 })
      .select()
      .single();
    if (data) {
      setQuestions(questions.map(q =>
        q.id === questionId ? { ...q, options: [...q.options, data as QuizOption] } : q
      ));
    }
  };

  const updateOption = async (optionId: string, questionId: string, updates: Partial<QuizOption>) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options.map(o => o.id === optionId ? { ...o, ...updates } : o)
      } : q
    ));
    await supabase.from("quiz_options").update(updates).eq("id", optionId);
  };

  const setCorrectOption = async (optionId: string, questionId: string) => {
    // Set all others to false, this one to true
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    for (const o of q.options) {
      await supabase.from("quiz_options").update({ is_correct: o.id === optionId }).eq("id", o.id);
    }
    setQuestions(questions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options.map(o => ({ ...o, is_correct: o.id === optionId }))
      } : q
    ));
  };

  const deleteOption = async (optionId: string, questionId: string) => {
    await supabase.from("quiz_options").delete().eq("id", optionId);
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, options: q.options.filter(o => o.id !== optionId) } : q
    ));
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">{t("quizEditor.loading")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1 flex-1">
          <Label>{t("quizEditor.passPercentage")}</Label>
          <Input type="number" min={0} max={100} value={passPercentage} onChange={e => updatePassPercentage(Number(e.target.value))} className="max-w-[120px]" />
        </div>
        <Button onClick={addQuestion} variant="outline" size="sm">
          <Plus className="w-4 h-4 ml-2" />
          {t("quizEditor.addQuestion")}
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">{t("quizEditor.noQuestions")}</p>
      )}

      {questions.map((question, qi) => (
        <div key={question.id} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-sm font-bold text-muted-foreground mt-2">{qi + 1}.</span>
            <Input
              value={question.question_text}
              onChange={e => updateQuestion(question.id, e.target.value)}
              className="flex-1"
              placeholder={t("quizEditor.questionPlaceholder")}
            />
            <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteQuestion(question.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="mr-6 space-y-2">
            {question.options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <button onClick={() => setCorrectOption(option.id, question.id)} className="shrink-0" title={t("quizEditor.markCorrect")}>
                  {option.is_correct ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                <Input
                  value={option.option_text}
                  onChange={e => updateOption(option.id, question.id, { option_text: e.target.value })}
                  className="flex-1"
                  placeholder={t("quizEditor.optionPlaceholder")}
                />
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteOption(option.id, question.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addOption(question.id)} className="text-xs">
              <Plus className="w-3 h-3 ml-1" />
              {t("quizEditor.addOption")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizEditor;
