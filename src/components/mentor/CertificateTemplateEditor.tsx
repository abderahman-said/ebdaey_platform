import { Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CertificatePreview from "./CertificatePreview";
import { getCertificateVerifyUrl } from "@/lib/certificate";

interface CertificateTemplateEditorProps {
  tenantId: string;
  mentorName: string;
  /** Mentor storefront (public) language — the certificate always follows it. */
  certificateLanguage?: "ar" | "en";
}

// Kept for backwards compatibility with imports elsewhere.
export interface CertificateTemplate {
  id?: string;
  tenant_id: string;
  template_name: string;
  logo_url: string | null;
  signature_url: string | null;
  watermark_url: string | null;
  watermark_opacity: number;
  seal_url: string | null;
  background_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  border_color: string;
  title_font: string;
  body_font: string;
  border_style: string;
  border_width: number;
  show_qr: boolean;
  show_certificate_id: boolean;
  show_date: boolean;
  show_expiry: boolean;
  certificate_title: string;
  certificate_text: string;
  achievement_text: string;
}

/** Sample student name is never translated — real names are rendered as-is. */
const SAMPLE_STUDENT_NAME = "محمد أحمد";


const CertificateTemplateEditor = ({ tenantId, mentorName, certificateLanguage }: CertificateTemplateEditorProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  // The certificate always follows the mentor storefront (public) language.
  const certLang = certificateLanguage || (i18n.language?.startsWith("en") ? "en" : "ar");
  const certT = i18n.getFixedT(certLang);


  const queryClient = useQueryClient();

  // Mentor theme color, so the certificate frame follows the storefront brand
  // color instead of the dashboard theme.
  const { data: settings } = useQuery({
    queryKey: ["cert-tenant-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tenants")
        .select("primary_color, certificate_mentor_short_name, first_name, last_name")
        .eq("id", tenantId)
        .maybeSingle();
      return {
        themeColor: data?.primary_color ? `hsl(${data.primary_color})` : null,
        shortName: !!data?.certificate_mentor_short_name,
        personalName: [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() || null,
      };
    },
  });

  const themeColor = settings?.themeColor;
  const shortName = settings?.shortName ?? false;
  const personalName = settings?.personalName ?? null;

  const toggleShortName = async (value: boolean) => {
    const { error } = await (supabase as any)
      .from("tenants")
      .update({ certificate_mentor_short_name: value })
      .eq("id", tenantId);
    if (error) {
      toast.error(t("certificateEditor.saveFailed"));
      return;
    }
    queryClient.setQueryData(["cert-tenant-settings", tenantId], (prev: any) =>
      prev ? { ...prev, shortName: value } : prev
    );
    toast.success(t("certificateEditor.saved"));
  };

  const { data: topCourseName } = useQuery({

    queryKey: ["cert-top-course", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: orders } = await (supabase as any)
        .from("orders")
        .select("course_id")
        .eq("tenant_id", tenantId)
        .eq("payment_status", "paid")
        .not("course_id", "is", null);

      if (!orders?.length) return null;
      const counts = new Map<string, number>();
      for (const o of orders) {
        if (!o.course_id) continue;
        counts.set(o.course_id, (counts.get(o.course_id) ?? 0) + 1);
      }
      if (!counts.size) return null;
      const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", topId)
        .maybeSingle();
      return course?.title ?? null;
    },
  });

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-border/50">
        <Award className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-black">{t("certificateEditor.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("certificateEditor.subtitle")}
          </p>
        </div>
      </div>


      {/* Preview */}
      <div className="max-w-2xl mx-auto">
        <CertificatePreview
          studentName={SAMPLE_STUDENT_NAME}
          courseName={topCourseName || certT("certificateEditor.sampleCourse")}
          mentorName={mentorName || certT("certificateEditor.sampleMentor")}
          mentorSubName={shortName ? personalName || undefined : undefined}
          completionDate={new Date().toISOString()}
          certificateId="SAMPLE-0001"
          verifyUrl={getCertificateVerifyUrl("SAMPLE-0001")}
          language={certLang}
          themeColor={themeColor || undefined}
        />
      </div>

      {/* Setting */}
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="cert-short-name" className="text-sm font-bold">
            {t("certificateEditor.shortNameTitle")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("certificateEditor.shortNameDesc")}</p>
        </div>
        <Switch id="cert-short-name" checked={shortName} onCheckedChange={toggleShortName} />
      </div>

    </div>
  );
};

export default CertificateTemplateEditor;

