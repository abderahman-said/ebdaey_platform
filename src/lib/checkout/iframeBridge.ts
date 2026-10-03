// Bridge: when a PayMob return page (/payment) is rendered inside the checkout
// iframe (PayMob breaks out of its own iframe with target=_top), we detect it
// and postMessage the result to the parent window so the parent can show a
// toast + keep the modal open, instead of the whole page navigating away.

export const PAYMENT_RESULT_MESSAGE = "ebdaey:payment-result";

export interface PaymentResultMessage {
  type: typeof PAYMENT_RESULT_MESSAGE;
  status: "success" | "failed";
  params: Record<string, string>;
}

export const isInsideCheckoutIframe = () => {
  try {
    return typeof window !== "undefined" && window.parent && window.parent !== window;
  } catch {
    return false;
  }
};

export const postPaymentResultToParent = (search: string) => {
  if (!isInsideCheckoutIframe()) return false;
  const params = new URLSearchParams(search);
  const raw = (params.get("paymentStatus") || params.get("status") || "").toLowerCase();
  const success = params.get("success")?.toLowerCase();
  const err = params.get("error_occured")?.toLowerCase();
  const isFail = ["failed", "failure", "cancelled", "canceled", "declined", "error"].includes(raw)
    || success === "false" || err === "true";
  const isSuccess = !isFail && (["success", "captured", "paid", "completed"].includes(raw) || success === "true");
  if (!isFail && !isSuccess) return false;
  const obj: Record<string, string> = {};
  params.forEach((v, k) => { obj[k] = v; });
  const msg: PaymentResultMessage = {
    type: PAYMENT_RESULT_MESSAGE,
    status: isFail ? "failed" : "success",
    params: obj,
  };
  try {
    window.parent.postMessage(msg, "*");
    return true;
  } catch {
    return false;
  }
};
