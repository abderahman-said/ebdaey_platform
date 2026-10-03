import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsTabProps {
  withdrawalLegalName: string;
  setWithdrawalLegalName: (v: string) => void;
  withdrawalIban: string;
  setWithdrawalIban: (v: string) => void;
  saveWithdrawalSettings: () => void;
}

export default function SettingsTab({
  withdrawalLegalName,
  setWithdrawalLegalName,
  withdrawalIban,
  setWithdrawalIban,
  saveWithdrawalSettings,
}: SettingsTabProps) {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t("settingsTab.title")}</h1>
      <div className="glass-card rounded-xl p-6 max-w-2xl">
        <h3 className="font-bold mb-4">{t("settingsTab.withdrawal.heading")}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("settingsTab.withdrawal.legalName")}
            </label>
            <Input
              value={withdrawalLegalName}
              onChange={(e) => setWithdrawalLegalName(e.target.value)}
              placeholder={t("settingsTab.withdrawal.legalNamePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("settingsTab.withdrawal.iban")}
            </label>
            <Input
              value={withdrawalIban}
              onChange={(e) => setWithdrawalIban(e.target.value)}
              placeholder={t("settingsTab.withdrawal.ibanPlaceholder")}
              dir="ltr"
            />
          </div>
          <Button
            onClick={saveWithdrawalSettings}
            className="gradient-primary text-primary-foreground border-0"
          >
            <Check className="w-4 h-4 ms-2" />
            {t("settingsTab.withdrawal.save")}
          </Button>
        </div>
      </div>
    </>
  );
}
