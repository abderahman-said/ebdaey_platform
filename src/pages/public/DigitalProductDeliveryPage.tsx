import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useBrandedPageTitle } from "@/hooks/useBrandedPageTitle";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  Package,
  FileText,
  Gift,
  Award,
  MessageCircle,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchGiftDisplays, loadDigitalProductGifts, GiftDisplay } from "@/lib/giftItems";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TenantThemeInjector from "@/components/common/TenantThemeInjector";
import TrustedBadge from "@/components/common/TrustedBadge";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";

interface ProductFile {
  id: string;
  title: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
}

const DigitalProductDeliveryPage = () => {
  const { t, i18n } = useTranslation();
  const { productSlug } = useParams();
  const [searchParams] = useSearchParams();
  const purchaseIdParam = searchParams.get("purchase");
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [giftCourses, setGiftCourses] = useState<GiftDisplay[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  useBrandedPageTitle(t("miscPublic.studentDashboard.tabTitles.download"));
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(urls.studentAuthUrl());
      return;
    }

    const load = async () => {
      try {
        const { data: tenant } = await supabase
          .from("public_tenants")
          .select("id, primary_color, whatsapp_number")
          .eq("slug", mentorSlug!)
          .single();
        if (!tenant) {
          setLoading(false);
          return;
        }
        setPrimaryColor(tenant.primary_color);
        setWhatsappNumber((tenant as any).whatsapp_number ?? null);

        const { data: productData } = await supabase
          .from("digital_products")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("slug", productSlug!)
          .single();
        if (!productData) {
          setLoading(false);
          return;
        }
        setProduct(productData);

        // Verify purchase — check by purchase ID param first (from delivery email),
        // fall back to matching student + product for this tenant.
        let purchaseFound = false;
        if (purchaseIdParam) {
          const { data: p } = await supabase
            .from("digital_product_purchases")
            .select("id, payment_status, digital_product_id, tenant_id, students(user_id)")
            .eq("id", purchaseIdParam)
            .maybeSingle();
          if (
            p &&
            (p as any).payment_status === "completed" &&
            (p as any).digital_product_id === productData.id &&
            (p as any).tenant_id === tenant.id &&
            (p as any).students?.user_id === user.id
          ) {
            purchaseFound = true;
          }
        }
        if (!purchaseFound) {
          const { data: student } = await supabase
            .from("students")
            .select("id")
            .eq("user_id", user.id)
            .eq("tenant_id", tenant.id)
            .maybeSingle();
          if (student) {
            const { data: purchase } = await supabase
              .from("digital_product_purchases")
              .select("id")
              .eq("student_id", student.id)
              .eq("digital_product_id", productData.id)
              .eq("payment_status", "completed")
              .maybeSingle();
            if (purchase) purchaseFound = true;
          }
        }
        if (!purchaseFound) {
          setLoading(false);
          return;
        }
        setHasAccess(true);

        // Load files (RLS allows since purchased)
        const { data: filesData } = await supabase
          .from("digital_product_files")
          .select("id, title, file_url, file_size_bytes, file_type")
          .eq("digital_product_id", productData.id)
          .eq("is_sample", false)
          .order("sort_order");
        setFiles(filesData || []);

        // Load gifts (all kinds: courses, live courses, consultations, digital products)
        const giftItems = await loadDigitalProductGifts(productData.id);
        const gifts = await fetchGiftDisplays(giftItems);
        setGiftCourses(gifts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, mentorSlug, productSlug, purchaseIdParam]);

  const handleDownload = async (file: ProductFile) => {
    setDownloading(file.id);
    try {
      const { data, error } = await supabase.storage
        .from("digital-products")
        .createSignedUrl(file.file_url, 60 * 10); // 10 minutes
      if (error || !data?.signedUrl) {
        throw error || new Error(t("digitalProduct.delivery.downloadNotCreated"));
      }
      window.open(data.signedUrl, "_blank");

      // Track download (fire-and-forget)
      try {
        const { data: tenant } = await supabase
          .from("public_tenants").select("id").eq("slug", mentorSlug!).maybeSingle();
        const { data: stu } = await supabase
          .from("students").select("id").eq("user_id", user!.id).eq("tenant_id", tenant!.id).maybeSingle();
        if (tenant && stu && product) {
          await supabase.from("digital_product_download_logs").insert({
            tenant_id: tenant.id,
            digital_product_id: product.id,
            file_id: file.id,
            student_id: stu.id,
            file_title: file.title,
          });
          await supabase.rpc("increment_dp_file_download", { _file_id: file.id });
        }
      } catch (e) {
        console.warn("Failed to log download:", e);
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast({
        title: t("digitalProduct.delivery.downloadError"),
        description: err?.message || t("digitalProduct.delivery.downloadUrlFailed"),
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        <div className="max-w-md w-full mx-4 bg-card rounded-2xl border p-8 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">{t("digitalProduct.delivery.noAccessTitle")}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {t("digitalProduct.delivery.noAccessDesc")}
          </p>
          <Link to={urls.mentorPath(`/p/${productSlug}`)} className="block">
            <Button className="w-full">{t("digitalProduct.delivery.viewProduct")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isRtl = i18n.language === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      {primaryColor && <TenantThemeInjector primaryColor={primaryColor} />}

      {/* Sticky top bar (lesson-viewer style, no progress) */}
      <header className="bg-card/70 backdrop-blur-xl border-b border-border/60 h-14 sm:h-16 flex items-center px-3 sm:px-6 gap-3 sm:gap-4 shrink-0 sticky top-0 z-30">
        <Link
          to={urls.studentDashboardUrl()}
          className="group flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors truncate max-w-[220px] sm:max-w-none"
        >
          <span className="w-8 h-8 rounded-full bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors shrink-0">
            <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          </span>
          <span className="truncate font-semibold text-foreground">{product.title}</span>
        </Link>
        <div className="flex-1" />
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/5 border border-primary/20 rounded-full px-2.5 py-1">
          <CheckCircle className="w-3.5 h-3.5" />
          {t("digitalProduct.payment.successTitle")}
        </span>
      </header>

      {/* Focused vertical stream */}
      <div className="w-full flex justify-center py-6 sm:py-10 px-3 sm:px-4 flex-1">
        <div className="w-full max-w-4xl space-y-5 sm:space-y-6">
          {/* Hero card */}
          <div className="bg-card rounded-3xl border border-border/60 shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.15)] p-6 sm:p-10">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80 font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{t("digitalProduct.delivery.filesTitle")}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground leading-[1.2] tracking-tight mb-3">
              {product.title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
              {t("digitalProduct.delivery.thanks")}
            </p>
          </div>

          {/* Files — numbered rows */}
          <div className="bg-card rounded-3xl border border-border/60 shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.15)] p-6 sm:p-8">
            <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-border/60">
              <h2 className="text-sm font-semibold text-foreground tracking-wide rtl:tracking-normal">
                {t("digitalProduct.delivery.filesTitle")}
              </h2>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {String(files.length).padStart(2, "0")}
              </span>
            </div>

            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("digitalProduct.delivery.filesEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {files.map((file, idx) => (
                  <li key={file.id} className="group flex items-center gap-4 py-4">
                    <span className="text-xs font-mono text-muted-foreground/70 tabular-nums w-6 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.title}
                      </p>
                      {file.file_size_bytes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {formatBytes(file.file_size_bytes)}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-9 gap-1.5 text-primary hover:text-primary hover:bg-primary/5 rounded-full"
                    >
                      {downloading === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">
                            {t("digitalProduct.delivery.download")}
                          </span>
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Gift courses */}
          {giftCourses.length > 0 && (
            <div className="bg-card rounded-3xl border border-border/60 shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.15)] p-6 sm:p-8">
              <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground tracking-wide rtl:tracking-normal">
                    {t("digitalProduct.delivery.giftsTitle")}
                  </h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {String(giftCourses.length).padStart(2, "0")}
                </span>
              </div>
              <ul className="divide-y divide-border/50">
                {giftCourses.map((gc) => (
                  <li key={`${gc.kind}:${gc.id}`}>
                    <Link
                      to={urls.mentorPath(gc.path)}
                      className="group flex items-center gap-4 py-4"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        {gc.thumbnail_url ? (
                          <img src={gc.thumbnail_url} alt={gc.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {gc.title}
                        </p>
                        <p className="text-[11px] text-primary/80 font-medium mt-1">
                          {t(`digitalProduct.delivery.giftCta.${gc.kind}`, {
                            defaultValue: t("digitalProduct.delivery.startWatching"),
                          })}
                        </p>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-all shrink-0 ${isRtl ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extras — inline chips */}
          {(product.has_certificate || product.has_individual_support || (product.has_community && product.community_link)) && (
            <div className="flex flex-wrap gap-2">
              {product.has_certificate && (
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/60 bg-card text-xs font-medium text-foreground">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  {t("digitalProduct.delivery.certificate")}
                </span>
              )}
              {product.has_individual_support && (
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/60 bg-card text-xs font-medium text-foreground">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  {t("digitalProduct.delivery.individualSupport")}
                </span>
              )}
              {product.has_community && product.community_link && (
                <a
                  href={product.community_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-primary/40 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t("digitalProduct.delivery.joinCommunity")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {whatsappNumber && <MentorWhatsAppButton phoneNumber={whatsappNumber} />}
      <TrustedBadge />
    </div>
  );
};

export default DigitalProductDeliveryPage;
