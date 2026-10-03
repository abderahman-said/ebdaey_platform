import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import InternationalWithdrawalPanel from "./InternationalWithdrawalPanel";
import i18next from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  ShoppingBag,
  Settings,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Building2,
  Check,
  FileText,
  IdCard,
  Upload,
  Eye,
} from "lucide-react";


interface WithdrawalsTabProps {
  tenantId: string | null;
  totalRevenue: number;
  totalWithdrawn: number;
  withdrawalSettingsStatus: string | null;
  withdrawalRejectionReason: string | null;
  withdrawalLegalName: string;
  setWithdrawalLegalName: (v: string) => void;
  withdrawalAddress: string;
  setWithdrawalAddress: (v: string) => void;
  withdrawalAccountType: "personal" | "company";
  setWithdrawalAccountType: (v: "personal" | "company") => void;
  withdrawalBeneficiaryName: string;
  setWithdrawalBeneficiaryName: (v: string) => void;
  withdrawalBankName: string;
  setWithdrawalBankName: (v: string) => void;
  withdrawalIban: string;
  setWithdrawalIban: (v: string) => void;
  withdrawalNationalIdFront: string | null;
  withdrawalNationalIdBack: string | null;
  uploadNationalId: (file: File, side: "front" | "back") => Promise<string | null>;
  saveWithdrawalSettings: () => void;
}


const BANKS: { ar: string; en: string }[] = [
  { ar: "البنك الأهلي المصري", en: "National Bank of Egypt" },
  { ar: "بنك مصر", en: "Banque Misr" },
  { ar: "بنك القاهرة", en: "Banque du Caire" },
  { ar: "البنك التجاري الدولي (CIB)", en: "Commercial International Bank (CIB)" },
  { ar: "بنك الإسكندرية", en: "Bank of Alexandria" },
  { ar: "البنك العربي الأفريقي الدولي", en: "Arab African International Bank" },
  { ar: "بنك QNB الأهلي", en: "QNB Alahli" },
  { ar: "بنك HSBC مصر", en: "HSBC Egypt" },
  { ar: "بنك كريدي أجريكول", en: "Crédit Agricole Egypt" },
  { ar: "بنك فيصل الإسلامي", en: "Faisal Islamic Bank of Egypt" },
  { ar: "بنك أبوظبي الأول", en: "First Abu Dhabi Bank (FAB)" },
  { ar: "بنك الاستثمار العربي", en: "Arab Investment Bank" },
  { ar: "المصرف المتحد", en: "United Bank of Egypt" },
  { ar: "بنك التعمير والإسكان", en: "Housing and Development Bank" },
  { ar: "البنك المصري لتنمية الصادرات", en: "Export Development Bank of Egypt" },
  { ar: "بنك الشركة المصرفية العربية الدولية (SAIB)", en: "Société Arabe Internationale de Banque (SAIB)" },
  { ar: "بنك بلوم مصر", en: "Blom Bank Egypt" },
  { ar: "بنك أبوظبي الإسلامي مصر", en: "Abu Dhabi Islamic Bank Egypt" },
  { ar: "بنك المشرق", en: "Mashreq Bank" },
  { ar: "بنك الكويت الوطني مصر", en: "National Bank of Kuwait Egypt (NBK)" },
  { ar: "بنك عودة", en: "Bank Audi" },
  { ar: "البنك الأهلي الكويتي مصر", en: "Al Ahli Bank of Kuwait Egypt" },
  { ar: "البنك المصري الخليجي (EG Bank)", en: "Egyptian Gulf Bank (EG Bank)" },
  { ar: "بنك الإمارات دبي الوطني مصر", en: "Emirates NBD Egypt" },
  { ar: "بنك التنمية الصناعية", en: "Industrial Development Bank" },
  { ar: "بنك ناصر الاجتماعي", en: "Nasser Social Bank" },
  { ar: "البنك الزراعي المصري", en: "Agricultural Bank of Egypt" },
  { ar: "بنك المؤسسة العربية المصرفية (ABC)", en: "Arab Banking Corporation (ABC)" },
  { ar: "بنك قطر الوطني الأهلي", en: "Qatar National Bank Al Ahli" },
  { ar: "بنك الاتحاد الوطني", en: "Union National Bank" },
  { ar: "بنك ميد (Banque Misr)", en: "Banque Misr (MID)" },
  { ar: "بنك البركة", en: "Al Baraka Bank" },
];

const bankLabel = (arValue: string) => {
  const found = BANKS.find((b) => b.ar === arValue);
  if (!found) return arValue;
  return i18next.language === "en" ? found.en : found.ar;
};

