import { currencySymbol } from "@/lib/currency";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentBadges from "@/components/common/PaymentBadges";
import { toAr } from "@/lib/utils";
import DigitalProductSamplePreview from "./DigitalProductSamplePreview";

interface Props {
  product: any;
  isPurchased: boolean;
  reviews: { rating: number }[];
  roundedRating: number;
  filesCount: number;
  productSlug: string;
  deliveryUrl: (slug: string) => string;
  onBuy: () => void;
  samples?: { id: string; title: string; file_size_bytes: number | null; file_type: string | null }[];
}

const ProductMobileBottomBar = ({
  product,
  isPurchased,
  reviews,
  roundedRating,
  filesCount,
  productSlug,
  deliveryUrl,
  onBuy,
  samples = [],
}: Props) => {
  const { t } = useTranslation();
  return (

  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
    <div className="bg-white/80 backdrop-blur-lg border-t border-[#d7dce6] rounded-t-[20px] text-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            {product.price_before_discount && product.price_before_discount > product.price && (
              <span className="text-[11px] text-foreground/35 line-through">
                {toAr(product.price_before_discount)}
              </span>
            )}
            <span className="text-xl font-medium text-foreground leading-none">
              {product.price > 0 ? toAr(product.price) : t("digitalProduct.purchaseCard.free")}
            </span>
            {product.price > 0 && (
              <span className={`text-[11px] text-foreground/45 font-bold ${product.currency === "SAR" ? "product-sar-symbol" : ""}`}>
                {currencySymbol(product.currency)}
              </span>
            )}
          </div>
          {product.price_before_discount && product.price_before_discount > product.price && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
              {t("digitalProduct.purchaseCard.discount")} {toAr(Math.round(((product.price_before_discount - product.price) / product.price_before_discount) * 100))}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-foreground/50 font-medium">
          {filesCount > 0 && (
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {t("digitalProduct.mobileBar.downloadable")}
            </span>
          )}
        </div>
      </div>

      <div className="pb-3 px-[20px]">
        {isPurchased ? (
          <Link to={deliveryUrl(productSlug)} className="block">
            <Button className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
              <Download className="w-4 h-4 me-1.5" />
              {t("digitalProduct.purchaseCard.downloadProduct")}
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full h-[46px] text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            onClick={onBuy}
          >
            <ArrowRight className="w-4 h-4 me-1.5" />
            {product.buy_button_text || (product.price > 0 ? t("digitalProduct.mobileBar.getProduct") : t("digitalProduct.purchaseCard.getFree"))}
          </Button>
        )}
      </div>



      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex items-center gap-2">
          {reviews.length > 0 && (
            <>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-2.5 h-2.5 ${s <= Math.round(roundedRating) ? "fill-amber-400 text-amber-400" : "text-foreground/15"}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-amber-500 font-bold ms-0.5">{toAr(roundedRating)}</span>
            </>
          )}
        </div>
        {product.price > 0 && (
          <PaymentBadges currency={product.currency} imgClassName="h-4 object-contain" />
        )}
      </div>
    </div>
  </div>
  );
};

export default ProductMobileBottomBar;
