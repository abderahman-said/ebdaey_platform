import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Settings
} from "lucide-react";
import { isBunnyUrl } from "@/lib/bunny";
import { useSignedBunnyEmbedUrl } from "@/lib/bunnySignedEmbed";


interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  className?: string;
  autoPlay?: boolean;
  initialMuted?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
const BunnyPlayer = ({ src, className = "", autoPlay = false, initialMuted = false, initialTime }: CustomVideoPlayerProps) => {
  const params: Record<string, string> = {
    autoplay: autoPlay ? "true" : "false",
    muted: initialMuted ? "true" : "false",
  };
  if (initialTime && initialTime > 0) params.t = String(Math.floor(initialTime));

  const { url: embedUrl, ready } = useSignedBunnyEmbedUrl(src, params);

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden ${className}`} style={{ position: "relative", paddingTop: "56.25%" }}>
      {ready && embedUrl && (
        <iframe
          src={embedUrl}
          loading="lazy"
          style={{ border: 0, position: "absolute", inset: 0, height: "100%", width: "100%" }}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
};


const HTML5VideoPlayer = ({ src, poster, onEnded, onTimeUpdate, initialTime, className = "", autoPlay = false, initialMuted = false }: CustomVideoPlayerProps) => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragRafRef = useRef<number>(0);
  const playbackRafRef = useRef<number>(0);
  const dragTimeRef = useRef<number>(0);
  const pointerIdRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(initialMuted);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  

  // Hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
      }, 3000);
    }
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideControlsTimer.current);
  }, [playing, resetHideTimer]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(dragRafRef.current);
      cancelAnimationFrame(playbackRafRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(vol => { const nv = Math.min(1, vol + 0.1); v.volume = nv; return nv; });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(vol => { const nv = Math.max(0, vol - 0.1); v.volume = nv; return nv; });
          break;
        case "m":
          e.preventDefault();
          setMuted(m => { v.muted = !m; return !m; });
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
      resetHideTimer();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetHideTimer]);

  // Prevent right-click & drag
  useEffect(() => {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;
    const prevent = (e: Event) => e.preventDefault();
    v.addEventListener("contextmenu", prevent);
    c.addEventListener("contextmenu", prevent);
    v.addEventListener("dragstart", prevent);
    return () => {
      v.removeEventListener("contextmenu", prevent);
      c.removeEventListener("contextmenu", prevent);
      v.removeEventListener("dragstart", prevent);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFS = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFS);
    return () => document.removeEventListener("fullscreenchange", handleFS);
  }, []);

  // Set initial time when video is ready
  const hasSetInitialTime = useRef(false);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isDragging) return;
    setCurrentTime(v.currentTime);
    onTimeUpdate?.(v.currentTime, v.duration);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    if (initialTime && initialTime > 0 && !hasSetInitialTime.current) {
      v.currentTime = initialTime;
      setCurrentTime(initialTime);
      hasSetInitialTime.current = true;
    }
  };

  const handleProgress = () => {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playing || isDragging) {
      cancelAnimationFrame(playbackRafRef.current);
      return;
    }

    const syncPlaybackTime = () => {
      setCurrentTime(v.currentTime);
      playbackRafRef.current = requestAnimationFrame(syncPlaybackTime);
    };

    playbackRafRef.current = requestAnimationFrame(syncPlaybackTime);

    return () => cancelAnimationFrame(playbackRafRef.current);
  }, [playing, isDragging]);

  const getProgressRatio = (clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(x * duration);
    setHoverX(e.clientX - rect.left);
  };

  const previewSeekPosition = useCallback((clientX: number) => {
    if (!progressRef.current || !duration) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = getProgressRatio(clientX);
    const nextTime = ratio * duration;

    dragTimeRef.current = nextTime;
    cancelAnimationFrame(dragRafRef.current);
    dragRafRef.current = requestAnimationFrame(() => {
      setCurrentTime(nextTime);
      setHoverTime(nextTime);
      setHoverX(Math.max(0, Math.min(rect.width, clientX - rect.left)));
    });

    return nextTime;
  }, [duration]);

  const commitSeek = useCallback((nextTime = dragTimeRef.current) => {
    const v = videoRef.current;
    const resolvedDuration = duration || v?.duration || 0;
    const safeTime = Math.max(0, Math.min(resolvedDuration, nextTime));

    cancelAnimationFrame(dragRafRef.current);
    dragTimeRef.current = safeTime;
    if (v) {
      v.currentTime = safeTime;
    }
    setCurrentTime(safeTime);
    setIsDragging(false);
  }, [duration]);

  const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    previewSeekPosition(e.clientX);
    resetHideTimer();
  };

  const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.preventDefault();
      previewSeekPosition(e.clientX);
      return;
    }

    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(x * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current)) return;
    e.preventDefault();
    commitSeek(previewSeekPosition(e.clientX));
    pointerIdRef.current = null;
  };

  useEffect(() => {
    const cancelDrag = () => {
      if (!isDragging) return;
      commitSeek();
      pointerIdRef.current = null;
    };

    window.addEventListener("blur", cancelDrag);
    return () => window.removeEventListener("blur", cancelDrag);
  }, [isDragging, commitSeek]);

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSettingsMenu(false);
  };

  const skipForward = () => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); };
  const skipBackward = () => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-xl overflow-hidden select-none ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) { setShowControls(false); setShowSettingsMenu(false); } }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.video-controls-bar')) return;
        togglePlay();
        resetHideTimer();
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
        style={{ pointerEvents: "none" }}
        autoPlay={autoPlay}
        muted={initialMuted}
      />

      {/* Big play button overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30 transition-transform duration-200 group-hover:scale-110">
            <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Controls bar */}
      <div
        className={`video-controls-bar absolute inset-x-0 bottom-0 px-3 sm:px-5 pb-3 sm:pb-4 pt-10 transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-8 flex items-center cursor-pointer group/progress mb-2 touch-none"
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={() => {
            commitSeek();
            pointerIdRef.current = null;
          }}
          onLostPointerCapture={() => {
            if (isDragging) commitSeek();
            pointerIdRef.current = null;
          }}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => !isDragging && setHoverTime(null)}
        >
          <div className="absolute inset-x-0 h-[3px] group-hover/progress:h-[5px] bg-white/20 rounded-full transition-all duration-150">
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full" style={{ width: `${bufferedPercent}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
          {/* Thumb */}
          <div
            className={`absolute w-4 h-4 bg-primary rounded-full shadow-lg transition-opacity duration-150 -translate-x-1/2 ${isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover/progress:opacity-100 scale-75 group-hover/progress:scale-100'}`}
            style={{ left: `${progressPercent}%` }}
          />
          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-9 bg-black/90 text-white text-[11px] px-2.5 py-1 rounded-md -translate-x-1/2 pointer-events-none font-medium backdrop-blur-sm border border-white/10"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-1 sm:gap-1.5" dir="ltr">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="p-2 text-white/90 hover:text-white transition-colors rounded-lg hover:bg-white/10">
            {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
          </button>

          {/* Skip backward */}
          <button onClick={skipBackward} className="p-1.5 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 hidden sm:flex items-center justify-center">
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Skip forward */}
          <button onClick={skipForward} className="p-1.5 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 hidden sm:flex items-center justify-center">
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-0.5 group/vol">
            <button
              onClick={() => { const vid = videoRef.current; if (vid) { vid.muted = !muted; setMuted(!muted); } }}
              className="p-1.5 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  const vid = videoRef.current; if (vid) { vid.volume = v; vid.muted = v === 0; setMuted(v === 0); }
                }}
                className="w-full accent-primary h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Time */}
          <span className="text-white/70 text-[11px] sm:text-xs mx-1.5 tabular-nums whitespace-nowrap font-medium">
            {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Settings (Speed) */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium ${
                showSettingsMenu ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettingsMenu ? "rotate-90" : ""}`} />
              <span className="hidden sm:inline">{speed === 1 ? "عادي" : `${speed}x`}</span>
            </button>
            {showSettingsMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-xl py-2 min-w-[140px] backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] text-white/40 font-semibold uppercase tracking-wider rtl:tracking-normal">سرعة التشغيل</div>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`w-full px-4 py-2 text-sm text-end transition-colors flex items-center justify-between ${
                      speed === s ? "text-primary bg-primary/10 font-bold" : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{s === 1 ? "عادي" : `${s}x`}</span>
                    {speed === s && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            {fullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomVideoPlayer = (props: CustomVideoPlayerProps) => {
  if (isBunnyUrl(props.src)) {
    return <BunnyPlayer {...props} />;
  }
  return <HTML5VideoPlayer {...props} />;
};

export default CustomVideoPlayer;
