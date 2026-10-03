import { useEffect, useState, useCallback } from "react";
import { Bell, BellRing, BellDot, MessageSquareDot, Megaphone, Sparkles, Info, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { ANNOUNCEMENT_ICONS } from "@/lib/announcementIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  icon_name: string;
  link_url: string | null;
  created_at: string;
};

const ICONS: Record<string, any> = ANNOUNCEMENT_ICONS;
void [Sparkles, Info, AlertTriangle, CheckCircle2];

type Variant = "default" | "rail" | "mobile" | "menu" | "dock";

export default function PlatformAnnouncementsBell({ variant = "default" }: { variant?: Variant } = {}) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: ann }, { data: reads }] = await Promise.all([
      supabase
        .from("platform_announcements")
        .select("id,title,body,icon_name,link_url,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("platform_announcement_reads").select("announcement_id").eq("user_id", user.id),
    ]);
    setItems((ann || []) as Announcement[]);
    setReadIds(new Set((reads || []).map((r: any) => r.announcement_id)));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`platform_announcements_bell_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_announcements" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((i) => !readIds.has(i.id));
    if (unread.length === 0) return;
    const rows = unread.map((i) => ({ announcement_id: i.id, user_id: user.id }));
    await supabase.from("platform_announcement_reads").upsert(rows, { onConflict: "announcement_id,user_id" });
    setReadIds(new Set([...readIds, ...unread.map((i) => i.id)]));
  };

  const triggerClass =
    variant === "menu"
      ? "mentor-account-menu-item w-full relative"
      : variant === "rail"
      ? "group relative w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      : variant === "mobile"
        ? "sidebar-nav-item sidebar-nav-item-inactive w-full relative"
          : variant === "dock"
          ? "mentor-updates-dock-button relative h-9 w-full rounded-full border border-sidebar-border bg-sidebar p-0 text-sidebar-foreground/70 shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground flex items-center justify-center"
          : "relative w-10 h-10 rounded-xl bg-card border border-border/60 hover:bg-muted/60 transition-colors flex items-center justify-center shadow-sm";

  const iconClass =
    variant === "menu"
      ? "w-4 h-4"
      : variant === "rail"
      ? "w-[20px] h-[20px]"
      : variant === "mobile"
        ? "w-[18px] h-[18px] sidebar-icon"
        : variant === "dock"
          ? "w-4 h-4"
          : "w-5 h-5 text-foreground/80";

  const badgeClass =
    variant === "menu"
      ? "ms-auto min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
      : variant === "rail"
      ? "absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
      : variant === "mobile"
        ? "mr-auto min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
        : variant === "dock"
          ? "absolute -top-1.5 -end-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
          : "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={triggerClass} aria-label={t("platformAnnouncements.aria")}>
          <span className="relative inline-flex">
            <svg
              className={iconClass}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14.5 4H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7.5" />
              <circle
                cx="18.5"
                cy="5.5"
                r="2.75"
                fill={unreadCount > 0 ? "hsl(0 84% 60%)" : "none"}
                stroke={unreadCount > 0 ? "hsl(0 84% 60%)" : "currentColor"}
              />
            </svg>
          </span>

          {(variant === "mobile" || variant === "menu") && <span>{t("platformAnnouncements.title")}</span>}
          {unreadCount > 0 && (
            <span className={badgeClass}>{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
          {variant === "rail" && (
            <span className={`pointer-events-none absolute ${i18n.dir() === "rtl" ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground text-background text-xs font-medium px-2.5 py-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-lg z-50`}>
              {t("platformAnnouncements.title")}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align={variant === "rail" || variant === "dock" ? "start" : "end"} side={variant === "rail" || variant === "dock" ? "left" : variant === "menu" ? "right" : "bottom"} className="w-[360px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border/60">
          <div>
            <p className="text-sm font-bold">{t("platformAnnouncements.title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("platformAnnouncements.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              {t("platformAnnouncements.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]" dir={i18n.dir()}>
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {t("platformAnnouncements.empty")}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {items.map((n) => {
                const Icon = ICONS[n.icon_name] || Megaphone;
                const unread = !readIds.has(n.id);
                return (
                  <li
                    key={n.id}
                    className={`p-3 hover:bg-muted/40 transition-colors ${unread ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">{n.title}</p>
                          {unread && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                        </div>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                          </span>
                          {n.link_url && (
                            <a
                              href={n.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary font-medium inline-flex items-center gap-1 hover:underline"
                            >
                              {t("platformAnnouncements.view")} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
