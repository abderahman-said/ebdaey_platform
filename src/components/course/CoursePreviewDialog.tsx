import DOMPurify from "dompurify";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import RichTextContent from "@/components/common/RichTextContent";

export interface PreviewLesson {
  id: string;
  title: string;
  content_type: string;
  video_url?: string | null;
  audio_url?: string | null;
  pdf_url?: string | null;
  image_url?: string | null;
  text_content?: string | null;
  embed_code?: string | null;
}

interface Props {
  previewLesson: PreviewLesson | null;
  previewLoading: boolean;
  onClose: () => void;
}

const CoursePreviewDialog = ({ previewLesson, previewLoading, onClose }: Props) => (
  <Dialog open={!!previewLesson} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
      <DialogHeader className="sr-only">
        <DialogTitle>{previewLesson?.title}</DialogTitle>
      </DialogHeader>
      <div className="p-0">
        {previewLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {previewLesson && !previewLoading && (
          <div className="space-y-4">
            {previewLesson.content_type === "video" && previewLesson.video_url && (
              <CustomVideoPlayer src={previewLesson.video_url} />
            )}
            {previewLesson.content_type === "audio" && previewLesson.audio_url && (
              <audio controls className="w-full" src={previewLesson.audio_url} />
            )}
            {previewLesson.content_type === "pdf" && previewLesson.pdf_url && (
              <iframe
                src={previewLesson.pdf_url}
                className="w-full rounded-xl border"
                style={{ height: "70vh" }}
              />
            )}
            {previewLesson.content_type === "image" && previewLesson.image_url && (
              <img
                src={previewLesson.image_url}
                alt={previewLesson.title}
                className="w-full rounded-xl"
              />
            )}
            {previewLesson.content_type === "text" && previewLesson.text_content && (
              <RichTextContent html={previewLesson.text_content} />
            )}
            {previewLesson.content_type === "embed" && previewLesson.embed_code && (
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(previewLesson.embed_code, {
                    ADD_TAGS: ["iframe"],
                    ADD_ATTR: ["allowfullscreen", "src", "frameborder", "allow", "referrerpolicy"],
                  }),
                }}
                className="w-full rounded-xl overflow-hidden"
              />
            )}
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default CoursePreviewDialog;
