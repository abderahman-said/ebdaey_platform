import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MIN_USD = 20;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  usdBalance: number;
  onSubmitted?: () => void;
}

export default function UsdWithdrawalDialog({ open, onOpenChange, tenantId, usdBalance, onSubmitted }: Props) {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");
  const L = (ar: string, e: string) => (en ? e : ar);
  const [settingsOk, setSettingsOk] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    setSettingsOk(null);
    supabase.from("international_withdrawal_settings").select("status").eq("tenant_id", tenantId).maybeSingle()
      .then(({ data }) => setSettingsOk(data?.status === "approved"));
  }, [open, tenantId]);

  const amount = usdBalance;
  const belowMin = amount < MIN_USD;
  const canSubmit = settingsOk === true && !belowMin && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const { error } = await supabase.from("withdrawal_requests").insert({ tenant_id: tenantId, amount, currency: "USD", status: "pending" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(L("تم إرسال طلب السحب", "Withdrawal request sent"));
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={en ? "ltr" : "rtl"}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{L("طلب سحب جديد", "New withdrawal request")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{L("المبلغ", "Amount")}</p>
          <p className="text-3xl font-black text-primary" dir="ltr">
            ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">
            {belowMin
              ? L(`الحد الأدنى للسحب ${MIN_USD} دولار — رصيدك الحالي أقل من ذلك`, `Minimum withdrawal is $${MIN_USD} — your current balance is below that`)
              : L("سيتم سحب كامل رصيدك المتاح بالدولار", "Your full available USD balance will be withdrawn")}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-amber-800">
          <p className="flex items-center gap-2 font-bold text-sm mb-2"><AlertCircle className="w-4 h-4" />{L("تحويلات الدولار", "USD transfers")}</p>
          <ul className="list-disc ps-6 space-y-1 text-sm">
            <li>{L("الحد الأدنى للسحب 20 دولار", "Minimum withdrawal is $20")}</li>
            <li>{L("قد يستغرق التحويل البنكي حتى 10 أيام عمل", "Bank transfer may take up to 10 business days")}</li>
            <li>{L("سيتم خصم 2.5% بحد أدنى 15 دولار مصروفات تحويل دولية", "A 2.5% international transfer fee applies, minimum $15")}</li>
          </ul>
        </div>

        {settingsOk === false && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-red-600 text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              {L("إعدادات التحويلات البنكية الدولية غير مكتملة، يرجى تحديث الإعدادات من ", "Your international bank transfer settings are incomplete. Please update them from ")}
              <Link to="/dashboard?tab=withdrawals&payout=international" onClick={() => onOpenChange(false)} className="underline font-semibold">
                {L("هذا الرابط", "this link")}
              </Link>
              {L(" ثم المحاولة مجدداً", " and try again")}
            </p>
          </div>
        )}

        <div className="border-t pt-4 flex justify-end">
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            {saving || settingsOk === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {L("أرسل طلب السحب", "Send withdrawal request")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
