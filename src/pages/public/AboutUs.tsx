import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, PlayCircle, FileDown, Video, CalendarCheck, Palette, ShieldCheck,
  Wallet, Globe2, Award, Megaphone, Compass, Target, KeyRound, HeartHandshake, Eye, Sparkles,
  Check, MessageCircle,
} from "lucide-react";
import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { Magnetic } from "@/components/home/shared";
import { useScrollReveal } from "@/components/home/useScrollReveal";
import { SeoHead } from "@/components/common/SeoHead";
import { aboutPageJsonLd, organizationJsonLd } from "@/lib/siteStructuredData";

type L = { ar: string; en: string };

const products: { icon: typeof PlayCircle; t: L; d: L }[] = [
  { icon: PlayCircle, t: { ar: "كورسات مسجلة", en: "Recorded courses" }, d: { ar: "فيديو محمي، تتبّع تقدّم الطالب، وشهادات إتمام بتصميمك.", en: "Protected video, student progress tracking and certificates in your design." } },
  { icon: Video, t: { ar: "كورسات وجلسات لايف", en: "Live courses & sessions" }, d: { ar: "روابط زووم تُنشأ تلقائياً ومواعيد تُدار من مكان واحد.", en: "Zoom links created automatically, schedules managed in one place." } },
  { icon: CalendarCheck, t: { ar: "استشارات فردية", en: "One-on-one consultations" }, d: { ar: "افتح مواعيدك للحجز واستلم الدفع قبل الجلسة.", en: "Open your calendar for bookings and get paid before the session." } },
  { icon: FileDown, t: { ar: "منتجات رقمية", en: "Digital products" }, d: { ar: "بِع ملفاتك وقوالبك وكتبك الإلكترونية بتسليم فوري.", en: "Sell files, templates and e-books with instant delivery." } },
];

const reasons: { icon: typeof Wallet; t: L; d: L }[] = [
  { icon: Wallet, t: { ar: "٩٢٪ من أرباحك لك", en: "Keep 92% of your revenue" }, d: { ar: "عمولة واضحة ٨٪ فقط على المبيعات، بلا رسوم مخفية.", en: "A clear 8% commission on sales — no hidden fees." } },
  { icon: Palette, t: { ar: "صفحتك بهويتك", en: "Your page, your brand" }, d: { ar: "صفحة منتور وصفحات بيع بألوانك وشعارك ورابط خاص بك.", en: "A mentor page and sales pages in your colors, logo and own link." } },
  { icon: ShieldCheck, t: { ar: "حماية المحتوى", en: "Content protection" }, d: { ar: "علامة مائية ديناميكية ومشغّل فيديو محمي ضد النسخ.", en: "Dynamic watermark and a protected video player." } },
  { icon: Globe2, t: { ar: "دفع محلي وعالمي", en: "Local & global payments" }, d: { ar: "بطاقات وميزة داخل مصر، وفيزا وApple Pay وGoogle Pay حول العالم، بأسعار لكل دولة.", en: "Cards and Meeza in Egypt; Visa, Apple Pay and Google Pay worldwide, with per-country prices." } },
  { icon: Megaphone, t: { ar: "أدوات تسويق مدمجة", en: "Built-in marketing" }, d: { ar: "كوبونات، عروض إضافية عند الدفع، وربط بيكسل ميتا وتيك توك.", en: "Coupons, checkout add-ons, and Meta & TikTok pixel tracking." } },
  { icon: Award, t: { ar: "تجربة طالب متكاملة", en: "A complete student experience" }, d: { ar: "لوحة طالب، متابعة المشاهدة، شهادات، وتواصل عبر واتساب.", en: "Student dashboard, watch progress, certificates and WhatsApp contact." } },
];

const values: { icon: typeof KeyRound; t: L; d: L }[] = [
  { icon: KeyRound, t: { ar: "الملكية", en: "Ownership" }, d: { ar: "علامتك وطلابك ومحتواك ملكك أنت، لا ملك المنصة.", en: "Your brand, students and content belong to you — not the platform." } },
  { icon: Eye, t: { ar: "الشفافية", en: "Transparency" }, d: { ar: "عمولة معلنة وأرقام واضحة في لوحتك في كل وقت.", en: "A published commission and clear numbers in your dashboard at all times." } },
  { icon: HeartHandshake, t: { ar: "العلاقة المباشرة", en: "Direct relationships" }, d: { ar: "لا وسيط بينك وبين طلابك، ولا خوارزمية تتحكم في وصولك.", en: "No middleman between you and your students, no algorithm gating your reach." } },
  { icon: Sparkles, t: { ar: "البساطة", en: "Simplicity" }, d: { ar: "أدوات قوية بواجهة عربية سهلة تبدأ بها في دقائق.", en: "Powerful tools in a simple Arabic interface you can start with in minutes." } },
];

