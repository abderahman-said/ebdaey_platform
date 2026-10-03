import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Monitor, Clock, LogIn, HeadphonesIcon, UserCheck, Shield, Mail } from "lucide-react";
import { SeoHead } from "@/components/common/SeoHead";
import { useTranslation } from "react-i18next";

const DeliveryPolicy = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title={isEn ? "Delivery Policy | Ebdaey" : "سياسة التسليم | إبداعي"}
        description={isEn
          ? "How digital products and courses are delivered on the Ebdaey platform."
          : "سياسة تسليم المنتجات الرقمية والكورسات على منصة إبداعي."}
        path="/delivery-policy"
      />
      <div className="container max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
          <BackIcon className="w-4 h-4" />
          {isEn ? "Back to home" : "العودة للرئيسية"}
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {isEn ? "Delivery Policy" : "سياسة التسليم"}
        </h1>
        <p className="text-muted-foreground mb-10 text-sm">
          {isEn ? "Last updated: April 2026" : "آخر تحديث: أبريل 2026"}
        </p>

        {/* Introduction */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Introduction" : "مقدمة"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            {isEn ? (
              <>
                <p><strong className="text-foreground">Ebdaey</strong> is a digital platform specialized in delivering online courses and digital products.</p>
                <p>All products available on the platform are <strong className="text-foreground">entirely digital</strong>; there are no physical products or shipping operations.</p>
                <p>All content is accessed electronically through the user's account on the platform immediately after a successful payment.</p>
              </>
            ) : (
              <>
                <p>منصة <strong className="text-foreground">إبداعي</strong> هي منصة رقمية متخصصة في تقديم الدورات التعليمية والمنتجات الرقمية عبر الإنترنت.</p>
                <p>جميع المنتجات المتوفرة على المنصة هي <strong className="text-foreground">منتجات رقمية بالكامل</strong>، ولا يوجد أي منتجات مادية أو عمليات توصيل فعلي.</p>
                <p>يتم الوصول إلى جميع المحتويات إلكترونيًا من خلال حساب المستخدم على المنصة فور إتمام عملية الدفع بنجاح.</p>
              </>
            )}
          </div>
        </section>

        {/* Delivery Method */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Delivery method" : "طريقة التسليم"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>{isEn ? "Digital content is delivered in the following ways:" : "يتم تسليم المحتوى الرقمي من خلال الطرق التالية:"}</p>
            <ul className="space-y-2 list-none px-0">
              {(isEn
                ? [
                    { title: "Courses:", body: "Made available directly in the user's account on the platform and accessed from the student dashboard or the course link." },
                    { title: "Digital files:", body: "When downloadable files are included in a course, users can download them directly from the lesson page." },
                    { title: "Content bank:", body: "Some courses include a content bank with additional files and materials accessible from the course page." },
                  ]
                : [
                    { title: "الدورات التعليمية:", body: "يتم إتاحتها مباشرة في حساب المستخدم على المنصة، ويمكن الوصول إليها من خلال لوحة التحكم الخاصة بالطالب أو من خلال رابط الدورة." },
                    { title: "الملفات الرقمية:", body: "في حال توفر ملفات قابلة للتحميل ضمن الدورة، يمكن للمستخدم تحميلها مباشرة من صفحة الدرس المخصص." },
                    { title: "بنك المحتوى:", body: "بعض الدورات توفر بنك محتوى يحتوي على ملفات ومواد إضافية يمكن الوصول إليها من داخل صفحة الدورة." },
                  ]
              ).map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span><strong className="text-foreground">{it.title}</strong> {it.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Delivery Time */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Delivery time" : "وقت التسليم"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            {isEn ? (
              <>
                <p>Digital content is delivered <strong className="text-foreground">immediately after a successful payment</strong>. Once payment is confirmed by the gateway, access is enabled automatically in the user's account.</p>
                <p>In very rare cases, a short delay (a few minutes) may occur due to payment processing on the gateway side. Please wait a moment and refresh the page.</p>
              </>
            ) : (
              <>
                <p>يتم تسليم المحتوى الرقمي <strong className="text-foreground">فورًا بعد إتمام عملية الدفع بنجاح</strong>. بمجرد تأكيد الدفع من بوابة الدفع، يتم تفعيل الوصول إلى المحتوى تلقائيًا في حساب المستخدم.</p>
                <p>في حالات نادرة جدًا، قد يحدث تأخير بسيط (لا يتجاوز بضع دقائق) بسبب معالجة عملية الدفع من جانب بوابة الدفع. في هذه الحالة، يُرجى الانتظار قليلًا ثم تحديث الصفحة.</p>
              </>
            )}
          </div>
        </section>

        {/* Access Instructions */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {isEn ? "How to access content after purchase" : "كيفية الوصول للمحتوى بعد الشراء"}
            </h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>{isEn ? "To access content you purchased, follow these steps:" : "للوصول إلى المحتوى الذي قمت بشرائه، اتبع الخطوات التالية:"}</p>
            <div className="space-y-3">
              {(isEn
                ? [
                    "Sign in to your account on the platform using your email and password.",
                    'Go to your dashboard (the "My Courses" section).',
                    "Pick the course you want to watch and start learning right away.",
                  ]
                : [
                    "قم بتسجيل الدخول إلى حسابك على المنصة باستخدام البريد الإلكتروني وكلمة المرور.",
                    "انتقل إلى لوحة التحكم الخاصة بك (قسم \"كورساتي\").",
                    "اختر الدورة التي ترغب في مشاهدتها وابدأ التعلم مباشرة.",
                  ]
              ).map((text, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-4">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Delivery Issues */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HeadphonesIcon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Access issues" : "مشاكل الوصول للمحتوى"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>{isEn
              ? "If you have any trouble accessing the content after a successful payment, please try the following:"
              : "إذا واجهت أي مشكلة في الوصول إلى المحتوى بعد إتمام الدفع، يُرجى اتباع الخطوات التالية:"}</p>
            <ul className="space-y-2 list-none px-0">
              {(isEn
                ? [
                    "Make sure you are signed in with the same email address you used for the purchase.",
                    "Refresh the page, or sign out and sign back in.",
                    "If the issue persists, contact our support team by email and we will resolve it as fast as possible.",
                  ]
                : [
                    "تأكد من تسجيل الدخول بنفس البريد الإلكتروني المستخدم أثناء عملية الشراء.",
                    "قم بتحديث الصفحة أو تسجيل الخروج ثم الدخول مرة أخرى.",
                    "إذا استمرت المشكلة، تواصل مع فريق الدعم الفني عبر البريد الإلكتروني وسنقوم بحل المشكلة في أسرع وقت.",
                  ]
              ).map((text, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* User Responsibility */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "User responsibility" : "مسؤولية المستخدم"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>{isEn ? "To ensure a smooth experience, users are responsible for:" : "لضمان تجربة سلسة، يتحمل المستخدم المسؤوليات التالية:"}</p>
            <ul className="space-y-2 list-none px-0">
              {(isEn
                ? [
                    { title: "Providing correct information:", body: "Ensuring the email and phone number are accurate at registration and checkout." },
                    { title: "Protecting account data:", body: "Keeping the password confidential and not sharing login credentials with anyone." },
                    { title: "Verifying email:", body: "Making sure the email is correct to receive purchase confirmations and access details." },
                  ]
                : [
                    { title: "إدخال بيانات صحيحة:", body: "التأكد من صحة البريد الإلكتروني ورقم الهاتف عند التسجيل والشراء." },
                    { title: "حماية بيانات الحساب:", body: "الحفاظ على سرية كلمة المرور وعدم مشاركة بيانات الدخول مع أي شخص آخر." },
                    { title: "التحقق من البريد الإلكتروني:", body: "التأكد من صحة البريد الإلكتروني لاستقبال تأكيد الشراء وبيانات الوصول." },
                  ]
              ).map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span><strong className="text-foreground">{it.title}</strong> {it.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Platform Role */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Role of the platform" : "دور المنصة"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            {isEn ? (
              <>
                <p>Ebdaey acts as a technical intermediary providing the infrastructure to host and deliver digital content. The educational content (courses and files) is provided by mentors registered on the platform.</p>
                <p>The platform is committed to providing continuous, secure access to purchased content and a smooth, reliable user experience.</p>
              </>
            ) : (
              <>
                <p>منصة إبداعي تعمل كوسيط تقني يوفر البنية التحتية اللازمة لاستضافة وتقديم المحتوى الرقمي. المحتوى التعليمي (الدورات والملفات) مقدم من المدربين (المنتورز) المسجلين على المنصة.</p>
                <p>تلتزم المنصة بتوفير وصول مستمر وآمن للمحتوى المشترى، وضمان تجربة مستخدم سلسة وموثوقة.</p>
              </>
            )}
          </div>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{isEn ? "Contact information" : "معلومات التواصل"}</h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
            <p>{isEn
              ? "For any question or issue related to content access, you can reach us via:"
              : "في حال وجود أي استفسار أو مشكلة تتعلق بالوصول إلى المحتوى، يمكنك التواصل معنا عبر:"}</p>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p>📧 {isEn ? "Email:" : "البريد الإلكتروني:"} <a href="mailto:support@ebdaey.com" className="text-primary hover:underline font-medium">support@ebdaey.com</a></p>
              <p>📄 {isEn ? (
                <>The <Link to="/contact" className="text-primary hover:underline font-medium">Contact us</Link> page</>
              ) : (
                <>صفحة <Link to="/contact" className="text-primary hover:underline font-medium">تواصل معنا</Link></>
              )}</p>
            </div>
            <p>{isEn ? "We aim to reply to all inquiries within 24–48 business hours." : "نسعى للرد على جميع الاستفسارات خلال 24-48 ساعة عمل."}</p>
          </div>
        </section>
      </div>
      <HomeFooter />
    </div>
  );
};

export default DeliveryPolicy;
