import { useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { getFriendlyPaymentError } from "@/lib/checkout/paymentFailureMessage";

const PaymentFailureDetails = () => {
  const [params] = useSearchParams();
  const friendly = getFriendlyPaymentError({
    gwCode: params.get("gwCode"),
    gwMessage: params.get("gwMessage"),
    reason: params.get("reason"),
  });

  if (!friendly) return null;

  return (
    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-start">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-semibold text-destructive">تفاصيل الخطأ</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{friendly}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailureDetails;
