import whatsappIcon from "@/assets/whatsapp-icon.png";
import { useTranslation } from "react-i18next";

const WhatsAppButton = () => {
  const { t } = useTranslation();
  const phoneNumber = "201505925116";
  const message = t("miscPublic.whatsapp.supportMessage");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 end-4 z-50 w-16 h-16 flex items-center justify-center group"
    >
      <div className="relative">
        <img
          src={whatsappIcon}
          alt={t("miscPublic.whatsapp.alt")}
          className="w-11 h-11 drop-shadow-md"
        />
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-black rounded-full ring-2 ring-white" />
      </div>
    </a>
  );
};

export default WhatsAppButton;
