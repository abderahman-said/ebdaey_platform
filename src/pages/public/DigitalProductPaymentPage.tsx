import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import UnifiedPaymentResultLayout, { type ResultStatus } from "@/components/checkout/UnifiedPaymentResultLayout";
import PasswordSetupCard from "@/components/checkout/PasswordSetupCard";
import PaymentFailureDetails from "@/components/checkout/PaymentFailureDetails";
import { useStudentPasswordSetup } from "@/lib/checkout/useStudentPasswordSetup";
import { useAuth } from "@/hooks/useAuth";
import { postPaymentResultToParent } from "@/lib/checkout/iframeBridge";
import { confirmStripePayment } from "@/lib/checkout/confirmStripe";

const normalizeStatus = (value: string | null) => (value || "").toLowerCase();

const extractPurchaseIdFromOrderRef = (value: string | null) => {
  if (!value?.startsWith("dp_")) return null;
  return value.slice(3).replace(/_\d{10,}$/, "");
};

const DigitalProductPaymentPage = () => {
  const { t } = useTranslation();
  const { productSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [bridged] = useState(() => postPaymentResultToParent(window.location.search));
  const [status, setStatus] = useState<ResultStatus>("loading");
  const [productName, setProductName] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [resolvedPurchaseId, setResolvedPurchaseId] = useState<string | null>(null);
  const [accountHasPassword, setAccountHasPassword] = useState<boolean | null>(null);
  const [purchaseUserId, setPurchaseUserId] = useState<string | null>(null);

  const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("status");
  const orderId = searchParams.get("merchantOrderId") || searchParams.get("merchant_order_id") || searchParams.get("orderId");
  const isFree = searchParams.get("free") === "true";
  const purchaseIdParam = searchParams.get("purchaseId");
  const paymobSuccess = normalizeStatus(searchParams.get("success"));
  const paymobError = normalizeStatus(searchParams.get("error_occured"));

  const { submit, submitting, done, serverError, needsExistingPassword } = useStudentPasswordSetup(
    (password) => {
      const pid = resolvedPurchaseId || localStorage.getItem("dp_purchase_id");
      if (!pid) return null;
      return { digital_product_purchase_id: pid, password };
    },
    {
      fallbackEmail: checkoutEmail,
      existingAccount: accountHasPassword === true,
      onSuccess: () => {
        localStorage.removeItem("checkout_email");
        localStorage.removeItem("dp_purchase_id");
      },
    },
  );

  useEffect(() => {
    setCheckoutEmail(localStorage.getItem("checkout_email") || "");
    const fromOrder = extractPurchaseIdFromOrderRef(orderId);
    const pid = purchaseIdParam || fromOrder || localStorage.getItem("dp_purchase_id");
    if (pid) setResolvedPurchaseId(pid);
  }, [orderId, purchaseIdParam]);

  useEffect(() => {
    if (!mentorSlug) return;
    supabase.from("public_tenants").select("primary_color").eq("slug", mentorSlug).maybeSingle()
      .then(({ data }) => data?.primary_color && setPrimaryColor(data.primary_color));
  }, [mentorSlug]);

  useEffect(() => {
    const checkStatus = async () => {
      const normalizedPaymentStatus = normalizeStatus(paymentStatus);
      const isSuccess = isFree || ["success", "captured", "paid", "completed"].includes(normalizedPaymentStatus) || paymobSuccess === "true";
      const isFailed = ["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(normalizedPaymentStatus) || paymobSuccess === "false" || paymobError === "true";
      const purchaseId = purchaseIdParam || extractPurchaseIdFromOrderRef(orderId) || localStorage.getItem("dp_purchase_id");
      const stripePaid = await confirmStripePayment(searchParams, "dp", purchaseId);
      const isStripeReturn = searchParams.get("gateway") === "stripe";

      if (isSuccess || stripePaid) setStatus("success");
      else if (isFailed || paymentStatus) setStatus("failed");

      if (purchaseId) {
        const { data: purchase } = await supabase
          .from("digital_product_purchases")
          .select("payment_status, digital_products!digital_product_purchases_digital_product_id_fkey(title)")
          .eq("id", purchaseId)
          .maybeSingle();
        if (purchase) {
          setProductName((purchase as any).digital_products?.title || "");
          if (purchase.payment_status === "completed") setStatus("success");
          else if (!stripePaid && !paymentStatus && !paymobSuccess && !paymobError) {
            setTimeout(async () => {
              const { data: updated } = await supabase
                .from("digital_product_purchases")
                .select("payment_status")
                .eq("id", purchaseId)
                .maybeSingle();
              setStatus(updated?.payment_status === "completed" ? "success" : "failed");
            }, 3000);
            return;
          }
        } else if (!stripePaid && !isSuccess && !isFailed && !paymentStatus) {
          // Row not readable (e.g. signed-out shopper) — never stay on the spinner.
          if (isStripeReturn) {
            const retry = await confirmStripePayment(searchParams, "dp", purchaseId);
            setStatus(retry ? "success" : "failed");
          } else {
            setStatus("failed");
          }
        }
      }
      if (!paymentStatus && !orderId && !purchaseId && !paymobSuccess && !isFree) setStatus("failed");
    };
    checkStatus();
  }, [paymentStatus, orderId, purchaseIdParam, paymobSuccess, paymobError, isFree]);

  // Check whether the purchase's account already has a password (repeat customer).
  useEffect(() => {
    if (status !== "success") return;
    const pid = resolvedPurchaseId || (orderId && orderId.startsWith("dp_") ? orderId.slice(3) : null);
    if (!pid) return;
    supabase.functions
      .invoke("check-purchase-account", { body: { digital_product_purchase_id: pid, email: localStorage.getItem("checkout_email") || "" } })
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
  }, [status, resolvedPurchaseId, orderId]);

  const deliveryUrl = urls.mentorPath(`/p/${productSlug}/delivery${resolvedPurchaseId ? `?purchase=${resolvedPurchaseId}` : ""}`);
  const waitingForAccountCheck = status === "success" && !done && !!resolvedPurchaseId && accountHasPassword === null;

  // Only auto-redirect if the logged-in user actually owns this purchase,
  // or the user just finished setting up their password in this flow.
  const sessionOwnsPurchase = !!(session && purchaseUserId && session.user.id === purchaseUserId);
  useEffect(() => {
    if (status === "success" && (sessionOwnsPurchase || done)) {
      const t = setTimeout(() => navigate(deliveryUrl, { replace: true }), done ? 1500 : 0);
      return () => clearTimeout(t);
    }
  }, [status, sessionOwnsPurchase, done, navigate, deliveryUrl]);



  if (bridged) return null;
  if (status === "loading") {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("digitalProduct.payment.verifyingTitle")} subtitle={t("digitalProduct.payment.verifyingSubtitle")} />;
  }
  if (waitingForAccountCheck) {
    return <UnifiedPaymentResultLayout status="loading" primaryColor={primaryColor}
      title={t("digitalProduct.payment.verifyingTitle")} subtitle={t("digitalProduct.payment.verifyingSubtitle")} />;
  }
  if (status === "failed") {
    return <UnifiedPaymentResultLayout status="failed" primaryColor={primaryColor}
      title={t("digitalProduct.payment.failedTitle")} subtitle={t("digitalProduct.payment.failedSubtitle")}
      actions={<Link to={urls.mentorPath(`/p/${productSlug}/checkout`)} className="block">
        <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">{t("digitalProduct.payment.retry")}</Button>
      </Link>}>
      <PaymentFailureDetails />
    </UnifiedPaymentResultLayout>;
  }
  if (!done) {
    return (
      <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
        title={t("digitalProduct.payment.successTitle")}
        subtitle={t((accountHasPassword === true || needsExistingPassword) ? "digitalProduct.payment.signInSubtitle" : "digitalProduct.payment.setPassword", { product: productName || t("digitalProduct.payment.productFallback") })}>
        <PasswordSetupCard email={checkoutEmail} onEmailChange={setCheckoutEmail} submitting={submitting} serverError={serverError} needsExistingPassword={accountHasPassword === true || needsExistingPassword} onSubmit={submit} />
      </UnifiedPaymentResultLayout>
    );
  }
  return (
    <UnifiedPaymentResultLayout status="success" primaryColor={primaryColor}
      title={t("digitalProduct.payment.accountCreated")}
      subtitle={t("digitalProduct.payment.redirecting", { product: productName || t("digitalProduct.payment.productFallback") })}
      actions={<>
        <Link to={deliveryUrl} className="block">
          <Button className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl">
            <Download className="w-4 h-4 ml-2" /> {t("digitalProduct.payment.goNow")}
          </Button>
        </Link>
      </>} />
  );

};

export default DigitalProductPaymentPage;
