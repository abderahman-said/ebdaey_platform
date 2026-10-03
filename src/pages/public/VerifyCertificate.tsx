import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, CheckCircle2, XCircle, Loader2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/common/SeoHead";
import { getMentorSiteUrl } from "@/lib/subdomain";

interface VerificationResult {
  student_name: string;
  course_title: string;
  mentor_name: string;
  mentor_slug: string;
  completion_date: string;
  certificate_code: string;
}

interface MentorHeader {
  name: string;
  slug: string;
  specialty: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
}

const VerifyCertificate = () => {
  const { t, i18n } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [mentor, setMentor] = useState<MentorHeader | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!code) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("verify_certificate", { cert_code: code });
      if (!error && data && data.length > 0) {
        const r = data[0] as VerificationResult;
        setResult(r);
        const { data: t } = await supabase
          .from("public_tenants")
          .select("name, slug, specialty, profile_image_url, cover_image_url, primary_color")
          .eq("slug", r.mentor_slug)
          .maybeSingle();
        if (t) setMentor(t as MentorHeader);
      }
      setLoading(false);
    };
    verify();
  }, [code]);

  const formattedDate = result
    ? new Date(result.completion_date).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div dir={i18n.language === "ar" ? "rtl" : "ltr"} className="min-h-[80vh] bg-gradient-to-br from-background to-muted/30">
      <SeoHead
        title={
          i18n.language === "ar"
            ? "التحقق من الشهادة | إبداعي"
            : "Certificate verification | Ebdaey"
        }
        description={
          i18n.language === "ar"
            ? "تحقق من صحة شهادة إتمام صادرة عن منصة إبداعي باستخدام رمز الشهادة."
            : "Verify the authenticity of a completion certificate issued on the Ebdaey platform."
        }
        path={code ? `/verify/${code}` : "/verify"}
        locale={i18n.language === "ar" ? "ar" : "en"}
        noindex
      />

      {mentor && (
        <div className="w-full">
          <div
            className="relative h-40 sm:h-52 w-full bg-cover bg-center"
            style={{
              backgroundImage: mentor.cover_image_url
                ? `url(${mentor.cover_image_url})`
                : undefined,
              backgroundColor: mentor.primary_color || "hsl(var(--primary))",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-4 -mt-14 sm:-mt-16 flex items-end gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow-lg">
              {mentor.profile_image_url ? (
                <img src={mentor.profile_image_url} alt={mentor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-muted-foreground">
                  {mentor.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="pb-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-lg sm:text-xl truncate">{mentor.name}</h2>
                <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
              </div>
              {mentor.specialty && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{mentor.specialty}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center p-4 pt-8">
      <div className="glass-card rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t("miscPublic.verify.checking")}</p>
          </div>
        ) : result ? (
          <>
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-2xl font-black mb-2">{t("miscPublic.verify.verified")}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {t("miscPublic.verify.verifiedDesc")}
            </p>

            <div className={`${i18n.language === "ar" ? "text-end" : "text-start"} space-y-4 bg-muted/30 rounded-xl p-5 mb-6`}>
              <div className="flex items-start gap-2">
                <Award className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("miscPublic.verify.studentName")}</p>
                  <p className="font-bold">{result.student_name}</p>
                </div>
              </div>
              <div className="border-t border-border/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t("miscPublic.verify.courseName")}</p>
                <p className="font-bold">{result.course_title}</p>
              </div>
              <div className="border-t border-border/50" />
              <div>
                <p className="text-xs text-muted-foreground">{t("miscPublic.verify.mentor")}</p>
                <p className="font-bold">{result.mentor_name}</p>
              </div>
              <div className="border-t border-border/50" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("miscPublic.verify.issueDate")}</p>
                  <p className="font-bold text-sm">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("miscPublic.verify.certificateNumber")}</p>
                  <p className="font-bold text-sm font-mono"># {result.certificate_code}</p>
                </div>
              </div>
            </div>

            <a href={getMentorSiteUrl(result.mentor_slug)} className="block">
              <Button className="w-full">{t("miscPublic.verify.visitMentor")}</Button>
            </a>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-black mb-2">{t("miscPublic.verify.notFoundTitle")}</h1>
            <p className="text-muted-foreground mb-6">
              {t("miscPublic.verify.notFoundDesc", { code })}
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">{t("miscPublic.verify.backHome")}</Button>
            </Link>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
