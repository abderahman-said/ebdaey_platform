import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  icon_name: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface NotificationBellProps {
  tenantId: string;
}

const NotificationBell = ({ tenantId }: NotificationBellProps) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`notif_read_${tenantId}`);
    if (stored) setReadIds(new Set(JSON.parse(stored)));
    loadNotifications();
  }, [tenantId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("source", "mentor")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) || []);
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open && notifications.length > 0) {
      const allIds = new Set(notifications.map((n) => n.id));
      setReadIds(allIds);
      localStorage.setItem(`notif_read_${tenantId}`, JSON.stringify([...allIds]));
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const renderIcon = (name: string) => {
    const Icon = (icons as Record<string, LucideIcon>)[name] || icons.Bell;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute top-16 sm:top-full sm:mt-2 inset-x-3 sm:inset-x-auto sm:end-0 z-50 bg-popover border border-border rounded-xl shadow-xl sm:w-80 max-h-96 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-bold text-sm">{t("notificationBell.title", "Notifications")}</p>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {t("notificationBell.empty", "No notifications")}
            </div>
          ) : (
            <div className="overflow-y-auto max-h-72">
              {notifications.map((n) => ( 
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 border-b border-border/50 last:border-0 ${
                    !readIds.has(n.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    {renderIcon(n.icon_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString(i18n.language === "en" ? "en-US" : "ar-EG", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!readIds.has(n.id) && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
