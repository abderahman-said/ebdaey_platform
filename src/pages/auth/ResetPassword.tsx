import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "تم!", description: "تم تغيير كلمة المرور بنجاح" });
      setTimeout(() => navigate("/auth"), 3000);
    }
  };

  if (!isRecovery && !done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4"
        style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            animation: "grid-move 20s linear infinite",
          }}>
        <div className="text-center">
          <p className="text-muted-foreground mb-4">جاري التحقق من الرابط...</p>
          <p className="text-sm text-muted-foreground">إذا لم يتم التحويل، يرجى التأكد من استخدام الرابط الصحيح من بريدك الإلكتروني.</p>
          <Link to="/auth" className="text-primary mt-4 inline-block">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4"
        style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            animation: "grid-move 20s linear infinite",
          }}>
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-xl font-bold">تم تغيير كلمة المرور بنجاح</h2>
          <p className="text-muted-foreground">سيتم تحويلك لصفحة تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            animation: "grid-move 20s linear infinite",
          }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo-black.png" alt="إبداعي" className="h-10 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold mb-2">تعيين كلمة مرور جديدة</h1>
          <p className="text-muted-foreground">أدخل كلمة المرور الجديدة</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-card">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <PasswordInput
                  id="password"
                  placeholder={t("auth.fields.passwordPlaceholder")}
                  className="pr-10"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <PasswordInput
                  id="confirmPassword"
                  placeholder={t("auth.fields.confirmPasswordPlaceholder")}
                  className="pr-10"
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground h-12 text-lg font-bold"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ كلمة المرور"}
              {!isSubmitting && <ArrowLeft className="w-5 h-5 mr-2" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
