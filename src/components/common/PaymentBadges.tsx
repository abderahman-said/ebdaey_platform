import visaImg from "@/assets/pg-visa.png.asset.json";
import mastercardImg from "@/assets/pg-mastercard.svg.asset.json";
import vodafoneImg from "@/assets/pg-vodafone.jpeg.asset.json";
import orangeImg from "@/assets/pg-orange.png.asset.json";
import etisalatImg from "@/assets/pg-etisalat.png.asset.json";
import meezaImg from "@/assets/pg-meeza.png.asset.json";
import googlePayImg from "@/assets/google-pay-logo.png.asset.json";
import ApplePayLogo from "@/components/common/ApplePayLogo";

interface Props {
  className?: string;
  imgClassName?: string;
  currency?: string | null;
}

const paymobBadges = [
  { src: visaImg.url, alt: "Visa" },
  { src: mastercardImg.url, alt: "Mastercard" },
  { src: vodafoneImg.url, alt: "Vodafone Cash" },
  { src: orangeImg.url, alt: "Orange Cash" },
  { src: etisalatImg.url, alt: "Etisalat Cash" },
  { src: meezaImg.url, alt: "Meeza" },
];

const PaymentBadges = ({ className = "gap-1.5", imgClassName = "h-4 object-contain", currency = "EGP" }: Props) => {
  const usesStripe = (currency || "EGP").toUpperCase() !== "EGP";

  if (usesStripe) {
    return (
      <div className={`flex items-center ${className}`}>
        <img src={visaImg.url} alt="Visa" className={imgClassName} />
        <img src={mastercardImg.url} alt="Mastercard" className={imgClassName} />
        <ApplePayLogo className="h-4 w-auto" />
        <img src={googlePayImg.url} alt="Google Pay" className="h-4 w-auto object-contain" />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {paymobBadges.map((badge) => (
        <img key={badge.alt} src={badge.src} alt={badge.alt} className={imgClassName} />
      ))}
    </div>
  );
};

export default PaymentBadges;
