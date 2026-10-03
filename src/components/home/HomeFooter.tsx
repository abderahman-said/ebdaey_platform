import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import logoGreen from "@/assets/logo-green.png";
import logoEnglishAsset from "@/assets/logo-ebdaey-english.png.asset.json";
import OptimizedImage from "@/components/media/OptimizedImage";
import SiteSocialLinks from "@/components/common/SiteSocialLinks";
import { TornEdge } from "./shared";
import { COUNTRIES } from "@/lib/countries";

export default function HomeFooter() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  return (
    <footer className="relative z-10 bg-[#0f2e22] text-white">
      <TornEdge color="#fff" />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-12 sm:pb-8 space-y-8">
        {/* Top Section: Brand Identity & Social Follow */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 text-center sm:text-start">
            <Link
              to="/"
              className="flex items-center shrink-0"
              aria-label={isEn ? "Ebdaey - Home" : "منصة إبداعي - الصفحة الرئيسية"}
            >
              <OptimizedImage
                src={isEn ? logoEnglishAsset.url : logoGreen}
                alt={isEn ? "Ebdaey Platform" : "منصة إبداعي"}
                className="h-9 max-w-[150px] w-auto object-contain"
                width={140}
                height={36}
                sizes="140px"
              />
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-white/20" />
            <p className="text-xs sm:text-sm text-[#eef7f1]/60 max-w-md leading-relaxed">
              {isEn
                ? "The complete Arabic platform to sell courses, digital products, and book consultations."
                : "المنصة العربية المتكاملة لبيع الكورسات والمنتجات الرقمية وحجز الاستشارات."}
            </p>
          </div>
          <div className="shrink-0">
            <SiteSocialLinks variant="dark" withLabel />
          </div>
        </div>

        {/* Middle Section: Organized Regional Countries Showcase */}
        <div className="space-y-3 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#32A873]/15 text-[#32A873]">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#32A873] font-semibold">
              {isEn ? "Ebdaey across the Arab World" : "إبداعي في الوطن العربي"}
            </span>
          </div>

          <nav
            aria-label={isEn ? "Countries we serve" : "الدول التي نخدمها"}
            className="flex flex-wrap items-center gap-2"
          >
            {COUNTRIES.map((c) => (
              <Link
                key={c.code}
                to={`/country/${c.code}`}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#32A873]/50 hover:bg-[#32A873]/10 text-xs text-[#eef7f1]/70 hover:text-white transition-all duration-200"
              >
                <span className="inline-flex transition-transform group-hover:scale-110">
                  <img
                    src={`https://flagcdn.com/w40/${c.code}.png`}
                    srcSet={`https://flagcdn.com/w80/${c.code}.png 2x`}
                    alt=""
                    className="w-5 h-3.5 object-cover rounded-[2px]"
                    loading="lazy"
                  />
                </span>
                <span className="font-medium">{isEn ? c.en.name : c.ar.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Copyright & Legal Navigation Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <p className="text-xs sm:text-sm text-[#eef7f1]/50 order-2 md:order-1">
            {t("home.footer.rights", { year: new Date().getFullYear() })}
          </p>

          <nav
            aria-label={isEn ? "Legal and company links" : "روابط الموقع والسياسات"}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#eef7f1]/60 order-1 md:order-2"
          >
            <Link to="/privacy-policy" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.privacy")}
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.terms")}
            </Link>
            <Link to="/refund-policy" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.refund")}
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.contact")}
            </Link>
            <Link to="/about" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.about")}
            </Link>
            <Link to="/delivery-policy" className="hover:text-primary transition-colors duration-200">
              {t("home.footer.delivery")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
