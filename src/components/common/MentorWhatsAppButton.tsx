import whatsappIcon from "@/assets/whatsapp-icon.png";
import { useTranslation } from "react-i18next";

interface MentorWhatsAppButtonProps {
  phoneNumber: string;
  showDualOptions?: boolean;
  position?: "bottom-end" | "bottom-start";
  liftOnMobile?: boolean;
}

const MentorWhatsAppButton = ({ phoneNumber, position = "bottom-end", liftOnMobile = false }: MentorWhatsAppButtonProps) => {
  const { t } = useTranslation();
  const handleClick = () => {
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const positionClasses =
    position === "bottom-start"
      ? "fixed bottom-4 left-4 z-50"
      : `fixed ${liftOnMobile ? "bottom-28 lg:bottom-4" : "bottom-4"} end-4 z-50`;

  return (
    <div className={positionClasses}>
      <button
        onClick={handleClick}
        className="w-14 h-14 flex items-center justify-center group cursor-pointer"
        aria-label={t("miscPublic.whatsapp.contact")}
      >
        <div className="relative">
          <img
            src={whatsappIcon}
            alt={t("miscPublic.whatsapp.alt")}
            className="w-10 h-10 drop-shadow-md"
          />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black rounded-full ring-2 ring-white" />
        </div>
      </button>
    </div>
  );
};

export default MentorWhatsAppButton;
