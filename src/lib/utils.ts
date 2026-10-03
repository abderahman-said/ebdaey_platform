import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from "@/i18n";
import { formatMoney } from "@/lib/currency";
import { getDisplayCurrency } from "@/lib/localPrice";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function toAr(val: string | number): string {
  const s = String(val);
  if (i18n.language === "en") return s;
  return s.replace(/[0-9]/g, (d) => arabicDigits[+d]).replace(/\./g, '٫');
}

export function toArPrice(val: number, currency?: string): string {
  return formatMoney(val, currency ?? getDisplayCurrency());
}

