import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Globe, Clock, CheckCircle2, AlertTriangle, Upload, Check, Eye } from "lucide-react";
import { SUPPORTED_COUNTRIES } from "./PaymentGatewaysTab";

type DocType = "national_id" | "passport";

const C = {
  ar: {
    title: "التحويلات البنكية الدولية",
    hint: "لاستقبال أرباحك بالدولار على حساب بنكي خارج مصر",
    pending: "بياناتك قيد المراجعة من فريق إبداعي",
    approved: "تم قبول بياناتك البنكية الدولية",
    approvedHint: "لتعديل بيانات السحب يجب عليك التواصل مع الدعم الفني",
    rejected: "تم رفض بياناتك، يرجى تعديلها وإعادة الإرسال",
    reason: "السبب",
    personal: "البيانات الشخصية",
    bank: "البيانات البنكية",
    fullName: "الاسم الكامل",
    address: "العنوان",
    accountType: "نوع الحساب",
    personalT: "شخصي",
    company: "شركة",
    country: "الدولة",
    countryPh: "اختر دولة البنك",
    bankName: "اسم البنك",
    bankPh: "اكتب اسم البنك",
    beneficiary: "اسم المستفيد للحساب البنكي",
    iban: "رقم IBAN / رقم الحساب",
    swift: "رمز SWIFT / BIC",
    idSection: "إثبات الهوية",
    docType: "نوع المستند",
    nationalId: "بطاقة الهوية الشخصية",
    passport: "جواز السفر",
    front: "الوجه الأمامي",
    back: "الوجه الخلفي",
    passportPage: "صفحة البيانات",
    upload: "اضغط للرفع",
    uploading: "جاري الرفع...",
    view: "عرض",
    submit: "إرسال للمراجعة",
    resubmit: "إعادة الإرسال",
    sent: "تم إرسال البيانات للمراجعة",
    fill: "يرجى استكمال جميع الحقول",
    stPending: "قيد المراجعة",
    stApproved: "مقبول",
    stRejected: "مرفوض",
  },
  en: {
    title: "International bank transfers",
    hint: "Receive your USD earnings in a bank account outside Egypt",
    pending: "Your details are under review by the Ebdaey team",
    approved: "Your international bank details were approved",
    approvedHint: "To change your payout details, please contact support",
    rejected: "Your details were rejected, please update and resubmit",
    reason: "Reason",
    personal: "Personal details",
    bank: "Bank details",
    fullName: "Full name",
    address: "Address",
    accountType: "Account type",
    personalT: "Personal",
    company: "Company",
    country: "Country",
    countryPh: "Select the bank's country",
    bankName: "Bank name",
    bankPh: "Type the bank name",
    beneficiary: "Beneficiary name",
    iban: "IBAN / account number",
    swift: "SWIFT / BIC code",
    idSection: "Identity proof",
    docType: "Document type",
    nationalId: "National ID card",
    passport: "Passport",
    front: "Front side",
    back: "Back side",
    passportPage: "Data page",
    upload: "Click to upload",
    uploading: "Uploading...",
    view: "View",
    submit: "Submit for review",
    resubmit: "Resubmit",
    sent: "Details sent for review",
    fill: "Please fill in all fields",
    stPending: "Under review",
    stApproved: "Approved",
    stRejected: "Rejected",
  },
};

