import { CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import visaImg from "@/assets/pg-visa.png.asset.json";
import mastercardImg from "@/assets/pg-mastercard.svg.asset.json";
import googlePayImg from "@/assets/google-pay-logo.png.asset.json";
import ApplePayLogo from "@/components/common/ApplePayLogo";

export const isStripeCurrency = (c?: string | null) => (c || "EGP").toUpperCase() !== "EGP";

export const StripePaymentOption = () => {
  const { i18n } = useTranslation();
  const isAr = (i18n?.language || "ar").startsWith("ar");
  return (
    <div className="w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 border-primary bg-primary/5 shadow-sm text-start">
      <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-foreground shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">
            {isAr ? "الدفع بالبطاقة" : "Pay with card"}
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
          <img src={visaImg.url} alt="Visa" className="h-4 object-contain" />
          <img src={mastercardImg.url} alt="Mastercard" className="h-4 object-contain" />
          <ApplePayLogo className="h-4 w-auto" />
          <img src={googlePayImg.url} alt="Google Pay" className="h-4 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
};
