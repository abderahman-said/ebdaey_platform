import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UnifiedPaymentResultLayout, { type ResultStatus } from "@/components/checkout/UnifiedPaymentResultLayout";
import PasswordSetupCard from "@/components/checkout/PasswordSetupCard";
import PaymentFailureDetails from "@/components/checkout/PaymentFailureDetails";
import { useStudentPasswordSetup } from "@/lib/checkout/useStudentPasswordSetup";
import { useAuth } from "@/hooks/useAuth";
import { postPaymentResultToParent } from "@/lib/checkout/iframeBridge";
import { confirmStripePayment } from "@/lib/checkout/confirmStripe";

const LiveCoursePaymentPage = () => {
  const [bridged] = useState(() => postPaymentResultToParent(window.location.search));
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [status, setStatus] = useState<ResultStatus>("loading");
  const [courseName, setCourseName] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [resolvedPurchaseId, setResolvedPurchaseId] = useState<string | null>(null);
  const [accountHasPassword, setAccountHasPassword] = useState<boolean | null>(null);
  const [purchaseUserId, setPurchaseUserId] = useState<string | null>(null);

  const normalizeStatus = (v: string | null) => (v || "").toLowerCase();
  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("status");
  const orderId = searchParams.get("merchantOrderId") || searchParams.get("merchant_order_id") || searchParams.get("orderId");
  const purchaseIdParam = searchParams.get("purchaseId");
  const isFree = searchParams.get("free") === "true";
  const paymobSuccess = normalizeStatus(searchParams.get("success"));
  const paymobError = normalizeStatus(searchParams.get("error_occured"));

  const { submit, submitting, done, serverError, needsExistingPassword } = useStudentPasswordSetup(
    (password) => {
      const pid = resolvedPurchaseId || localStorage.getItem("lc_purchase_id");
      if (!pid) return null;
      return { live_course_purchase_id: pid, password };
    },
    {
      fallbackEmail: checkoutEmail,
      existingAccount: accountHasPassword === true,
      onSuccess: () => {
        localStorage.removeItem("checkout_email");
        localStorage.removeItem("lc_purchase_id");
      },
    },
  );

  useEffect(() => {
    setCheckoutEmail(localStorage.getItem("checkout_email") || "");
    const normalizedOrderId = orderId?.replace(/_\d{10,}$/, "");
    const fromOrder = normalizedOrderId && normalizedOrderId.startsWith("lc_") ? normalizedOrderId.slice(3) : null;
    const pid = purchaseIdParam || fromOrder || localStorage.getItem("lc_purchase_id");
    if (pid) setResolvedPurchaseId(pid);
  }, [orderId, purchaseIdParam]);

  useEffect(() => {
    if (!mentorSlug) return;
    supabase.from("public_tenants").select("primary_color").eq("slug", mentorSlug).maybeSingle()
      .then(({ data }) => data?.primary_color && setPrimaryColor(data.primary_color));
  }, [mentorSlug]);

  useEffect(() => {
    const checkStatus = async () => {
      const normalized = (paymentStatus || "").toLowerCase();
      const isSuccess = isFree
        || ["success", "captured", "paid", "completed"].includes(normalized)
        || paymobSuccess === "true";
      const isFailed = ["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(normalized)
        || paymobSuccess === "false" || paymobError === "true";
      const normalizedOrderId = orderId?.replace(/_\d{10,}$/, "");
      const fromOrder = normalizedOrderId && normalizedOrderId.startsWith("lc_") ? normalizedOrderId.slice(3) : null;
      const purchaseId = purchaseIdParam || fromOrder || localStorage.getItem("lc_purchase_id");
      const stripePaid = await confirmStripePayment(searchParams, "lc", purchaseId);

      if (isSuccess || stripePaid) setStatus("success");
      else if (isFailed || paymentStatus) setStatus("failed");

      if (purchaseId) {
        const { data: p } = await supabase
          .from("live_course_purchases" as any)
          .select("payment_status, live_courses!live_course_purchases_live_course_id_fkey(title)")
          .eq("id", purchaseId).maybeSingle();
        if (p) {
          setCourseName((p as any).live_courses?.title || "");
          if ((p as any).payment_status === "completed") setStatus("success");
          else if (!stripePaid && !paymentStatus && !paymobSuccess && !paymobError) {
            setTimeout(async () => {
              const { data: u } = await supabase
                .from("live_course_purchases" as any).select("payment_status").eq("id", purchaseId).maybeSingle();
              setStatus((u as any)?.payment_status === "completed" ? "success" : "failed");
            }, 3000);
            return;
          }
        }
      }
      if (!paymentStatus && !orderId && !purchaseId && !paymobSuccess && !isFree) setStatus("failed");
    };
    checkStatus();
  }, [paymentStatus, orderId, purchaseIdParam, paymobSuccess, paymobError, isFree]);

  useEffect(() => {
    if (status !== "success" || !resolvedPurchaseId) return;
    supabase.functions
      .invoke("check-purchase-account", { body: { live_course_purchase_id: resolvedPurchaseId, email: localStorage.getItem("checkout_email") || "" } })
      .then(({ data }) => {
        if (data?.found) {
          setAccountHasPassword(!!data.hasPassword);
          setPurchaseUserId(data.userId || null);
          if (data.email) setCheckoutEmail(data.email);
        } else {
          setAccountHasPassword(false);
        }
      })
      .catch(() => setAccountHasPassword(false));
  }, [status, resolvedPurchaseId]);

  // Only auto-redirect if the logged-in user actually owns this purchase,
  // or the user just finished setting up their password in this flow.
  const sessionOwnsPurchase = !!(session && purchaseUserId && session.user.id === purchaseUserId);
  useEffect(() => {
    if (status === "success" && (sessionOwnsPurchase || done)) {
      const t = setTimeout(() => navigate(urls.studentDashboardUrl(), { replace: true }), done ? 1500 : 0);
      return () => clearTimeout(t);
    }
  }, [status, sessionOwnsPurchase, done, navigate, urls, courseSlug]);

  const courseUrl = urls.mentorPath(`/l/${courseSlug}`);
  const liveCheckoutUrl = urls.mentorPath(`/l/${courseSlug}/checkout`);
  const waitingForAccountCheck = status === "success" && !done && !!resolvedPurchaseId && accountHasPassword === null;

  if (bridged) return null;
  if (status === "loading") {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("liveCourse.payment.verifying")} subtitle={t("liveCourse.payment.pleaseWait")} />;
  }
  if (waitingForAccountCheck || (status === "success" && !done && (authLoading || sessionOwnsPurchase))) {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("liveCourse.payment.verifying")} subtitle={t("liveCourse.payment.pleaseWait")} />;
  }
  if (status === "failed") {
    return <UnifiedPaymentResultLayout status="failed" primaryColor={primaryColor}
      title={t("liveCourse.payment.failed")} subtitle={t("liveCourse.payment.failedDesc")}
      actions={<Link to={liveCheckoutUrl} className="block">
        <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{t("liveCourse.payment.tryAgain")}</Button>
      </Link>}>
      <PaymentFailureDetails />
    </UnifiedPaymentResultLayout>;
  }
  if (!done) {
    return (
      <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
        title={t("liveCourse.payment.confirmed")}
        subtitle={t((accountHasPassword === true || needsExistingPassword) ? "liveCourse.payment.signInSubtitle" : "liveCourse.payment.createPassword", { course: courseName || t("liveCourse.payment.courseFallback") })}>
        <PasswordSetupCard email={checkoutEmail} onEmailChange={setCheckoutEmail} submitting={submitting} serverError={serverError} needsExistingPassword={accountHasPassword === true || needsExistingPassword} onSubmit={submit} />
      </UnifiedPaymentResultLayout>
    );
  }
  return (
    <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
      title={t("liveCourse.payment.accountCreated")}
      subtitle={t("liveCourse.payment.canViewDetails")}
      actions={<>
        <Link to={courseUrl} className="block">
          <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">
            <ArrowRight className="w-4 h-4 ml-2" /> {t("liveCourse.payment.coursePage")}
          </Button>
        </Link>
        <Link to={urls.studentDashboardUrl()} className="block">
          <Button variant="outline" className="w-full rounded-xl">{t("liveCourse.payment.dashboard")}</Button>
        </Link>
      </>} />
  );
};

export default LiveCoursePaymentPage;