export default function WithdrawalsTab({
  tenantId,
  totalRevenue,
  totalWithdrawn,
  withdrawalSettingsStatus,
  withdrawalRejectionReason,
  withdrawalLegalName,
  setWithdrawalLegalName,
  withdrawalAddress,
  setWithdrawalAddress,
  withdrawalAccountType,
  setWithdrawalAccountType,
  withdrawalBeneficiaryName,
  setWithdrawalBeneficiaryName,
  withdrawalBankName,
  setWithdrawalBankName,
  withdrawalIban,
  setWithdrawalIban,
  withdrawalNationalIdFront,
  withdrawalNationalIdBack,
  uploadNationalId,
  saveWithdrawalSettings,
}: WithdrawalsTabProps) {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const payout = searchParams.get("payout") === "international" ? "international" : "egypt";
  const setPayout = (v: "egypt" | "international") => {
    const next = new URLSearchParams(searchParams);
    next.set("payout", v);
    setSearchParams(next, { replace: true });
  };
  const [uploadingSide, setUploadingSide] = useState<"front" | "back" | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const resolve = async (path: string | null, set: (u: string | null) => void) => {
      if (!path) { set(null); return; }
      if (path.startsWith("http")) { set(path); return; }
      const { data } = await supabase.storage
        .from("mentor-documents")
        .createSignedUrl(path, 3600);
      set(data?.signedUrl || null);
    };
    resolve(withdrawalNationalIdFront, setFrontPreview);
    resolve(withdrawalNationalIdBack, setBackPreview);
  }, [withdrawalNationalIdFront, withdrawalNationalIdBack]);

  const handleFile = async (side: "front" | "back", file: File | undefined) => {
    if (!file) return;
    setUploadingSide(side);
    await uploadNationalId(file, side);
    setUploadingSide(null);
  };

  const isSubmitted =
    withdrawalSettingsStatus === "pending" || withdrawalSettingsStatus === "approved";

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground break-all">{value || "—"}</span>
    </div>
  );

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" />{t("withdrawalsTab.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("withdrawalsTab.subtitle")}
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
      </div>


      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-2 gap-2 p-1 mb-5 rounded-xl bg-muted/50 border border-border/60">
          {(["egypt", "international"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPayout(k)}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${payout === k ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k === "egypt"
                ? (i18n.language === "en" ? "Egyptian bank transfers" : "التحويلات البنكية المصرية")
                : (i18n.language === "en" ? "International bank transfers" : "التحويلات البنكية الدولية")}
            </button>
          ))}
        </div>
        {payout === "international" ? (
          <InternationalWithdrawalPanel tenantId={tenantId} />
        ) : (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/60">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold">{i18n.language === "en" ? "Egyptian bank transfers" : "التحويلات البنكية المصرية"}</h2>
              <p className="text-xs text-muted-foreground">
                {t("withdrawalsTab.settingsHint")}
              </p>
            </div>
            {withdrawalSettingsStatus && (
              <span
                className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  withdrawalSettingsStatus === "approved"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : withdrawalSettingsStatus === "rejected"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-yellow-500/10 text-yellow-600"
                }`}
              >
                {withdrawalSettingsStatus === "approved"
                  ? t("withdrawalsTab.status.approved")
                  : withdrawalSettingsStatus === "rejected"
                    ? t("withdrawalsTab.status.rejected")
                    : t("withdrawalsTab.status.pending")}
              </span>
            )}
          </div>

          {withdrawalSettingsStatus === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5">
              <p className="text-xs text-yellow-800 flex items-center gap-2 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {t("withdrawalsTab.pendingBanner")}
              </p>
            </div>
          )}

          {withdrawalSettingsStatus === "approved" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-5">
              <p className="text-sm text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {t("withdrawalsTab.approvedBanner")}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1 mr-6">
                {t("withdrawalsTab.approvedHint")}
              </p>
            </div>
          )}

          {withdrawalSettingsStatus === "rejected" && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-5">
              <p className="text-sm text-destructive flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4" />
                {t("withdrawalsTab.rejectedBanner")}
              </p>
              {withdrawalRejectionReason && (
                <p className="text-[11px] text-destructive/80 mt-1 mr-6">
                  {t("withdrawalsTab.rejectedReason")}: {withdrawalRejectionReason}
                </p>
              )}
            </div>
          )}

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> {t("withdrawalsTab.sections.personal")}
                </h3>
                <Row label={t("withdrawalsTab.fields.fullName")} value={withdrawalLegalName} />
                <Row label={t("withdrawalsTab.fields.address")} value={withdrawalAddress} />
                <Row
                  label={t("withdrawalsTab.fields.accountType")}
                  value={withdrawalAccountType === "company" ? t("withdrawalsTab.fields.company") : t("withdrawalsTab.fields.personal")}
                />
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> {t("withdrawalsTab.sections.bank")}
                </h3>
                <Row label={t("withdrawalsTab.fields.beneficiary")} value={withdrawalBeneficiaryName} />
                <Row label={t("withdrawalsTab.fields.bank")} value={bankLabel(withdrawalBankName)} />
                <Row label={t("withdrawalsTab.fields.iban")} value={withdrawalIban} />
              </div>
              {(frontPreview || backPreview) && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-primary" /> {t("withdrawalsTab.sections.id")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {frontPreview && (
                      <a href={frontPreview} target="_blank" rel="noopener noreferrer" className="block">
                        <p className="text-xs text-muted-foreground mb-1.5">{t("withdrawalsTab.front")}</p>
                        <img src={frontPreview} alt={t("withdrawalsTab.front")} className="w-full h-28 object-cover rounded-lg border border-border" />
                      </a>
                    )}
                    {backPreview && (
                      <a href={backPreview} target="_blank" rel="noopener noreferrer" className="block">
                        <p className="text-xs text-muted-foreground mb-1.5">{t("withdrawalsTab.back")}</p>
                        <img src={backPreview} alt={t("withdrawalsTab.back")} className="w-full h-28 object-cover rounded-lg border border-border" />
                      </a>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <span className="w-1 h-4 rounded bg-primary" /> {t("withdrawalsTab.sections.personal")}
                </h3>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.fullName")}</Label>
                  <Input
                    value={withdrawalLegalName}
                    onChange={(e) => setWithdrawalLegalName(e.target.value)}
                    placeholder={t("withdrawalsTab.fields.fullNamePlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.address")}</Label>
                  <Input
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                    placeholder={t("withdrawalsTab.fields.addressPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.accountType")}</Label>
                  <Select
                    value={withdrawalAccountType}
                    onValueChange={(v) => setWithdrawalAccountType(v as "personal" | "company")}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">{t("withdrawalsTab.fields.personal")}</SelectItem>
                      <SelectItem value="company">{t("withdrawalsTab.fields.company")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <span className="w-1 h-4 rounded bg-primary" /> {t("withdrawalsTab.sections.bank")}
                </h3>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.beneficiary")}</Label>
                  <Input
                    value={withdrawalBeneficiaryName}
                    onChange={(e) => setWithdrawalBeneficiaryName(e.target.value)}
                    placeholder={t("withdrawalsTab.fields.beneficiaryPlaceholder")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.bank")}</Label>
                  <Select value={withdrawalBankName} onValueChange={setWithdrawalBankName}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={t("withdrawalsTab.fields.bankPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank.ar} value={bank.ar}>
                          {i18n.language === "en" ? bank.en : bank.ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-medium">{t("withdrawalsTab.fields.iban")}</Label>
                  <Input
                    value={withdrawalIban}
                    onChange={(e) => setWithdrawalIban(e.target.value)}
                    placeholder="EG800002000123456789012345678"
                    dir="ltr"
                    className="mt-1.5 text-start font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("withdrawalsTab.fields.ibanHint")}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                  <span className="w-1 h-4 rounded bg-primary" /> {t("withdrawalsTab.sections.id")}
                </h3>
                <p className="text-xs text-muted-foreground -mt-2">
                  {t("withdrawalsTab.idHint")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["front", "back"] as const).map((side) => {
                    const preview = side === "front" ? frontPreview : backPreview;
                    const ref = side === "front" ? frontInputRef : backInputRef;
                    const label = side === "front" ? t("withdrawalsTab.front") : t("withdrawalsTab.back");
                    return (
                      <div key={side}>
                        <Label className="font-medium text-xs">{label}</Label>
                        <input
                          ref={ref}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFile(side, e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => ref.current?.click()}
                          disabled={uploadingSide === side}
                          className="mt-1.5 w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                        >
                          {preview ? (
                            <>
                              <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-medium">
                                <Upload className="w-3.5 h-3.5" /> {t("withdrawalsTab.change")}
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {uploadingSide === side ? t("withdrawalsTab.uploading") : t("withdrawalsTab.upload")}
                              </span>
                            </>
                          )}
                        </button>
                        {preview && (
                          <a
                            href={preview}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Eye className="w-3 h-3" /> {t("withdrawalsTab.view")}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {t("withdrawalsTab.secure")}
                  </span>
                </p>
                <Button
                  onClick={saveWithdrawalSettings}
                  disabled={
                    !withdrawalLegalName ||
                    !withdrawalAddress ||
                    !withdrawalBeneficiaryName ||
                    !withdrawalIban ||
                    !withdrawalBankName ||
                    !withdrawalNationalIdFront ||
                    !withdrawalNationalIdBack ||
                    uploadingSide !== null
                  }
                  className="gradient-primary text-primary-foreground border-0"
                >
                  <Check className="w-4 h-4 ml-2" />
                  {withdrawalSettingsStatus === "rejected" ? t("withdrawalsTab.resubmit") : t("withdrawalsTab.submit")}
                </Button>
              </div>

            </div>
          )}
        </div>
        )}

      </div>
    </>
  );
}
