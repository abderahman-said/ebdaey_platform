import { useEffect, useRef } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import WalletInstructionsDialog, { type WalletPaymentKind } from "./WalletInstructionsDialog";
import { PAYMENT_RESULT_MESSAGE, type PaymentResultMessage } from "@/lib/checkout/iframeBridge";

export interface PaymobFailureInfo {
  gwCode?: string;
  gwMessage?: string;
  reason?: string;
}

interface Props {
  open: boolean;
  iframeUrl: string | null;
  successUrlPrefix: string; // when iframe navigates to a URL starting with this, treat as result
  onClose: () => void;
  onSuccess: (url: string) => void;
  onFailure?: (info: PaymobFailureInfo) => void;
  /** Wallet payment (non-Vodafone): show our instructions dialog instead of PayMob's page */
  wallet?: { kind: WalletPaymentKind; id: string } | null;
}

const isFailureParams = (p: URLSearchParams): boolean => {
  const status = (p.get("paymentStatus") || p.get("status") || "").toLowerCase();
  if (["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(status)) return true;
  if ((p.get("success") || "").toLowerCase() === "false") return true;
  if ((p.get("error_occured") || "").toLowerCase() === "true") return true;
  return false;
};

// Detect PayMob synchronous decline: wallet API sometimes returns a URL that
// already points at our return endpoint with success=false / error_occured=true.
// If we open this in an iframe it just bounces back to /payment with failure
// params. We surface it as an immediate failure instead.
const parseUpfrontFailure = (url: string | null): PaymobFailureInfo | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const p = u.searchParams;
    const looksLikeReturn = /paymob-return/.test(u.pathname) || p.has("hmac") || p.has("txn_response_code");
    if (!looksLikeReturn) return null;
    if (!isFailureParams(p)) return null;
    return {
      gwCode: p.get("txn_response_code") || p.get("gwCode") || undefined,
      gwMessage: p.get("data.message") || p.get("data_message") || p.get("gwMessage") || undefined,
    };
  } catch {
    return null;
  }
};

// Only the legacy vcheckout host still blocks framing (X-Frame-Options DENY).
// The current Unified Checkout host (eg.checkout.paymob.com, reached via
// accept.paymob.com/unifiedcheckout) sends no X-Frame-Options and no
// frame-ancestors, so it can be embedded — which lets Apple Pay present its
// sheet without the customer ever leaving our checkout page.
const requiresTopLevelNavigation = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    // Only Vodafone Cash's vcheckout page must leave our site. Other wallets
    // (e.g. accept.paymobsolutions.com/.../wallet_template) use our helper dialog.
    if (hostname === "vcheckout.paymobsolutions.com") return true;
    return false;
  } catch {
    return false;
  }
};


// Unified Checkout means no request was pushed to the wallet yet — the buyer
// must enter details on PayMob's page, so the helper dialog can't be used.
const isUnifiedCheckout = (url: string | null): boolean => {
  if (!url) return false;
  try { return /unifiedcheckout/i.test(new URL(url).pathname) || new URL(url).hostname.toLowerCase().includes("checkout.paymob.com"); }
  catch { return false; }
};

