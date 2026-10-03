import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AuthStatusButton from "@/components/auth/AuthStatusButton";
import OptimizedImage from "@/components/media/OptimizedImage";

interface Props {
  mentor: {
    name: string;
    specialty: string | null;
    profile_image_url: string | null;
  };
  mentorSlug: string | undefined;
  profileUrl: string;
  activeSection: string;
  setActiveSection: (id: string) => void;
}

const CourseHeader = ({ mentor, mentorSlug, profileUrl, activeSection, setActiveSection }: Props) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: t("coursePage.header.about"), id: "section-about" },
    { label: t("coursePage.header.features"), id: "section-features" },
    { label: t("coursePage.header.curriculum"), id: "section-curriculum" },
    { label: t("coursePage.header.faqs"), id: "section-faqs" },
  ];

  const [availableIds, setAvailableIds] = useState<string[]>([]);

  useEffect(() => {
    const check = () => setAvailableIds(NAV_LINKS.filter((l) => document.getElementById(l.id)).map((l) => l.id));
    check();
    const t = window.setTimeout(check, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const visibleLinks = availableIds.length ? NAV_LINKS.filter((l) => availableIds.includes(l.id)) : NAV_LINKS;


  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (Math.abs(y - lastY) > 5) {
        setHidden(y > 80 && y > lastY);
        lastY = y;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 container mx-auto px-4 sm:px-6 transition-all duration-300 ${scrolled ? "mt-4" : "mt-0"} ${hidden ? "-translate-y-[150%]" : "translate-y-0"}`}
    >
      <div className="relative">
      <div
        className={`relative backdrop-blur-xl border md:py-3  py-2 md:px-4  px-2  flex items-center justify-between gap-2 transition-all duration-300 ${scrolled ? "rounded-[50px] bg-white/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-border/40" : "rounded-none bg-transparent border-x-transparent border-t-transparent border-border/80"}`}
      >
        <Link to={profileUrl} className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
            {mentor.profile_image_url ? (
              <OptimizedImage
                src={mentor.profile_image_url}
                alt={mentor.name}
                className="w-full h-full object-cover"
                sizes="40px"
              />
            ) : (
              mentor.name.charAt(0)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors duration-200 leading-tight truncate">
              {mentor.name}
            </span>
            {mentor.specialty && (
              <span className="text-[9px] md:text-[11px] text-muted-foreground leading-tight line-clamp-2">
                {mentor.specialty}
              </span>
            )}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 bg-muted/40 rounded-full flex-1 p-1 shrink-0">
          {visibleLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${activeSection === link.id ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white hover:shadow-sm"}`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <AuthStatusButton
            mentorSlug={mentorSlug}
            studentOnly
            variant="outline"
            className="rounded-full px-2 sm:px-6 text-xs sm:text-sm font-semibold h-7 sm:h-9 border-border/50 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          />
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg py-2 px-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {visibleLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`w-full ${isEn ? "text-start" : "text-end"} px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeSection === link.id ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
      </div>
    </header>
  );
};


export default CourseHeader;
