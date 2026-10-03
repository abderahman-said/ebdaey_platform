import applePayLogo from "@/assets/apple-pay.png.asset.json";

interface Props {
  className?: string;
}

const ApplePayLogo = ({ className = "h-4" }: Props) => (
  <img
    src={applePayLogo.url}
    alt="Apple Pay"
    className={`object-contain ${className}`}
  />
);

export default ApplePayLogo;