const PaymobIframeModal = ({ open, iframeUrl, successUrlPrefix, onClose, onSuccess, onFailure, wallet }: Props) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const upfrontFailureFiredRef = useRef<string | null>(null);
  const resultHandledRef = useRef(false);

  useEffect(() => {
    if (open) resultHandledRef.current = false;
  }, [open, iframeUrl]);

  const reportFailureOnce = (info: PaymobFailureInfo) => {
    if (resultHandledRef.current) return;
    resultHandledRef.current = true;
    onFailure?.(info);
    onClose();
  };

  // If the iframeUrl itself is a pre-failed PayMob return URL, fire onFailure
  // immediately and don't render the modal at all.
  useEffect(() => {
    if (!open || !iframeUrl) return;
    const info = parseUpfrontFailure(iframeUrl);
    if (info && upfrontFailureFiredRef.current !== iframeUrl) {
      upfrontFailureFiredRef.current = iframeUrl;
      reportFailureOnce(info);
      return;
    }
    // PayMob Unified Checkout (vcheckout.paymobsolutions.com) sets
    // X-Frame-Options DENY and cannot be embedded. Top-navigate the parent
    // window instead. The /payment return page handles success/failure toasts.
    if (!info && requiresTopLevelNavigation(iframeUrl)) {
      try {
        (window.top || window).location.href = iframeUrl;
      } catch {
        window.location.href = iframeUrl;
      }
    }

  }, [open, iframeUrl, onFailure, onClose]);

  const isPreFailed = !!parseUpfrontFailure(iframeUrl);
  const walletMode =
    !!wallet && !!iframeUrl && !isPreFailed && !requiresTopLevelNavigation(iframeUrl) && !isUnifiedCheckout(iframeUrl);

  // Detect same-origin redirect back to our /payment page
  const handleLoad = () => {
    try {
      const href = iframeRef.current?.contentWindow?.location?.href;
      if (!href || !href.startsWith(successUrlPrefix)) return;
      const query = href.split("?")[1] || "";
      const params = new URLSearchParams(query);
      if (isFailureParams(params)) {
        reportFailureOnce({
          gwCode: params.get("gwCode") || undefined,
          gwMessage: params.get("gwMessage") || undefined,
          reason: params.get("reason") || undefined,
        });
        return;
      }
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      onSuccess(href);
    } catch {
      // cross-origin: still on PayMob — ignore
    }
  };


  // Fallback: listen for PayMob postMessage, and for our own bridge message
  // sent from the /payment result page when PayMob breaks out of the iframe.
  useEffect(() => {
    if (!open) return;
    if (walletMode) return;
    const onMsg = (e: MessageEvent) => {
      try {
        // Same-origin bridge from our /payment page rendered inside the iframe
        const bridge = e.data as PaymentResultMessage | undefined;
        if (bridge && typeof bridge === "object" && bridge.type === PAYMENT_RESULT_MESSAGE) {
          if (e.origin !== window.location.origin) return;
          if (bridge.status === "failed") {
            reportFailureOnce({
              gwCode: bridge.params.gwCode,
              gwMessage: bridge.params.gwMessage,
              reason: bridge.params.reason,
            });
          } else {
            if (resultHandledRef.current) return;
            resultHandledRef.current = true;
            const q = new URLSearchParams(bridge.params).toString();
            onSuccess(`${successUrlPrefix}?${q}`);
          }
          return;
        }
        const origin = e.origin || "";
        let host = "";
        try { host = new URL(origin).hostname.toLowerCase(); } catch { return; }
        if (!(host === "accept.paymob.com" || host.endsWith(".paymob.com") || host === "paymob.com")) return;
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.txn_response_code === "APPROVED" || data?.success === true || data?.status === "success") {
          if (resultHandledRef.current) return;
          resultHandledRef.current = true;
          onSuccess(successUrlPrefix);
          return;
        }
        if (data?.success === false || data?.status === "failed" || data?.status === "declined") {
          reportFailureOnce({
            gwCode: data?.txn_response_code ? String(data.txn_response_code) : undefined,
            gwMessage: data?.data?.message || data?.message,
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [open, successUrlPrefix, onSuccess, onFailure, iframeUrl, walletMode]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Legacy hosts that block framing are top-navigated by the effect above, so
  // never mount them in an iframe — not even for a single render.
  if (!open || !iframeUrl || isPreFailed || requiresTopLevelNavigation(iframeUrl)) return null;

  if (walletMode && wallet) {
    const idParam = wallet.kind === "order" ? "orderId" : "purchaseId";
    return (
      <WalletInstructionsDialog
        backgroundUrl={iframeUrl}
        kind={wallet.kind}
        id={wallet.id}
        onClose={onClose}
        onPaid={() => {
          if (resultHandledRef.current) return;
          resultHandledRef.current = true;
          onSuccess(`${successUrlPrefix}?${idParam}=${encodeURIComponent(wallet.id)}&paymentStatus=SUCCESS&success=true`);
        }}
        onFailed={() => reportFailureOnce({})}
      />
    );
  }

  const openFullPage = () => {
    try {
      (window.top || window).location.href = iframeUrl;
    } catch {
      window.location.href = iframeUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6">
      <div className="relative w-full h-full md:max-w-2xl md:h-[85vh] bg-card md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/95">
          <h3 className="font-bold text-foreground text-sm">{t("coursePage.checkout.payment.iframeTitle")}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={openFullPage}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label={t("coursePage.checkout.payment.iframeTitle")}
              title={t("coursePage.checkout.payment.iframeTitle")}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              aria-label={t("coursePage.checkout.payment.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-muted/30">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            onLoad={handleLoad}
            title="PayMob Checkout"
            allow="payment *; publickey-credentials-get *"
            className="relative w-full h-full border-0 bg-background"
          />
        </div>
      </div>
    </div>

  );
};

export default PaymobIframeModal;
