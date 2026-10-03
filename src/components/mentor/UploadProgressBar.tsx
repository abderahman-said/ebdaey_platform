import { Progress } from "@/components/ui/progress";
import { X, Loader2, CheckCircle2, AlertCircle, FileText, Play, Headphones, Image as ImageIcon } from "lucide-react";
import type { UploadTask } from "@/hooks/useUploadQueue";
import { useTranslation } from "react-i18next";

interface UploadProgressBarProps {
  task: UploadTask;
  onCancel?: () => void;
  onDismiss?: () => void;
}

const FileIcon = ({ fileType }: { fileType?: string }) => {
  if (fileType === "video") return <Play className="w-4 h-4 text-primary" />;
  if (fileType === "audio") return <Headphones className="w-4 h-4 text-primary" />;
  if (fileType === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType === "image") return <ImageIcon className="w-4 h-4 text-primary" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
};

const UploadProgressBar = ({ task, onCancel, onDismiss }: UploadProgressBarProps) => {
  const { t } = useTranslation();
  if (task.status === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-2 mt-1">
        {task.filePreviewUrl && task.fileType === "image" ? (
          <img
            src={task.filePreviewUrl}
            alt={task.fileName}
            className="w-10 h-10 rounded object-cover shrink-0 border border-border"
          />
        ) : task.filePreviewUrl && task.fileType === "video" ? (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
            <video src={task.filePreviewUrl} className="w-full h-full object-cover" muted />
          </div>
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border">
            <FileIcon fileType={task.fileType} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{task.fileName}</p>
          <p className="text-[10px] text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t("uploadProgress.uploadedSuccessfully")}
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (task.status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive py-1">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="truncate flex-1">{task.fileName}</span>
        <span>{task.error || t("uploadProgress.error")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center gap-2 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span className="truncate flex-1 text-muted-foreground">{task.fileName}</span>
        <span className="text-muted-foreground font-mono">{Math.round(task.progress)}%</span>
        {onCancel && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Progress value={task.progress} className="h-1.5" />
    </div>
  );
};

export default UploadProgressBar;
