import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import smartWalletAsset from "@/assets/smart-wallet.png.asset.json";
import nbeAsset from "@/assets/nbe-phonecash.png.asset.json";
import orangeAsset from "@/assets/orange-cash.png.asset.json";
import etisalatAsset from "@/assets/etisalat-cash.png.asset.json";

export type WalletPaymentKind = "order" | "lc" | "dp" | "sub";

interface Props {
  /** PayMob page for this wallet payment, loaded silently in the background */
  backgroundUrl: string;
  kind: WalletPaymentKind;
  id: string;
  onClose: () => void;
  onPaid: () => void;
  onFailed: () => void;
}

const COPY = {
  ar: {
    title: "اختر نوع محفظتك",
    bank: "محفظة بنكية",
    mobile: "محفظة شبكات المحمول",
    bankSteps: [
      "افتح تطبيق المحفظة الخاص بك",
      "اذهب إلى الإشعارات",
      "اختر طلب الدفع من التاجر",
      "قم بإتمام عملية الدفع داخل التطبيق",
      "بعد الانتهاء، اضغط على \"تم الدفع\"",
    ],
    mobileSteps: [
      "افتح تطبيق المحفظة الخاص بك",
      "اذهب إلى \"المشتريات\"",
      "اختر \"طلبات دفع\"",
      "قم بإتمام عملية الدفع داخل التطبيق",
      "بعد الانتهاء، اضغط على \"تم الدفع\"",
    ],
    done: "تم الدفع",
    verifying: "جارٍ التحقق من الدفع...",
    notYet: "لم يصلنا تأكيد الدفع بعد. أكمل الدفع في التطبيق ثم اضغط \"تم الدفع\" مرة أخرى.",
    close: "إغلاق",
  },
  en: {
    title: "Choose your wallet type",
    bank: "Bank wallet",
    mobile: "Mobile network wallet",
    bankSteps: [
      "Open your wallet app",
      "Go to notifications",
      "Choose the merchant's payment request",
      "Complete the payment in the app",
      "When finished, tap \"Payment done\"",
    ],
    mobileSteps: [
      "Open your wallet app",
      "Go to \"Purchases\"",
      "Choose \"Payment requests\"",
      "Complete the payment in the app",
      "When finished, tap \"Payment done\"",
    ],
    done: "Payment done",
    verifying: "Verifying your payment...",
    notYet: "We haven't received the payment confirmation yet. Finish paying in the app, then tap \"Payment done\" again.",
    close: "Close",
  },
};

const WalletInstructionsDialog = ({ backgroundUrl, kind, id, onClose, onPaid, onFailed }: Props) => {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? COPY.en : COPY.ar;
  const [type, setType] = useState<"bank" | "mobile" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const check = async (): Promise<string> => {
    try {
      const { data } = await supabase.functions.invoke("reconcile-paymob-payments", {
        body: { buyer_check: true, kind, id },
      });
      return data?.status || "pending";
    } catch {
      return "pending";
    }
  };

  const handleDone = async () => {
    setVerifying(true);
    setNotYet(false);
    // Poll for up to ~45s — the wallet app can take a moment to report back.
    for (let i = 0; i < 10; i++) {
      if (cancelledRef.current) return;
      const status = await check();
      if (status === "paid") { onPaid(); return; }
      if (status === "failed") { setVerifying(false); onFailed(); return; }
      await new Promise((r) => setTimeout(r, 4500));
    }
    if (cancelledRef.current) return;
    setVerifying(false);
    setNotYet(true);
  };

  const steps = type === "bank" ? c.bankSteps : c.mobileSteps;

  const card = (key: "bank" | "mobile", label: string, logos: string[]) => (
    <button
      type="button"
      onClick={() => { setType(key); setNotYet(false); }}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-card p-4 sm:p-6 transition-colors ${
        type === key ? "border-primary" : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {logos.map((l) => <img key={l} src={l} alt="" className="h-10 max-w-[90px] object-contain" />)}
      </div>
      <span className="text-sm sm:text-base font-bold text-foreground">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-sm sm:p-6">
      {/* Keeps PayMob's own wallet page alive in the background so the request reaches the buyer's app. */}
      <iframe src={backgroundUrl} title="" aria-hidden className="hidden" />
      <div className="relative w-full sm:max-w-xl bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-7 py-5 border-b border-border/60">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{c.title}</h3>
          <button
            onClick={onClose}
            disabled={verifying}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
            aria-label={c.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-7 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {card("bank", c.bank, [smartWalletAsset.url, nbeAsset.url])}
            {card("mobile", c.mobile, [orangeAsset.url, etisalatAsset.url])}
          </div>

          {type && (
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-sm sm:text-base text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          )}

          {notYet && (
            <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-4 py-3">{c.notYet}</p>
          )}
        </div>

        {type && (
          <div className="border-t border-border/60 px-5 sm:px-7 py-5 flex justify-center">
            <button
              type="button"
              onClick={handleDone}
              disabled={verifying}
              className="min-w-[220px] h-12 rounded-full bg-primary text-primary-foreground font-bold text-base inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-80"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {verifying ? c.verifying : c.done}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletInstructionsDialog;
