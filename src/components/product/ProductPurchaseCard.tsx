import { currencySymbol } from "@/lib/currency";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { ArrowRight, Star, Shield, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentBadges from "@/components/common/PaymentBadges";
import { toAr } from "@/lib/utils";
import DigitalProductSamplePreview from "./DigitalProductSamplePreview";

interface Props {
  product: any;
  isPurchased: boolean;
  reviews: { rating: number }[];
  roundedRating: number;
  communityLink: string;
  productSlug: string;
  deliveryUrl: (slug: string) => string;
  onBuy: () => void;
  samples?: { id: string; title: string; file_size_bytes: number | null; file_type: string | null }[];
}


const ProductPurchaseCard = ({
  product,
  isPurchased,
  reviews,
  roundedRating,
  communityLink,
  productSlug,
  deliveryUrl,
  onBuy,
  samples = [],
}: Props) => {
  const { t } = useTranslation();


  return (
    <div className="hidden lg:block relative">
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[28px] blur-sm" />

      <div className="relative bg-card border border-border/50 rounded-[24px] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-l from-primary via-primary/80 to-primary/40" />

        <div className="p-6 space-y-5">
          <div className="relative bg-muted/40 rounded-2xl p-5">
            {product.price_before_discount &&
              product.price_before_discount > product.price && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-destructive text-destructive-foreground text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                    {t("digitalProduct.purchaseCard.discount")}{" "}
                    {toAr(
                      Math.round(
                        ((product.price_before_discount - product.price) /
                          product.price_before_discount) *
                          100,
                      ),
                    )}
                    {i18n.language === "en" ? "%" : "٪"}
                  </span>
                </div>
              )}

            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-foreground tracking-tight leading-none text-4xl">
                    {product.price > 0 ? toAr(product.price) : t("digitalProduct.purchaseCard.free")}
                  </span>
                  {product.price > 0 && (
                    <span className={`text-sm text-muted-foreground font-bold ${product.currency === "SAR" ? "product-sar-symbol" : ""}`}>
                      {currencySymbol(product.currency)}
                    </span>
                  )}
                </div>
                {product.price_before_discount &&
                  product.price_before_discount > product.price && (
                    <span className="text-sm text-muted-foreground line-through font-medium mt-1 block">
                      {toAr(product.price_before_discount)}{" "}
                      <span className={product.currency === "SAR" ? "product-sar-symbol" : ""}>
                        {currencySymbol(product.currency)}
                      </span>
                    </span>
                  )}
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5 border border-border/40 shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-foreground">{toAr(roundedRating)}</span>
                  <span className="text-[10px] text-muted-foreground">({toAr(reviews.length)})</span>
                </div>
              )}
            </div>
          </div>

          {isPurchased ? (
            <Link to={deliveryUrl(productSlug)} className="block">
              <Button className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-300">
                <Download className="w-5 h-5 me-2" />
                {t("digitalProduct.purchaseCard.downloadProduct")}
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full h-14 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 transition-all duration-300"
              onClick={onBuy}
            >
              <ArrowRight className="w-5 h-5 me-2" />
              {product.buy_button_text ||
                (product.price > 0 ? t("digitalProduct.purchaseCard.getNow") : t("digitalProduct.purchaseCard.getFree"))}
            </Button>
          )}
          {!isPurchased && samples.length > 0 && (
            <DigitalProductSamplePreview samples={samples} />
          )}


          {product.price > 0 && (
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] text-muted-foreground font-medium">{t("digitalProduct.purchaseCard.securePayment")}</span>
              </div>
              <PaymentBadges currency={product.currency} imgClassName="h-5 object-contain" />
            </div>
          )}

          {isPurchased && communityLink && (
            <div className="pt-1">
              <a href={communityLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 text-sm font-semibold rounded-xl border-2 border-primary/15 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <MessageCircle className="w-4 h-4 me-2 group-hover:scale-110 transition-transform" />
                  {t("digitalProduct.purchaseCard.joinCommunity")}
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPurchaseCard;
