import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving?: boolean;
}

const UnsavedChangesDialog = ({ open, onSave, onDiscard, onCancel, saving }: UnsavedChangesDialogProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent dir={dir}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unsavedChanges.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("unsavedChanges.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-3">
          <AlertDialogCancel onClick={onCancel}>{t("unsavedChanges.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <X className="w-4 h-4 ml-1" />
            {t("unsavedChanges.discard")}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground"
          >
            <Check className="w-4 h-4 ml-1" />
            {saving ? t("unsavedChanges.saving") : t("unsavedChanges.save")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;
