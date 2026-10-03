import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  priority?: boolean;
  sizes?: string;
  /** Intrinsic aspect ratio hints — reduce layout shift (CLS) */
  width?: number | string;
  height?: number | string;
}

const OptimizedImage = ({ 
  src, 
  alt, 
  fallback, 
  className = "", 
  style, 
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  width,
  height,
  ...props 
}: OptimizedImageProps) => {
  const objectFitClass = className.includes("object-contain") ? "object-contain" : "object-cover";
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [inView, setInView] = useState(priority);

  useEffect(() => {
    if (priority) {
      setInView(true);
      return;
    }

    const el = imgRef.current;
    if (!el) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0.01 }
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [priority]);

  if (error && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`} style={style}>
      {/* Blur placeholder with subtle gradient */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-inherit" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
          decoding="async"
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full ${objectFitClass} transition-opacity duration-500 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
