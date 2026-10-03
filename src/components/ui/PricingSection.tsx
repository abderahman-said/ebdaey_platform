import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, TrendingUp } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import image from "../../assets/package.png";
import PremiumSectionHeading from "@/components/ui/PremiumSectionHeading";
gsap.registerPlugin(ScrollTrigger);

const features = [
  "وصول كامل لجميع أدوات المنصة",
  "رفع غير محدود للكورسات والمنتجات",
  "بوابات دفع متكاملة وتحويلات سريعة",
  "حماية المحتوى من النسخ والتحميل",
  "شهادات إتمام احترافية قابلة للتخصيص",
  "دعم فني مخصص على مدار الساعة",
];

export default function PricingSection() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const visualRef = useRef(null);
  const percentRef = useRef(null);
  const featuresRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // دخول المحتوى من اليمين
      gsap.from(contentRef.current, {
        x: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 80%",
        },
      });

      // دخول الصورة من اليسار
      gsap.from(visualRef.current, {
        x: -40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: visualRef.current,
          start: "top 80%",
        },
      });

      // عداد النسبة من 0 إلى 8%
      const counter = { val: 0 };
      gsap.to(counter, {
        val: 8,
        duration: 1.4,
        ease: "power1.out",
        scrollTrigger: {
          trigger: contentRef.current,
          start: "top 75%",
        },
        onUpdate: () => {
          if (percentRef.current) {
            const n = Math.round(counter.val);
            const ar = String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
            percentRef.current.textContent = `${ar}٪`;
          }
        },
      });

      // ميزات تظهر واحدة تلو الأخرى
      gsap.from(featuresRef.current.children, {
        opacity: 0,
        x: 20,
        duration: 0.5,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 85%",
        },
      });

      // الدوائر المتوهجة في الخلفية - حركة عائمة بسيطة
      gsap.to(".pricing-blob", {
        y: 20,
        x: 10,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 1,
      });

      // عناصر عائمة فوق الصورة
      gsap.to(".float-card", {
        y: -12,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.4,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="pt-24 bg-white relative overflow-hidden"
    >
      <div className="pricing-blob absolute top-20 right-0 w-72 h-72 rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="pricing-blob absolute bottom-20 left-0 w-72 h-72 rounded-full bg-violet-500/5 blur-[80px] pointer-events-none" />

      {/* Decorative Dots */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-[0.35] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(hsl(var(--primary)) 2px, transparent 2px)', 
          backgroundSize: '30px 30px', 
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 100% 0%, black 30%, transparent 100%)' 
        }} 
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none opacity-[0.35] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(hsl(var(--primary)) 2px, transparent 2px)', 
          backgroundSize: '30px 30px', 
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 0% 100%, black 30%, transparent 100%)' 
        }} 
      />


      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative">
        <PremiumSectionHeading 
          badge="الأسعار" 
          title="باقة واحدة بسيطة وواضحة" 
          subtitle="بدون رسوم اشتراك شهري — ادفع فقط عند تحقيق مبيعات" 
        />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* المحتوى - يمين */}
          <div ref={contentRef} className=" order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                باقة المبدعين
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                الأكثر شعبية
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              كل ما تحتاجه لإطلاق أكاديميتك
            </p>

            <div className="mb-7 pb-7 border-b border-slate-200">
              <h4 className="text-emerald-600 font-black text-xl mb-2">
                مجاني تماماً
              </h4>
              <div className="flex items-baseline gap-2">
                <span
                  ref={percentRef}
                  className="text-5xl sm:text-6xl font-black text-slate-900"
                >
                  ٠٪
                </span>
                <span className="text-sm text-slate-500 max-w-[160px]">
                  عمولة فقط على كل عملية بيع ناجحة
                </span>
              </div>
            </div>

            <ul ref={featuresRef} className="space-y-3 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-slate-700 font-medium leading-relaxed">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Link to="/auth" className="block sm:inline-block">
              <button className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200">
                ابدأ منصتك الآن
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              </button>
            </Link>

            <p className="text-xs text-slate-400 font-medium mt-4">
              بدون بطاقة ائتمانية · جاهز خلال دقيقتين
            </p>
          </div>

          {/* الصورة / الواجهة - يسار */}
          <div ref={visualRef} className="order-1 lg:order-2  relative">
              {/* استبدل هذا بصورة حقيقية للمنصة */}
              <img
                src={image}
                alt="معاينة لوحة تحكم المنصة"
                className="relative w-full h-auto rounded-2xl object-contain aspect-[4/3]"
              />

            {/* بطاقة عائمة - الإيرادات */}
            <div className="float-card absolute -bottom-6 -right-4 sm:-right-8 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">إيراداتك</p>
                <p className="text-base font-black text-slate-900">12,480 ج.م</p>
              </div>
            </div>

            {/* بطاقة عائمة - تقييم */}
            <div className="float-card absolute -top-5 -left-4 sm:-left-8 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-slate-800">+500 طالب نشط</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}