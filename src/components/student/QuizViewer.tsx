import { useState, useEffect } from "react";
import { CheckCircle, Circle, Award, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface QuizViewerProps {
  lessonId: string;
  studentId: string | null;
  onComplete: () => void;
}

interface Question {
  id: string;
  question_text: string;
  sort_order: number;
  options: { id: string; option_text: string; is_correct: boolean; sort_order: number }[];
}

const QuizViewer = ({ lessonId, studentId, onComplete }: QuizViewerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passPercentage, setPassPercentage] = useState(60);
  const [loading, setLoading] = useState(true);
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);

  useEffect(() => {
    loadQuiz();
  }, [lessonId]);

  const loadQuiz = async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (!quiz) {
      setLoading(false);
      return;
    }

    setPassPercentage(quiz.pass_percentage);

    // Check previous attempts
    if (studentId) {
      const { data: attempt } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quiz.id)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attempt) {
        setPreviousAttempt(attempt);
      }
    }

    const { data: questionsData } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("sort_order");

    if (questionsData) {
      const withOptions: Question[] = [];
      for (const q of questionsData) {
        const { data: options } = await supabase
          .from("quiz_options")
          .select("*")
          .eq("question_id", q.id)
          .order("sort_order");
        withOptions.push({ ...q, options: (options || []) as any });
      }
      setQuestions(withOptions);
    }
    setLoading(false);
  };

  const submitQuiz = async () => {
    let correct = 0;
    const answersArr: { question_id: string; selected_option_id: string; is_correct: boolean }[] = [];

    for (const q of questions) {
      const selectedId = answers[q.id];
      const correctOpt = q.options.find(o => o.is_correct);
      const isCorrect = selectedId === correctOpt?.id;
      if (isCorrect) correct++;
      answersArr.push({ question_id: q.id, selected_option_id: selectedId || "", is_correct: isCorrect });
    }

    const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = pct >= passPercentage;
    setScore(pct);
    setSubmitted(true);

    if (studentId) {
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("lesson_id", lessonId)
        .single();

      if (quiz) {
        await supabase.from("quiz_attempts").insert({
          quiz_id: quiz.id,
          student_id: studentId,
          score: pct,
          total_questions: questions.length,
          passed,
          answers: answersArr as any,
        });
      }

      if (passed) onComplete();
    }
  };

  const retryQuiz = () => {
    setSubmitted(false);
    setAnswers({});
    setPreviousAttempt(null);
  };

  if (loading) return <div className="p-16 text-center text-muted-foreground">جاري تحميل الاختبار...</div>;
  if (questions.length === 0) return <div className="p-16 text-center text-muted-foreground">لم يتم إضافة أسئلة لهذا الاختبار بعد</div>;

  const passed = score >= passPercentage;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      {previousAttempt && !submitted && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${previousAttempt.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {previousAttempt.passed ? <Award className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">
            محاولة سابقة: {previousAttempt.score}% - {previousAttempt.passed ? "ناجح" : "غير ناجح"}
          </span>
        </div>
      )}

      {!submitted ? (
        <>
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-card rounded-xl p-6 shadow-card space-y-4">
              <h3 className="font-bold text-base">{qi + 1}. {q.question_text}</h3>
              <div className="space-y-2">
                {q.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-sm text-end ${
                      answers[q.id] === opt.id
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {answers[q.id] === opt.id ? (
                      <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    {opt.option_text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button
            onClick={submitQuiz}
            className="w-full gradient-primary text-primary-foreground border-0"
            disabled={Object.keys(answers).length < questions.length}
          >
            إرسال الإجابات
          </Button>
        </>
      ) : (
        <div className="bg-card rounded-xl p-8 shadow-card text-center space-y-4">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${passed ? "bg-success/10" : "bg-destructive/10"}`}>
            {passed ? <Award className="w-10 h-10 text-success" /> : <XCircle className="w-10 h-10 text-destructive" />}
          </div>
          <h2 className="text-2xl font-black">{passed ? "🎉 ناجح!" : "حاول مرة أخرى"}</h2>
          <p className="text-lg">النتيجة: <span className="font-bold">{score}%</span></p>
          <p className="text-sm text-muted-foreground">الحد الأدنى للنجاح: {passPercentage}%</p>

          {/* Show correct/wrong answers */}
          <div className="text-end space-y-3 mt-6">
            {questions.map((q, qi) => {
              const selectedId = answers[q.id];
              const correctOpt = q.options.find(o => o.is_correct);
              const isCorrect = selectedId === correctOpt?.id;
              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <p className="font-medium text-sm mb-1">{qi + 1}. {q.question_text}</p>
                  <p className="text-xs">
                    إجابتك: {q.options.find(o => o.id === selectedId)?.option_text || "لم تجب"}
                    {!isCorrect && correctOpt && <span className="text-success mr-2">• الإجابة الصحيحة: {correctOpt.option_text}</span>}
                  </p>
                </div>
              );
            })}
          </div>

          {!passed && (
            <Button onClick={retryQuiz} variant="outline" className="mt-4">
              إعادة المحاولة
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizViewer;