export default function InternationalWithdrawalPanel({ tenantId }: { tenantId: string | null }) {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const c = en ? C.en : C.ar;

  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [beneficiary, setBeneficiary] = useState("");
  const [country, setCountry] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [docType, setDocType] = useState<DocType>("national_id");
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"front" | "back" | null>(null);
  const [saving, setSaving] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("international_withdrawal_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setStatus(data.status);
        setReason(data.rejection_reason);
        setLegalName(data.legal_name);
        setAddress(data.address);
        setAccountType(data.account_type === "company" ? "company" : "personal");
        setBeneficiary(data.beneficiary_name);
        setCountry(data.country_code);
        setBankName(data.bank_name);
        setIban(data.iban);
        setSwift(data.swift_code);
        setDocType(data.id_document_type as DocType);
        setFront(data.id_front_url);
        setBack(data.id_back_url);
      });
  }, [tenantId]);

  useEffect(() => {
    const resolve = async (p: string | null, set: (u: string | null) => void) => {
      if (!p) return set(null);
      const { data } = await supabase.storage.from("mentor-documents").createSignedUrl(p, 3600);
      set(data?.signedUrl || null);
    };
    resolve(front, setFrontPreview);
    resolve(back, setBackPreview);
  }, [front, back]);

  const upload = async (side: "front" | "back", file?: File) => {
    if (!file || !tenantId) return;
    setUploading(side);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${tenantId}/intl-${docType}-${side}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("mentor-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(null);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    if (side === "front") setFront(path);
    else setBack(path);
  };

  const needsBack = docType === "national_id";
  const complete =
    legalName.trim() && address.trim() && beneficiary.trim() && country && bankName.trim() &&
    iban.trim() && swift.trim() && front && (!needsBack || back);

  const save = async () => {
    if (!tenantId) return;
    if (!complete) {
      toast({ title: c.fill, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("international_withdrawal_settings").upsert(
      {
        tenant_id: tenantId,
        legal_name: legalName.trim().slice(0, 200),
        address: address.trim().slice(0, 300),
        account_type: accountType,
        beneficiary_name: beneficiary.trim().slice(0, 200),
        country_code: country,
        bank_name: bankName.trim().slice(0, 150),
        iban: iban.replace(/\s+/g, "").toUpperCase().slice(0, 40),
        swift_code: swift.replace(/\s+/g, "").toUpperCase().slice(0, 11),
        id_document_type: docType,
        id_front_url: front,
        id_back_url: needsBack ? back : null,
        status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    setSaving(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    setStatus("pending");
    toast({ title: c.sent });
  };

  const isSubmitted = status === "pending" || status === "approved";
  const countryLabel = (code: string) => {
    const f = SUPPORTED_COUNTRIES.find((x) => x.code === code);
    return f ? (en ? f.en : f.ar) : code;
  };

  const Row = ({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0 gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground break-all" dir={ltr ? "ltr" : undefined}>{value || "—"}</span>
    </div>
  );

  const Section = ({ title }: { title: string }) => (
    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
      <span className="w-1 h-4 rounded bg-primary" /> {title}
    </h3>
  );

  const sides: ("front" | "back")[] = needsBack ? ["front", "back"] : ["front"];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/60">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold">{c.title}</h2>
          <p className="text-xs text-muted-foreground">{c.hint}</p>
        </div>
        {status && (
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
            status === "approved" ? "bg-emerald-500/10 text-emerald-600"
              : status === "rejected" ? "bg-destructive/10 text-destructive"
              : "bg-yellow-500/10 text-yellow-600"}`}>
            {status === "approved" ? c.stApproved : status === "rejected" ? c.stRejected : c.stPending}
          </span>
        )}
      </div>

      {status === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5">
          <p className="text-xs text-yellow-800 flex items-center gap-2 font-medium"><Clock className="w-3.5 h-3.5" />{c.pending}</p>
        </div>
      )}
      {status === "approved" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-5">
          <p className="text-sm text-emerald-800 flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4" />{c.approved}</p>
          <p className="text-[11px] text-emerald-700 mt-1 ms-6">{c.approvedHint}</p>
        </div>
      )}
      {status === "rejected" && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-5">
          <p className="text-sm text-destructive flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4" />{c.rejected}</p>
          {reason && <p className="text-[11px] text-destructive/80 mt-1 ms-6">{c.reason}: {reason}</p>}
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="text-sm font-bold mb-2">{c.personal}</h3>
            <Row label={c.fullName} value={legalName} />
            <Row label={c.address} value={address} />
            <Row label={c.accountType} value={accountType === "company" ? c.company : c.personalT} />
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="text-sm font-bold mb-2">{c.bank}</h3>
            <Row label={c.country} value={countryLabel(country)} />
            <Row label={c.bankName} value={bankName} />
            <Row label={c.beneficiary} value={beneficiary} />
            <Row label={c.iban} value={iban} ltr />
            <Row label={c.swift} value={swift} ltr />
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <h3 className="text-sm font-bold mb-2">{c.idSection}</h3>
            <Row label={c.docType} value={docType === "passport" ? c.passport : c.nationalId} />
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[frontPreview, backPreview].filter(Boolean).map((u, i) => (
                <a key={i} href={u!} target="_blank" rel="noopener noreferrer">
                  <img src={u!} alt="" className="w-full h-28 object-cover rounded-lg border border-border" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <Section title={c.personal} />
            <div><Label className="font-medium">{c.fullName}</Label><Input value={legalName} maxLength={200} onChange={(e) => setLegalName(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="font-medium">{c.address}</Label><Input value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} className="mt-1.5" /></div>
            <div>
              <Label className="font-medium">{c.accountType}</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as "personal" | "company")}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{c.personalT}</SelectItem>
                  <SelectItem value="company">{c.company}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <Section title={c.bank} />
            <div>
              <Label className="font-medium">{c.country}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={c.countryPh} /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((ct) => (
                    <SelectItem key={ct.code} value={ct.code}>
                      <span className="inline-flex items-center gap-2">
                        <img src={`https://flagcdn.com/w40/${ct.code}.png`} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                        {en ? ct.en : ct.ar}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="font-medium">{c.bankName}</Label><Input value={bankName} maxLength={150} placeholder={c.bankPh} onChange={(e) => setBankName(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="font-medium">{c.beneficiary}</Label><Input value={beneficiary} maxLength={200} onChange={(e) => setBeneficiary(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="font-medium">{c.iban}</Label><Input value={iban} maxLength={40} dir="ltr" placeholder="DE89370400440532013000" onChange={(e) => setIban(e.target.value)} className="mt-1.5 text-start font-mono" /></div>
            <div><Label className="font-medium">{c.swift}</Label><Input value={swift} maxLength={11} dir="ltr" placeholder="DEUTDEFF" onChange={(e) => setSwift(e.target.value)} className="mt-1.5 text-start font-mono" /></div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/60">
            <Section title={c.idSection} />
            <div className="grid grid-cols-2 gap-2">
              {(["national_id", "passport"] as DocType[]).map((d) => (
                <button key={d} type="button"
                  onClick={() => { if (d !== docType) { setDocType(d); setFront(null); setBack(null); } }}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${docType === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/40"}`}>
                  {d === "passport" ? c.passport : c.nationalId}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sides.map((side) => {
                const preview = side === "front" ? frontPreview : backPreview;
                const ref = side === "front" ? frontRef : backRef;
                const label = docType === "passport" ? c.passportPage : side === "front" ? c.front : c.back;
                return (
                  <div key={side}>
                    <Label className="font-medium text-xs">{label}</Label>
                    <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(side, e.target.files?.[0])} />
                    <button type="button" onClick={() => ref.current?.click()} disabled={uploading === side}
                      className="mt-1.5 w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                      {preview ? (
                        <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{uploading === side ? c.uploading : c.upload}</span>
                        </>
                      )}
                    </button>
                    {preview && (
                      <a href={preview} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Eye className="w-3 h-3" /> {c.view}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex justify-end">
            <Button onClick={save} disabled={!complete || saving || uploading !== null} className="gradient-primary text-primary-foreground border-0">
              <Check className="w-4 h-4 me-2" />
              {status === "rejected" ? c.resubmit : c.submit}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
