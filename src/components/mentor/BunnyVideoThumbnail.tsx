import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseBunnyUrl } from "@/lib/bunny";
import { Play, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BunnyVideoThumbnailProps {
  videoUrl: string;
  alt: string;
  className?: string;
}

const BunnyVideoThumbnail = ({ videoUrl, alt, className = "" }: BunnyVideoThumbnailProps) => {
  const { t } = useTranslation();
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [encoding, setEncoding] = useState(false);

  useEffect(() => {
    const parsed = parseBunnyUrl(videoUrl);
    if (!parsed) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const startedAt = Date.now();
    const POLL_WINDOW_MS = 30 * 60 * 1000; // keep checking for up to 30 min

    const fetchThumbnail = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

        const proxyUrl = `https://${projectId}.supabase.co/functions/v1/bunny-status?videoId=${parsed.videoId}&mode=thumbnail`;
        const res = await fetch(proxyUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

        if (cancelled) return;
        if (!res.ok) {
          scheduleRetry();
          return;
        }

        const contentType = res.headers.get("Content-Type") || "";
        if (contentType.startsWith("image/")) {
          const blob = await res.blob();
          if (!cancelled) {
            setThumbnailDataUrl(URL.createObjectURL(blob));
            setEncoding(false);
            setLoading(false);
          }
          return;
        }

        // JSON fallback - video might still be encoding; keep polling.
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (data?.notFound) {
            setLoading(false);
            return;
          }
          setEncoding(true);
          setLoading(false);
          scheduleRetry();
        }
      } catch (err) {
        console.warn("Could not fetch Bunny thumbnail:", err);
        scheduleRetry();
      }
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      attempts += 1;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= POLL_WINDOW_MS) {
        setLoading(false);
        return;
      }
      // Quick first retry, then back off as the wait gets longer.
      const delay =
        attempts === 1
          ? 1000
          : elapsed < 2 * 60 * 1000
            ? 3000
            : elapsed < 10 * 60 * 1000
              ? 10000
              : 30000;
      timer = setTimeout(fetchThumbnail, delay);
    };

    fetchThumbnail();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [videoUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (thumbnailDataUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={thumbnailDataUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setThumbnailDataUrl(null)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-muted gap-1 ${className}`}>
      {encoding ? (
        <>
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          <span className="text-[10px] text-muted-foreground">{t("bunnyVideo.processing")}</span>
        </>
      ) : (
        <Play className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
};

export default BunnyVideoThumbnail;
