import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UnifiedPaymentResultLayout, { type ResultStatus } from "@/components/checkout/UnifiedPaymentResultLayout";
import PasswordSetupCard from "@/components/checkout/PasswordSetupCard";
import PaymentFailureDetails from "@/components/checkout/PaymentFailureDetails";
import { useStudentPasswordSetup } from "@/lib/checkout/useStudentPasswordSetup";
import { useTranslation } from "react-i18next";
import { postPaymentResultToParent } from "@/lib/checkout/iframeBridge";
import { useAuth } from "@/hooks/useAuth";
import { confirmStripePayment } from "@/lib/checkout/confirmStripe";

const PaymentResult = () => {
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [purchaseUserId, setPurchaseUserId] = useState<string | null>(null);

  // If we were opened inside the PayMob checkout iframe, notify the parent
  // and render nothing — the parent modal will show a toast and let the
  // customer retry without navigating away.
  const [bridged] = useState(() => postPaymentResultToParent(window.location.search));


  const [status, setStatus] = useState<ResultStatus>("loading");
  const [courseName, setCourseName] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [accountHasPassword, setAccountHasPassword] = useState<boolean | null>(null);

  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("status");
  const orderId = searchParams.get("merchantOrderId") || searchParams.get("orderId");
  const isFree = searchParams.get("free") === "true";

  const { submit, submitting, done, serverError, needsExistingPassword } = useStudentPasswordSetup(
    (password) => {
      const storedOrderId =
        localStorage.getItem("checkout_order_id") ||
        localStorage.getItem("order_id") ||
        orderId;
      if (!storedOrderId || storedOrderId === "free") return null;
      return { order_id: storedOrderId, password };
    },
    {
      fallbackEmail: checkoutEmail,
      existingAccount: accountHasPassword === true,
      onSuccess: () => {
        localStorage.removeItem("checkout_email");
        localStorage.removeItem("checkout_order_id");
        localStorage.removeItem("order_id");
      },
    },
  );


  useEffect(() => {
    setCheckoutEmail(localStorage.getItem("checkout_email") || "");
  }, []);

  useEffect(() => {
    if (!mentorSlug) return;
    supabase.from("public_tenants").select("primary_color").eq("slug", mentorSlug).maybeSingle()
      .then(({ data }) => data?.primary_color && setPrimaryColor(data.primary_color));
  }, [mentorSlug]);

  useEffect(() => {
    const checkStatus = async () => {
      const stripePaid = await confirmStripePayment(searchParams, "order", orderId);
      const isSuccess = stripePaid || isFree || paymentStatus === "SUCCESS" || paymentStatus === "CAPTURED" || paymentStatus === "success";

      if (isSuccess) setStatus("success");
      else if (paymentStatus) setStatus("failed");

      if (orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("payment_status, course_id, courses!orders_course_id_fkey(title)")
          .eq("id", orderId).maybeSingle();
        if (order) {
          setCourseName((order as any).courses?.title || "");
          if (order.payment_status === "paid") setStatus("success");
          else if (!paymentStatus && !stripePaid) {
            setTimeout(async () => {
              const { data: updated } = await supabase.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
              setStatus(updated?.payment_status === "paid" ? "success" : "failed");
            }, 3000);
            return;
          }
        }
      }

      if (!paymentStatus && !orderId && !isFree) setStatus("failed");
    };
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus, orderId, isFree]);

  useEffect(() => {
    const storedOrderId = localStorage.getItem("checkout_order_id") || localStorage.getItem("order_id") || orderId;
    if (status !== "success" || !storedOrderId || storedOrderId === "free") return;

    supabase.functions
      .invoke("check-purchase-account", { body: { order_id: storedOrderId, email: localStorage.getItem("checkout_email") || "" } })
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
  }, [status, orderId]);

  const storedOrderId =
    typeof window !== "undefined"
      ? localStorage.getItem("checkout_order_id") || localStorage.getItem("order_id") || orderId
      : null;
  const needsPassword = status === "success" && !done && !!storedOrderId && storedOrderId !== "free";
  const checkingAccount = needsPassword && accountHasPassword === null;

  const displayName = courseName || t("coursePage.checkout.result.defaultCourse");

  const sessionOwnsPurchase = !!(session && purchaseUserId && session.user.id === purchaseUserId);
  useEffect(() => {
    if (status === "success" && sessionOwnsPurchase && !done && courseSlug) {
      navigate(urls.lessonUrl(courseSlug), { replace: true });
    }
  }, [status, sessionOwnsPurchase, done, courseSlug, navigate, urls]);

  if (bridged) return null;

  if (status === "loading") {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("coursePage.checkout.result.loadingTitle")} subtitle={t("coursePage.checkout.result.loadingSubtitle")} />;
  }

  if (checkingAccount || (status === "success" && (authLoading || sessionOwnsPurchase) && !done)) {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("coursePage.checkout.result.loadingTitle")} subtitle={t("coursePage.checkout.result.loadingSubtitle")} />;
  }

  if (status === "failed") {
    return (
      <UnifiedPaymentResultLayout status="failed" primaryColor={primaryColor}
        title={t("coursePage.checkout.result.failedTitle")} subtitle={t("coursePage.checkout.result.failedSubtitle")}
        actions={
          <Link to={urls.checkoutUrl(courseSlug!)} className="block">
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{t("coursePage.checkout.result.retry")}</Button>
          </Link>
        }>
        <PaymentFailureDetails />
      </UnifiedPaymentResultLayout>
    );
  }

  if (needsPassword) {
    return (
      <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
        title={t("coursePage.checkout.result.registeredTitle")}
        subtitle={t((accountHasPassword === true || needsExistingPassword) ? "coursePage.checkout.result.signInSubtitle" : "coursePage.checkout.result.createPassword", { name: displayName })}>
        <PasswordSetupCard email={checkoutEmail} onEmailChange={setCheckoutEmail} submitting={submitting} serverError={serverError} needsExistingPassword={accountHasPassword === true || needsExistingPassword} onSubmit={submit} />
      </UnifiedPaymentResultLayout>
    );
  }


  return (
    <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
      title={done ? t("coursePage.checkout.result.accountCreatedTitle") : t("coursePage.checkout.result.paidTitle")}
      subtitle={done ? t("coursePage.checkout.result.startWatching", { name: displayName }) : t("coursePage.checkout.result.enrolled", { name: displayName })}
      actions={
        done ? (
          <Link to={urls.studentDashboardUrl()} className="block">
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{t("coursePage.checkout.result.dashboard")}</Button>
          </Link>
        ) : (
          <Link to={urls.lessonUrl(courseSlug!)} className="block">
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{t("coursePage.checkout.result.start")}</Button>
          </Link>
        )
      } />
  );
};

export default PaymentResult;
