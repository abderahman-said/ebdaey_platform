import { Wallet } from "lucide-react";
import flags from "react-phone-number-input/flags";
import vodafoneAsset from "@/assets/pg-vodafone.jpeg.asset.json";
import orangeAsset from "@/assets/pg-orange.png.asset.json";
import etisalatAsset from "@/assets/pg-etisalat.png.asset.json";

const EgyptFlag = flags.EG;

/**
 * Normalises anything the buyer types into the local Egyptian wallet format
 * (01xxxxxxxxx) which the checkout validation expects — so typing the number
 * after the visible "+20" prefix (e.g. "1012345678" or "201012345678") works.
 */
const normalizeEgWallet = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length > 10) d = d.slice(2);
  if (d.startsWith("1")) d = `0${d}`;
  return d.slice(0, 11);
};


interface WalletPaymentOptionProps {
  selected: boolean;
  onSelect: () => void;
  label: string;
  inputLabel: string;
  value: string;
  onChange: (value: string) => void;
  /** Whether the wallet phone input should be shown (paid orders only) */
  showInput?: boolean;
  hint?: string;
}


/**
 * Wallet payment method option with the platform's standard phone input
 * embedded inside the option card when selected. Locked to Egypt only.
 */
export const WalletPaymentOption = ({
  selected,
  onSelect,
  label,
  inputLabel,
  value,
  onChange,
  showInput = true,
  hint,
}: WalletPaymentOptionProps) => (
  <div
    className={`w-full rounded-2xl border-2 text-start transition-all overflow-hidden ${
      selected
        ? "border-primary bg-primary/5 shadow-sm"
        : "border-border/60 bg-card hover:border-border"
    }`}
  >
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between gap-3 p-3.5"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
            selected ? "border-primary" : "border-muted-foreground/30"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
        <Wallet className="w-4 h-4 text-foreground shrink-0" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <img src={vodafoneAsset.url} alt="Vodafone Cash" className="h-4 object-contain" />
        <img src={orangeAsset.url} alt="Orange Cash" className="h-4 object-contain" />
        <img src={etisalatAsset.url} alt="Etisalat Cash" className="h-4 object-contain" />
      </div>
    </button>

    {selected && showInput && (
      <div className="px-3.5 pb-3.5 space-y-2">
        <div dir="ltr" className="flex h-10 w-full items-center gap-2 rounded-xl border border-input bg-card px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <span
            className="inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 bg-muted border border-border rounded-full text-xs font-semibold text-foreground"
            dir="ltr"
          >
            <span className="w-[18px] h-[13px] rounded-[3px] overflow-hidden shrink-0">
              <EgyptFlag title="Egypt" />
            </span>
            <span>+20</span>
          </span>
          <input
            dir="rtl"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={value}
            onChange={(e) => onChange(normalizeEgWallet(e.target.value))}
            placeholder={inputLabel}
            className="flex-1 min-w-0 bg-transparent outline-none border-0 text-right placeholder:text-right placeholder:text-muted-foreground"
          />
        </div>
        {hint && (
          <p className="text-[11px] leading-relaxed text-muted-foreground px-1">{hint}</p>
        )}
      </div>
    )}

  </div>
);

