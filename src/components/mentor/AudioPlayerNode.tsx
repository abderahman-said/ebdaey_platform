import { useMemo, useRef, useState } from "react";
import { AlertCircle, Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WAVE_BARS = [28, 52, 36, 72, 48, 82, 44, 64, 30, 58, 76, 40, 66, 34, 70, 46, 60, 38];

interface AudioPlayerProps {
  src: string;
}

const AudioPlayerNode = ({ src }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = async () => {
    if (!audioRef.current) return;

    try {
      setHasError(false);

      if (playing) {
        audioRef.current.pause();
        return;
      }

      await audioRef.current.play();
    } catch {
      setHasError(true);
      setPlaying(false);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const nextTime = Number(event.target.value);
    if (!Number.isFinite(nextTime)) return;

    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className="my-2 flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/70 px-4 py-3 shadow-card select-none"
      contentEditable={false}
      data-audio-player
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={() => {
          setHasError(false);
          setDuration(audioRef.current?.duration || 0);
        }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setHasError(true);
          setPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        aria-label={playing ? "Pause audio" : "Play audio"}
      >
        {playing ? <Pause className="w-4 h-4" color="white" /> : <Play className="w-4 h-4 ml-0.5" color="white" />}
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 flex-1 items-end gap-1 overflow-hidden rounded-xl border border-border/60 bg-background/70 px-2 py-1.5">
            {WAVE_BARS.map((height, index) => {
              const threshold = (index + 1) / WAVE_BARS.length;
              const isActive = progress >= threshold;

              return (
                <span
                  key={index}
                  className={cn(
                    "audio-wave-bar flex-1 rounded-full transition-colors duration-300",
                    playing && "is-playing",
                    isActive ? "bg-primary" : "bg-muted-foreground/35"
                  )}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 70}ms`,
                  }}
                />
              );
            })}
          </div>
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="h-1 w-full cursor-pointer accent-primary"
          />
          <div className="shrink-0 text-[10px] font-mono text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {hasError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Couldn&apos;t play this audio file.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerNode;
