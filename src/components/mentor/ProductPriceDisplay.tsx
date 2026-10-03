import { formatMoney } from "@/lib/currency";

export type ProductPriceValue = {
  country_code: string | null;
  currency: string;
  price: number;
};

interface Props {
  basePrice: number;
  prices?: ProductPriceValue[];
  freeLabel: string;
  className?: string;
}

export default function ProductPriceDisplay({ basePrice, prices = [], freeLabel, className }: Props) {
  const values = prices.length
    ? prices.map((row) => ({ amount: Number(row.price) || 0, currency: row.currency || "EGP" }))
    : [{ amount: Number(basePrice) || 0, currency: "EGP" }];

  const uniqueValues = values.filter(
    (value, index, all) => all.findIndex((candidate) => candidate.amount === value.amount && candidate.currency === value.currency) === index,
  );

  if (uniqueValues.every((value) => value.amount <= 0)) {
    return <span className={className}>{freeLabel}</span>;
  }

  return (
    <span className={className} dir="auto">
      {uniqueValues.map((value) => formatMoney(value.amount, value.currency)).join(" · ")}
    </span>
  );
}