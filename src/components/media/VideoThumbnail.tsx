import { useState, useEffect, useRef } from "react";

interface VideoThumbnailProps {
  videoUrl: string;
  alt: string;
  className?: string;
}

const VideoThumbnail = ({ videoUrl, alt, className = "" }: VideoThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoUrl) return;

    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.currentTime = 2; // Seek to 2 seconds to get a thumbnail

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnailUrl(thumbnail);
        }
      } catch (error) {
        console.error('Error generating video thumbnail:', error);
      } finally {
        setLoading(false);
        video.remove();
      }
    };

    const handleError = () => {
      console.error('Error loading video for thumbnail');
      setLoading(false);
      video.remove();
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [videoUrl]);

  if (loading) {
    return (
      <div className={`absolute inset-0 bg-muted flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!thumbnailUrl) {
    return (
      <div className={`absolute inset-0 bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 opacity-40 bg-primary/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">فيديو</p>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={thumbnailUrl} 
      alt={alt} 
      className={` max-w-full inset-0 w-full h-full object-cover ${className}`}
    />
  );
};

export default VideoThumbnail;
