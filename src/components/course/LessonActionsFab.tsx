import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X, FolderOpen, MessageCircle, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import whatsappIcon from "@/assets/whatsapp-icon.png";
import { cn } from "@/lib/utils";

interface Action {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  to?: string;
  external?: boolean;
  bg?: string;
}

interface Props {
  contentBankHref?: string | null;
  communityUrl?: string | null;
  whatsappNumber?: string | null;
  onOpenQA?: () => void;
}

const LessonActionsFab = ({ contentBankHref, communityUrl, whatsappNumber, onOpenQA }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions: Action[] = [];
  if (onOpenQA) {
    actions.push({
      key: "qa",
      label: t("miscPublic.lessonViewer.aiAssistant", { defaultValue: "مساعد الكورس" }),
      icon: <Bot className="w-4 h-4" />,
      onClick: () => { onOpenQA(); setOpen(false); },
    });
  }
  if (whatsappNumber) {
    actions.push({
      key: "wa",
      label: t("miscPublic.whatsapp.contact", { defaultValue: "واتساب" }),
      icon: <img src={whatsappIcon} alt="" className="w-5 h-5" />,
      onClick: () => { window.open(`https://wa.me/${whatsappNumber}`, "_blank"); setOpen(false); },
    });
  }
  if (communityUrl) {
    actions.push({
      key: "community",
      label: t("miscPublic.lessonViewer.joinCommunity", { defaultValue: "المجتمع" }),
      icon: <MessageCircle className="w-4 h-4" />,
      href: communityUrl,
      external: true,
    });
  }
  if (contentBankHref) {
    actions.push({
      key: "bank",
      label: t("miscPublic.lessonViewer.contentBankLabel", { defaultValue: "بنك المحتوى" }),
      icon: <FolderOpen className="w-4 h-4" />,
      to: contentBankHref,
    });
  }

  if (actions.length === 0) return null;

  return (
    <div ref={rootRef} className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-3">
      {/* Action items */}
      <div className="flex flex-col items-end gap-2">
        {actions.map((a, idx) => {
          const inner = (
            <button
              type="button"
              onClick={a.onClick}
              className="group flex items-center gap-2 pe-1.5 ps-3.5 h-10 rounded-full bg-card text-foreground border border-border/60 shadow-md hover:shadow-lg hover:border-primary/40 transition-all"
            >
              <span className="text-xs font-semibold whitespace-nowrap">{a.label}</span>
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {a.icon}
              </span>
            </button>
          );
          const style: React.CSSProperties = {
            transitionDelay: `${open ? idx * 40 : (actions.length - idx) * 20}ms`,
          };
          const wrapperCls = cn(
            "transition-all duration-200 will-change-transform",
            open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none",
          );
          if (a.to) {
            return (
              <div key={a.key} className={wrapperCls} style={style}>
                <Link to={a.to} onClick={() => setOpen(false)}>{inner}</Link>
              </div>
            );
          }
          if (a.href) {
            return (
              <div key={a.key} className={wrapperCls} style={style}>
                <a href={a.href} target={a.external ? "_blank" : undefined} rel={a.external ? "noopener noreferrer" : undefined} onClick={() => setOpen(false)}>
                  {inner}
                </a>
              </div>
            );
          }
          return (
            <div key={a.key} className={wrapperCls} style={style}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("common.close", { defaultValue: "إغلاق" }) : t("common.open", { defaultValue: "فتح" })}
        aria-expanded={open}
        className={cn(
          "w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-transform duration-300",
          open ? "rotate-45 scale-95" : "hover:scale-110",
        )}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default LessonActionsFab;
