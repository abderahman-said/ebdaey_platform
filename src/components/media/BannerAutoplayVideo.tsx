import { useEffect, useRef, useState } from "react";
import { VolumeX } from "lucide-react";
import { isBunnyUrl } from "@/lib/bunny";
import { useSignedBunnyEmbedUrl } from "@/lib/bunnySignedEmbed";

interface BannerAutoplayVideoProps {
  src: string;
  poster?: string;
}

const BannerAutoplayVideo = ({ src, poster }: BannerAutoplayVideoProps) => {
  const [unmuted, setUnmuted] = useState(false);
  const muteParam = unmuted ? "false" : "true";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { url: embedUrl } = useSignedBunnyEmbedUrl(isBunnyUrl(src) ? src : null, {
    autoplay: "true",
    loop: "true",
    muted: muteParam,
    // Some player versions ignore the muted param; the playback API
    // (player.js postMessage) lets us force-silence it on load.
    volume: "0",
  });

  const sendMuteCommand = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: "mute", value: "true" }),
      "*"
    );
  };

  // Player.js broadcasts a "ready" event; enforce mute the moment it's ready
  // and again shortly after as a safety net.
  useEffect(() => {
    if (unmuted) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = JSON.parse(e.data);
        if (data?.event === "ready") sendMuteCommand();
      } catch {
        /* non-JSON message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [unmuted]);

  if (isBunnyUrl(src) && embedUrl) {
    return (
      <>
        <iframe
          ref={iframeRef}
          key={muteParam}
          src={embedUrl}
          loading="lazy"
          onLoad={() => {
            if (!unmuted) {
              sendMuteCommand();
              setTimeout(sendMuteCommand, 1500);
            }
          }}
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        {!unmuted && (
          <button
            onClick={() => setUnmuted(true)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium hover:bg-black/80 transition-colors"
          >
            <VolumeX className="w-4 h-4" />
            <span>تشغيل الصوت</span>
          </button>
        )}
      </>
    );
  }

  if (poster) {
    return (
      <img
        src={poster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  return <div className="absolute inset-0 w-full h-full bg-muted" />;
};

export default BannerAutoplayVideo;
