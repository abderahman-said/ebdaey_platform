import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SeoHead } from "@/components/common/SeoHead";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SeoHead title={t("miscPublic.notFound.title")} description={t("miscPublic.notFound.description")} path="/404" noindex />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("miscPublic.notFound.pageNotFound")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("miscPublic.notFound.returnHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
