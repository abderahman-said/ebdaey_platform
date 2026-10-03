import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useAuth } from "@/hooks/useAuth";
import UnifiedPaymentResultLayout, { type ResultStatus } from "@/components/checkout/UnifiedPaymentResultLayout";
import PasswordSetupCard from "@/components/checkout/PasswordSetupCard";
import PaymentFailureDetails from "@/components/checkout/PaymentFailureDetails";
import { useStudentPasswordSetup } from "@/lib/checkout/useStudentPasswordSetup";
import { postPaymentResultToParent } from "@/lib/checkout/iframeBridge";
import { confirmStripePayment } from "@/lib/checkout/confirmStripe";

const normalize = (v: string | null) => (v || "").toLowerCase();

const SubscriptionPaymentPage = () => {
  const { t } = useTranslation();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const s = (k: string) => t(`miscPublic.subscribe.${k}`);

  const [bridged] = useState(() => postPaymentResultToParent(window.location.search));
  const [status, setStatus] = useState<ResultStatus>("loading");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [accountHasPassword, setAccountHasPassword] = useState<boolean | null>(null);
  const [purchaseUserId, setPurchaseUserId] = useState<string | null>(null);

  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("status");
  const isFree = searchParams.get("free") === "true";
  const paymobSuccess = normalize(searchParams.get("success"));
  const paymobError = normalize(searchParams.get("error_occured"));

  const dashboardUrl = urls.mentorPath("/dashboard?tab=subscription");

  const { submit, submitting, done, serverError, needsExistingPassword } = useStudentPasswordSetup(
    (password) => {
      const pid = purchaseId || localStorage.getItem("sub_purchase_id");
      if (!pid) return null;
      return { subscription_purchase_id: pid, password };
    },
    {
      fallbackEmail: checkoutEmail,
      existingAccount: accountHasPassword === true,
      onSuccess: () => {
        localStorage.removeItem("checkout_email");
        localStorage.removeItem("sub_purchase_id");
      },
    },
  );

  useEffect(() => {
    setCheckoutEmail(localStorage.getItem("checkout_email") || "");
    const pid = searchParams.get("purchaseId") || localStorage.getItem("sub_purchase_id");
    if (pid) setPurchaseId(pid);
  }, [searchParams]);

  useEffect(() => {
    if (!mentorSlug) return;
    supabase.from("public_tenants").select("primary_color").eq("slug", mentorSlug).maybeSingle()
      .then(({ data }) => data?.primary_color && setPrimaryColor(data.primary_color));
  }, [mentorSlug]);

  useEffect(() => {
    const check = async () => {
      const st = normalize(paymentStatus);
      const isSuccess = isFree || ["success", "captured", "paid", "completed"].includes(st) || paymobSuccess === "true";
      const isFailed = ["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(st)
        || paymobSuccess === "false" || paymobError === "true";
      const pid = searchParams.get("purchaseId") || localStorage.getItem("sub_purchase_id");
      const stripePaid = await confirmStripePayment(searchParams, "sub", pid);

      if (isSuccess || stripePaid) setStatus("success");
      else if (isFailed || paymentStatus) setStatus("failed");

      if (pid && !stripePaid) {
        const { data } = await supabase
          .from("subscription_purchases").select("payment_status").eq("id", pid).maybeSingle();
        if (data?.payment_status === "completed") setStatus("success");
        else if (!paymentStatus && !paymobSuccess && !paymobError) {
          setTimeout(async () => {
            const { data: again } = await supabase
              .from("subscription_purchases").select("payment_status").eq("id", pid).maybeSingle();
            setStatus(again?.payment_status === "completed" ? "success" : "failed");
          }, 3000);
          return;
        }
      }
      if (!paymentStatus && !pid && !paymobSuccess && !isFree) setStatus("failed");
    };
    check();
  }, [paymentStatus, paymobSuccess, paymobError, isFree, searchParams]);

  // Repeat customer? Ask for their existing password instead of a new one.
  useEffect(() => {
    if (status !== "success") return;
    const pid = purchaseId || localStorage.getItem("sub_purchase_id");
    if (!pid) { setAccountHasPassword(false); return; }
    supabase.functions
      .invoke("check-purchase-account", {
        body: { subscription_purchase_id: pid, email: localStorage.getItem("checkout_email") || checkoutEmail || "" },
      })
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
  }, [status, purchaseId]);

  const sessionOwnsPurchase = !!(session && purchaseUserId && session.user.id === purchaseUserId);
  useEffect(() => {
    if (status === "success" && (sessionOwnsPurchase || done)) {
      const timer = setTimeout(() => navigate(dashboardUrl, { replace: true }), done ? 1500 : 0);
      return () => clearTimeout(timer);
    }
  }, [status, sessionOwnsPurchase, done, navigate, dashboardUrl]);

  if (bridged) return null;

  if (status === "loading" || (status === "success" && !done && accountHasPassword === null)) {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={s("verifyingTitle")} subtitle={s("verifyingSubtitle")} />;
  }

  if (status === "failed") {
    return (
      <UnifiedPaymentResultLayout status="failed" primaryColor={primaryColor}
        title={s("failedTitle")} subtitle={s("failedSubtitle")}
        actions={
          <Link to={urls.mentorPath("/subscribe")} className="block">
            <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{s("retry")}</Button>
          </Link>
        }>
        <PaymentFailureDetails />
      </UnifiedPaymentResultLayout>
    );
  }

  if (!done) {
    return (
      <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
        title={s("successTitle")}
        subtitle={(accountHasPassword === true || needsExistingPassword) ? s("signInSubtitle") : s("setPassword")}>
        <PasswordSetupCard
          email={checkoutEmail}
          onEmailChange={setCheckoutEmail}
          submitting={submitting}
          serverError={serverError}
          needsExistingPassword={accountHasPassword === true || needsExistingPassword}
          onSubmit={submit}
        />
      </UnifiedPaymentResultLayout>
    );
  }

  return (
    <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
      title={s("activeTitle")} subtitle={s("redirecting")}
      actions={
        <Link to={dashboardUrl} className="block">
          <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">
            <Crown className="w-4 h-4 me-2" /> {s("goNow")}
          </Button>
        </Link>
      } />
  );
};

export default SubscriptionPaymentPage;