const AboutUs = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const tx = (l: L) => (isEn ? l.en : l.ar);
  const Arrow = isEn ? ArrowRight : ArrowLeft;
  useScrollReveal(".about-page");

  return (
    <div className="about-page min-h-screen w-full bg-[#eef7f1] text-[#0f2e22] font-noto overflow-x-hidden" dir={dir}>
      <style>{`
        .about-page .reveal-init { opacity: 0; transform: translateY(18px); transition: opacity .6s ease-out, transform .6s ease-out; }
        .about-page .reveal-init.reveal-in { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) { .about-page .reveal-init { opacity: 1 !important; transform: none !important; } }
      `}</style>
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title={isEn ? "About | Ebdaey" : "من نحن | إبداعي"}
        description={isEn
          ? "Ebdaey is the platform where Arab mentors sell courses, live sessions, consultations and digital products under their own brand — and keep 92% of revenue."
          : "إبداعي منصة تمكّن المنتور العربي من بيع الكورسات والجلسات اللايف والاستشارات والمنتجات الرقمية بعلامته الخاصة، مع ٩٢٪ من الأرباح له."}
        path="/about"
        jsonLd={[aboutPageJsonLd(isEn ? "en" : "ar"), organizationJsonLd(isEn ? "en" : "ar")]}
      />

      {/* HERO */}
      <section className="relative px-5 sm:px-8 pt-14 sm:pt-20 pb-20">
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(15,46,34,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,46,34,0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 bg-white border border-[#0f2e22]/10 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-[0.2em] text-[#32A873] mb-7" data-aos="fade-up">
              <Compass className="w-3.5 h-3.5" /> {isEn ? "About Ebdaey" : "من نحن"}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-[700] !leading-[1.35] tracking-tight mb-6" data-aos="fade-up" data-aos-delay="100">
              {isEn ? "Your knowledge," : "خبرتك تستحق"}
              <br />
              <span className="italic text-[#32A873]">{isEn ? "your platform, your income." : "منصة تحمل اسمك."}</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#0f2e22]/65 max-w-xl leading-relaxed mb-9" data-aos="fade-up" data-aos-delay="150">
              {isEn
                ? "Ebdaey gives Arab mentors everything they need to teach and sell online — courses, live sessions, consultations and digital products — under their own brand."
                : "إبداعي تمنح المنتور العربي كل ما يحتاجه ليُعلّم ويبيع أونلاين — كورسات، جلسات لايف، استشارات ومنتجات رقمية — تحت علامته الخاصة."}
            </p>
            <div className="flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="200">
              <Magnetic>
                <Link to="/auth?signup=1" className="group inline-flex items-center gap-3 bg-[#32A873] hover:bg-[#2d9765] text-white font-bold px-8 py-4 rounded-2xl shadow-[0_20px_50px_-18px_rgba(50,168,115,0.7)] transition-colors">
                  {isEn ? "Start for free" : "ابدأ مجاناً"}
                  <Arrow className={`w-5 h-5 transition-transform ${isEn ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                </Link>
              </Magnetic>
              <Link to="/contact" className="inline-flex items-center gap-2 bg-white border border-[#0f2e22]/15 hover:border-[#32A873] font-bold px-8 py-4 rounded-2xl transition-colors">
                <MessageCircle className="w-4 h-4" /> {isEn ? "Talk to us" : "تواصل معنا"}
              </Link>
            </div>
          </div>

          {/* Hero visual: product orbit */}
          <div className="lg:col-span-5" data-aos="fade-up" data-aos-delay="250">
            <div className="relative bg-[#0f2e22] rounded-[2rem] p-7 sm:p-9 overflow-hidden">
              <div className="absolute -top-20 -end-20 w-72 h-72 rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(50,168,115,0.8), transparent 70%)" }} />
              <p className="relative font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] mb-6">{isEn ? "One place for" : "مكان واحد لـ"}</p>
              <ul className="relative space-y-3">
                {products.map((p, i) => (
                  <li key={i} className="flex items-center gap-4 bg-[#eef7f1]/[0.06] border border-[#eef7f1]/10 rounded-2xl px-4 py-3.5 transition-transform duration-300 hover:-translate-y-0.5">
                    <span className="w-10 h-10 rounded-xl bg-[#32A873]/15 text-[#32A873] flex items-center justify-center shrink-0"><p.icon className="w-5 h-5" /></span>
                    <span className="text-[#eef7f1] font-semibold">{tx(p.t)}</span>
                    <Check className="w-4 h-4 text-[#32A873] ms-auto" />
                  </li>
                ))}
              </ul>
              <div className="relative mt-6 pt-6 border-t border-dashed border-[#eef7f1]/15 flex items-end justify-between">
                <div>
                  <div className="font-display text-5xl font-bold text-[#32A873]">92%</div>
                  <div className="text-[#eef7f1]/60 text-sm mt-1">{isEn ? "of every sale is yours" : "من كل عملية بيع لك"}</div>
                </div>
                <Wallet className="w-10 h-10 text-[#eef7f1]/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE ARE */}
      <section className="bg-white px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-4" data-aos="fade-up">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] block mb-4">01 — {isEn ? "Who we are" : "من نحن"}</span>
            <h2 className="text-3xl sm:text-4xl font-[700] !leading-[1.4]">{isEn ? "Built for the Arab creator." : "صُنعت للمبدع العربي."}</h2>
          </div>
          <div className="lg:col-span-8 space-y-6 text-lg text-[#0f2e22]/70 leading-loose" data-aos="fade-up" data-aos-delay="100">
            <p>
              {isEn
                ? "Ebdaey is an Egyptian education platform that turns a mentor's expertise into a real online business. Instead of stitching together a site builder, a payment gateway, a video host and a booking tool, you get all of it in one Arabic-first dashboard."
                : "إبداعي منصة تعليمية مصرية تحوّل خبرة المنتور إلى مشروع أونلاين حقيقي. بدلاً من جمع منشئ مواقع وبوابة دفع واستضافة فيديو وأداة حجز، تحصل على كل ذلك في لوحة تحكم واحدة بالعربية."}
            </p>
            <p className="text-[#0f2e22] font-semibold border-s-4 border-[#32A873] ps-5">
              {isEn
                ? "You focus on teaching. We handle the page, the payments, the delivery and the protection."
                : "أنت تركّز على التعليم، ونحن نتولّى الصفحة والدفع والتسليم وحماية المحتوى."}
            </p>
          </div>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] block mb-10" data-aos="fade-up">02 — {isEn ? "Mission & vision" : "الرسالة والرؤية"}</span>
          <div className="grid md:grid-cols-2 gap-px bg-[#0f2e22]/10 rounded-[2rem] overflow-hidden border border-[#0f2e22]/10">
            {[
              { icon: Target, t: { ar: "رسالتنا", en: "Our mission" }, d: { ar: "أن نجعل بيع المعرفة أونلاين سهلاً وعادلاً لكل خبير عربي، بأدوات احترافية وعمولة واضحة.", en: "To make selling knowledge online simple and fair for every Arab expert, with professional tools and a clear commission." } },
              { icon: Compass, t: { ar: "رؤيتنا", en: "Our vision" }, d: { ar: "أن يمتلك كل خبير عربي منصته وجمهوره ومصدر دخله، دون الاعتماد على وسيط.", en: "Every Arab expert owning their platform, audience and income — without depending on a middleman." } },
            ].map((b, i) => (
              <div key={i} className={`p-9 sm:p-12 ${i === 0 ? "bg-white" : "bg-[#0f2e22] text-[#eef7f1]"}`} data-aos="fade-up" data-aos-delay={i * 100}>
                <b.icon className="w-8 h-8 text-[#32A873] mb-8" />
                <h3 className="text-2xl sm:text-3xl font-[700] mb-4">{tx(b.t)}</h3>
                <p className={`text-lg leading-relaxed ${i === 0 ? "text-[#0f2e22]/65" : "text-[#eef7f1]/65"}`}>{tx(b.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bg-white px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-6 mb-14 items-end">
            <div className="lg:col-span-7" data-aos="fade-up">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] block mb-4">03 — {isEn ? "Why Ebdaey" : "لماذا إبداعي"}</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-[700] !leading-[1.4]">{isEn ? "What you actually get." : "ما الذي تحصل عليه فعلاً."}</h2>
            </div>
            <p className="lg:col-span-5 text-[#0f2e22]/60 text-lg leading-relaxed" data-aos="fade-up" data-aos-delay="100">
              {isEn ? "Real features, available today in your dashboard." : "مزايا حقيقية متاحة اليوم في لوحة تحكمك."}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-[#0f2e22]/10">
            {reasons.map((r, i) => (
              <div key={i} className="group py-9 sm:px-6 border-b border-dashed border-[#0f2e22]/15 sm:[&:nth-child(odd)]:border-e lg:[&:nth-child(odd)]:border-e-0 lg:[&:not(:nth-child(3n))]:border-e" data-aos="fade-up" data-aos-delay={(i % 3) * 80}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-11 h-11 rounded-xl bg-[#eef7f1] text-[#32A873] flex items-center justify-center group-hover:bg-[#32A873] group-hover:text-white transition-colors">
                    <r.icon className="w-5 h-5" />
                  </span>
                  <span className="font-mono text-xs text-[#0f2e22]/35">0{i + 1}</span>
                </div>
                <h3 className="text-xl font-[700] mb-2">{tx(r.t)}</h3>
                <p className="text-[#0f2e22]/60 leading-relaxed">{tx(r.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN SELL */}
      <section className="px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] block mb-4" data-aos="fade-up">04 — {isEn ? "Our services" : "خدماتنا"}</span>
          <h2 className="text-3xl sm:text-4xl font-[700] !leading-[1.4] mb-12" data-aos="fade-up">{isEn ? "Four ways to earn from your expertise." : "أربع طرق لتربح من خبرتك."}</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {products.map((p, i) => (
              <div key={i} className="group flex gap-5 bg-white border border-[#0f2e22]/10 rounded-3xl p-7 hover:border-[#32A873]/40 hover:shadow-[0_20px_45px_-30px_rgba(15,46,34,0.35)] hover:-translate-y-0.5 transition-all duration-300" data-aos="fade-up" data-aos-delay={(i % 2) * 100}>
                <span className="w-14 h-14 rounded-2xl bg-[#0f2e22] text-[#32A873] flex items-center justify-center shrink-0"><p.icon className="w-6 h-6" /></span>
                <div>
                  <h3 className="text-xl font-[700] mb-2">{tx(p.t)}</h3>
                  <p className="text-[#0f2e22]/60 leading-relaxed">{tx(p.d)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-[#0f2e22] text-[#eef7f1] px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#32A873] block mb-4" data-aos="fade-up">05 — {isEn ? "Our values" : "قيمنا"}</span>
          <h2 className="text-3xl sm:text-4xl font-[700] !leading-[1.4] mb-14" data-aos="fade-up">{isEn ? "What we stand for." : "ما نؤمن به."}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {values.map((v, i) => (
              <div key={i} data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="flex items-center gap-3 mb-5">
                  <v.icon className="w-6 h-6 text-[#32A873]" />
                  <span className="flex-1 h-0 border-b border-dashed border-[#eef7f1]/20" />
                </div>
                <h3 className="text-xl font-[700] mb-2">{tx(v.t)}</h3>
                <p className="text-[#eef7f1]/60 leading-relaxed">{tx(v.d)}</p>
              </div>
            ))}
          </div>

          {/* Facts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 mt-20 border-t border-[#eef7f1]/10">
            {[
              { k: "92%", v: { ar: "نصيبك من كل عملية بيع", en: "Your share of every sale" } },
              { k: "8%", v: { ar: "عمولة المنصة فقط", en: "Platform commission only" } },
              { k: "4", v: { ar: "أنواع منتجات تبيعها", en: "Product types you can sell" } },
              { k: "41", v: { ar: "دولة مدعومة للدفع الدولي", en: "Countries for global payments" } },
            ].map((s, i) => (
              <div key={i} className="pt-8 pe-4" data-aos="fade-up" data-aos-delay={i * 80}>
                <div className="font-display text-4xl sm:text-5xl font-bold text-[#32A873]">{s.k}</div>
                <div className="text-[#eef7f1]/55 text-sm mt-2">{tx(s.v)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto relative bg-white border border-[#0f2e22]/10 rounded-[2rem] overflow-hidden p-10 sm:p-16 text-center" data-aos="fade-up">
          <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[36rem] h-72 rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(50,168,115,0.7), transparent 70%)" }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-[700] !leading-[1.4] mb-5">
              {isEn ? "Ready to launch " : "جاهز تطلق "}
              <span className="italic text-[#32A873]">{isEn ? "your platform?" : "منصتك؟"}</span>
            </h2>
            <p className="text-[#0f2e22]/60 text-lg max-w-xl mx-auto mb-9">
              {isEn ? "Create your account, add your first product and start selling today." : "أنشئ حسابك، أضف أول منتج، وابدأ البيع اليوم."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link to="/auth?signup=1" className="group inline-flex items-center gap-3 bg-[#32A873] hover:bg-[#2d9765] text-white font-bold px-10 py-4 rounded-2xl shadow-[0_20px_50px_-18px_rgba(50,168,115,0.7)] transition-colors">
                  {isEn ? "Start for free" : "ابدأ مجاناً"}
                  <Arrow className={`w-5 h-5 transition-transform ${isEn ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                </Link>
              </Magnetic>
              <Link to="/contact" className="inline-flex items-center gap-2 border border-[#0f2e22]/15 hover:border-[#32A873] font-bold px-8 py-4 rounded-2xl transition-colors">
                {isEn ? "Contact us" : "تواصل معنا"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
};

export default AboutUs;
