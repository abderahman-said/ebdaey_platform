import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { X, Download, Share, Plus, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { isIos, isMobileDevice, isStandalone } from "@/lib/pwaManifest";
import {
  getAppDisplayName,
  subscribeAppDisplayName,
} from "@/lib/appIdentity";
import {
  clearInstallPrompt,
  getInstallPrompt,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/registerPwa";

const DISMISS_KEY = "pwa-install-banner-dismissed-v2";

/**
 * Slim dismissible top banner inviting the user to install the app.
 * Clicking the CTA fires the browser's native install prompt. The manual
 * instructions are reserved for iOS, where browsers expose no install API.
 */
const InstallAppBanner = () => {
  const { t } = useTranslation();
  // The branded app name applied by the manifest injection: the mentor's
  // academy on student pages, the platform name inside the mentor app.
  const brandedName = useSyncExternalStore(subscribeAppDisplayName, getAppDisplayName, () => "");
  const appName = brandedName || t("pwa.appFallbackName");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(() => getInstallPrompt());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [installed, setInstalled] = useState(() => isStandalone());
  const [howToOpen, setHowToOpen] = useState(false);
  const ios = isIos();
  const mobile = isMobileDevice();


  useEffect(() => {
    const onInstalledEvt = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const unsubscribe = subscribeToInstallPrompt(setPromptEvent);
    window.addEventListener("appinstalled", onInstalledEvt);
    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalledEvt);
    };
  }, []);

  // On desktop, wait for the browser's native one-click install prompt. On
  // phones and tablets always show the banner: when the native prompt is not
  // available we fall back to the manual "add to home screen" instructions.
  if (installed || dismissed || (!mobile && !promptEvent)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleInstall = async () => {
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        clearInstallPrompt();
        return;
      } catch {
        clearInstallPrompt();
      }
    }
    setHowToOpen(true);
  };


  

  return (
    <>
      <div className="relative z-40 w-full bg-primary text-primary-foreground">
        <div className="container flex items-center gap-2 sm:gap-3 py-2 px-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            aria-label={t("pwa.dismissBanner")}
            className="shrink-0 w-7 h-7 text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="w-4 h-4" />
          </Button>

          <p className="flex-1 min-w-0 text-center text-[12px] sm:text-sm font-medium leading-snug rtl:tracking-normal">
            {t("pwa.bannerText", { app: appName })}
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={handleInstall}
            className="shrink-0 h-8 gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground hover:text-primary-foreground px-3 text-[12px] sm:text-sm font-bold rtl:tracking-normal"
          >
            <Download className="w-3.5 h-3.5" />
            {t("pwa.bannerCta")}
          </Button>
        </div>
      </div>

      <Dialog open={howToOpen} onOpenChange={setHowToOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pwa.howToTitle")}</DialogTitle>
            <DialogDescription>{t("pwa.howToDescription")}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            {ios ? (
              <>
                <li className="flex items-center gap-2">
                  <Share className="w-4 h-4 text-primary shrink-0" />
                  {t("pwa.iosStep1")}
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                  {t("pwa.iosStep2")}
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2">
                  <MoreVertical className="w-4 h-4 text-primary shrink-0" />
                  {t("pwa.androidStep1")}
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary shrink-0" />
                  {t("pwa.androidStep2")}
                </li>
              </>
            )}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppBanner;
