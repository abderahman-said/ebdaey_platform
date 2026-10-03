import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SampleFile {
  id: string;
  title: string;
  file_size_bytes: number | null;
  file_type: string | null;
  is_sample?: boolean;
}

interface Props {
  samples: SampleFile[];
  triggerClassName?: string;
}

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DigitalProductSamplePreview = ({ samples, triggerClassName }: Props) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!samples || samples.length === 0) return null;

  const handleDownload = async (file: SampleFile) => {
    setLoadingId(file.id);
    try {
      const { data, error } = await supabase.functions.invoke("digital-product-sample-url", {
        body: { file_id: file.id },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || t("digitalProduct.sample.errorPrep"));
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: t("digitalProduct.sample.errorTitle"), description: e?.message || t("digitalProduct.sample.errorFallback"), variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName ?? "w-full h-11 gap-2 border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl"}
        >
          <Gift className="w-4 h-4" />
          {t("digitalProduct.sample.tryFree")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("digitalProduct.sample.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("digitalProduct.sample.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {samples.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{file.title}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.file_size_bytes)}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleDownload(file)}
                disabled={loadingId === file.id}
                className="gap-1.5 shrink-0"
              >
                {loadingId === file.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t("digitalProduct.sample.download")}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DigitalProductSamplePreview;
