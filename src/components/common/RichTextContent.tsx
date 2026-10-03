import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import DOMPurify from "dompurify";
import AudioPlayerNode from "@/components/mentor/AudioPlayerNode";
import { normalizeRichTextHtml } from "@/lib/richText";
import { cn } from "@/lib/utils";

interface RichTextContentProps {
  html?: string | null;
  className?: string;
}

const RichTextContent = ({ html, className }: RichTextContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up previous roots asynchronously to avoid race condition
    const prevRoots = rootsRef.current;
    rootsRef.current = [];
    setTimeout(() => {
      prevRoots.forEach((r) => r.unmount());
    }, 0);

    // Set normalised and sanitized HTML
    const normalized = normalizeRichTextHtml(html);
    container.innerHTML = DOMPurify.sanitize(normalized, {
      ADD_TAGS: ['iframe', 'figure', 'audio'],
      ADD_ATTR: ['allowfullscreen', 'src', 'frameborder', 'allow', 'loading', 'referrerpolicy', 'data-audio-player', 'data-audio-src', 'controls', 'preload', 'crossorigin'],
    });

    // Find all audio placeholders and replace with React player
    const figures = container.querySelectorAll<HTMLElement>("figure[data-audio-player]");
    figures.forEach((fig) => {
      const src = fig.getAttribute("data-audio-src");
      if (!src) return;

      // Clear native <audio> inside
      fig.innerHTML = "";
      fig.className = "not-prose my-2";

      const root = createRoot(fig);
      root.render(<AudioPlayerNode src={src} />);
      rootsRef.current.push(root);
    });

    return () => {
      // Defer unmounting to next tick to avoid race condition
      setTimeout(() => {
        rootsRef.current.forEach((r) => r.unmount());
        rootsRef.current = [];
      }, 0);
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      dir="auto"
      className={cn(
        "min-w-0 max-w-full [&>*]:[unicode-bidi:plaintext] [&_*]:max-w-full [&_img]:h-auto [&_video]:h-auto [&_svg]:h-auto [&_iframe]:block [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:aspect-video [&_iframe]:h-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_a]:break-words [&_code]:break-words [&_p]:break-words",
        className,
      )}
    />

  );
};

export default RichTextContent;