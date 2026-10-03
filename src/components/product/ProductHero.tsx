import { Package, Download } from "lucide-react";
import BannerAutoplayVideo from "@/components/media/BannerAutoplayVideo";
import OptimizedImage from "@/components/media/OptimizedImage";
import { toAr } from "@/lib/utils";
import DigitalProductSamplePreview from "./DigitalProductSamplePreview";

interface Props {
  product: any;
  filesCount: number;
  samples?: { id: string; title: string; file_size_bytes: number | null; file_type: string | null }[];
  isPurchased?: boolean;
}

const ProductHero = ({ product, filesCount, samples = [], isPurchased = false }: Props) => (
  <div id="section-about" className="scroll-mt-20 space-y-6 sm:space-y-8 lg:space-y-12">
    <div className="rounded-2xl lg:rounded-3xl overflow-hidden aspect-video bg-muted shadow-[0_2px_12px_#00000008] lg:shadow-2xl relative group max-w-2xl mx-auto">
      {product.banner_type === "video" && product.banner_video_url ? (
        <BannerAutoplayVideo src={product.banner_video_url} poster={product.thumbnail_url || undefined} />
      ) : product.thumbnail_url ? (
        <>
          <OptimizedImage
            src={product.thumbnail_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Package className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-primary/30" />
        </div>
      )}
    </div>

    <div>
      {product.landing_header && (
        <h2
          className="text-base sm:text-lg lg:text-xl font-bold mb-4 sm:mb-6 leading-tight"
          style={{ color: product.landing_header_color || "#000" }}
        >
          {product.landing_header}
        </h2>
      )}
    </div>

    <div className="text-center max-w-4xl mx-auto">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-black mb-3 sm:mb-4 leading-tight">
        {product.title}
      </h1>
      {product.landing_subheader && (
        <p
          className="text-base leading-relaxed max-w-2xl mx-auto px-4 font-medium"
          style={{ color: product.landing_subheader_color || undefined }}
        >
          {product.landing_subheader}
        </p>
      )}
    </div>
  </div>
);

export default ProductHero;
