import { Link } from "react-router-dom";
import { getMentorAppUrl } from "@/lib/subdomain";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import logoGreen from "@/assets/logo-green.png";
import logoEnglishAsset from "@/assets/logo-ebdaey-english.png.asset.json";
import OptimizedImage from "@/components/media/OptimizedImage";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  variant?: "transparent-on-top" | "solid";
}

const SiteNavbar = ({ variant = "transparent-on-top" }: Props) => {
  const [scrolled, setScrolled] = useState(variant === "solid");
  const { user, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  useEffect(() => {
    if (variant === "solid") return;
    const fn = () => setScrolled(window.scrollY > 20);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [variant]);

  return (
    <nav
      dir={dir}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16 gap-4">
        <Link
          to="/"
          className="flex items-center shrink-0 w-[130px] h-9"
          aria-label={i18n.language?.startsWith("en") ? "Ebdaey - Home" : "منصة إبداعي - الصفحة الرئيسية"}
        >
          <OptimizedImage
            src={i18n.language?.startsWith("en") ? logoEnglishAsset.url : logoGreen}
            alt={i18n.language?.startsWith("en") ? "Ebdaey Platform" : "منصة إبداعي"}
            className="h-9 w-auto max-w-[130px] object-contain"
            width={130}
            height={36}
            sizes="130px"
            priority
          />
        </Link>
        <div className="flex items-center gap-1 md:gap-2 shrink-0 min-h-[40px]">
          <LanguageSwitcher variant="navbar" />
          {user ? (
            <AuthStatusButton />
          ) : (
            <>
              <a href={getMentorAppUrl("/login")}>
                <button className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-primary px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-transparent hover:border-primary hover:bg-transparent transition-all duration-150">
                  {t("common.login")}
                </button>
              </a>
              <a href={getMentorAppUrl("/login?signup=1")}>
                <button className="text-xs hidden md:flex sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-px active:translate-y-0 transition-all duration-200">
                  {t("common.startNow")}
                </button>
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default SiteNavbar;
