import { useEffect, useCallback, useRef } from "react";
import { logProtectionEvent, type ProtectionEventType } from "@/lib/contentProtection";


interface ContentProtectionProps {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string | null;
  /** Seed used to derive the per-session fingerprint (e.g. student id) */
  fingerprintSeed?: string | null;
  enabled?: boolean;
  /** Context used when recording capture attempts */
  studentId?: string | null;
  tenantId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
}

/**
 * Content protection component that adds:
 * 1. (watermark removed)
 * 2. Screen recording detection (getDisplayMedia + DevTools)
 * 3. Capture attempt logging for platform admins
 * 4. Print/screenshot prevention CSS
 * 5. Copy/paste prevention
 */
const ContentProtection = ({
  studentName,
  studentEmail,
  studentPhone,
  fingerprintSeed,
  enabled = true,
  studentId,
  tenantId,
  courseId,
  lessonId,
}: ContentProtectionProps) => {
  const warningShownRef = useRef(false);
  const devtoolsOpenRef = useRef(false);
  const fingerprint = "";

  const logEvent = useCallback(
    (eventType: ProtectionEventType) => {
      void logProtectionEvent(eventType, {
        tenantId,
        studentId,
        courseId,
        lessonId,
        fingerprint,
      });
    },
    [tenantId, studentId, courseId, lessonId, fingerprint]
  );

  // Detect in-browser screen capture (screen recorders / sharing this tab)
  useEffect(() => {
    if (!enabled) return;
    const md = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (c?: DisplayMediaStreamOptions) => Promise<MediaStream>;
    };
    const original = md?.getDisplayMedia;
    if (!original) return;

    md.getDisplayMedia = function patched(this: MediaDevices, ...args: any[]) {
      logEvent("screen_recording");
      document.querySelectorAll("video").forEach((v) => v.pause());
      return (original as any).apply(this, args);
    } as typeof original;

    return () => {
      md.getDisplayMedia = original;
    };
  }, [enabled, logEvent]);

  // Detect screen recording / tab switching
  const handleVisibilityChange = useCallback(() => {
    // Just track - don't block (could be normal tab switching)
  }, []);

  // Detect DevTools
  useEffect(() => {
    if (!enabled) return;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!devtoolsOpenRef.current) {
          devtoolsOpenRef.current = true;
          // Pause all videos when devtools detected
          document.querySelectorAll("video").forEach((v) => v.pause());
          logEvent("devtools_open");
        }
      } else {
        devtoolsOpenRef.current = false;
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    return () => clearInterval(interval);
  }, [enabled, logEvent]);

  // Prevent keyboard shortcuts for screenshots/recording
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        navigator.clipboard?.writeText?.("").catch(() => {});
        logEvent("print_screen");
      }

      // Prevent Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        logEvent("devtools_open");
      }

      // Prevent Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        logEvent("devtools_open");
      }

      // Prevent Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        logEvent("save_attempt");
      }

      // Prevent Ctrl+S (Save)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        logEvent("save_attempt");
      }

      // Prevent Ctrl+P (Print)
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        logEvent("print_attempt");
      }

      // Prevent F12
      if (e.key === "F12") {
        e.preventDefault();
        logEvent("devtools_open");
      }

      // Mac screenshot shortcuts (Cmd+Shift+3/4/5)
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        logEvent("print_screen");
      }
    };


    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      logEvent("copy_attempt");
    };

    // Prevent drag
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "VIDEO" || target.tagName === "IMG") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, handleVisibilityChange, logEvent]);

  if (!enabled) return null;

  return (
    <>
      {/* CSS to prevent screenshots and printing */}
      <style>{`
        /* Prevent text selection on protected content */
        .content-protected {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        /* Hide content when printing */
        @media print {
          body * {
            display: none !important;
          }
          body::after {
            content: "محتوى محمي - لا يمكن طباعته";
            display: block !important;
            font-size: 24px;
            text-align: center;
            padding: 100px;
            color: #999;
          }
        }

        /* Make videos harder to capture */
        video {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          user-select: none !important;
        }
      `}</style>

    </>
  );
};

export default ContentProtection;
