import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/common/SeoHead";
import { useTranslation } from "react-i18next";

type Section = {
  title: string;
  content?: string | null;
  list?: { label: string; desc: string }[];
  note?: string;
  contacts?: { label: string; value: string }[];
};

const sectionsAr: Section[] = [
  { title: "مقدمة", content: `منصة "إبداعي" هي سوق إلكتروني يربط بين المدربين (مقدمي المحتوى) والطلاب (المستخدمين)، حيث يتيح للمدربين عرض وبيع دوراتهم التعليمية ومنتجاتهم الرقمية، ويتيح للطلاب الوصول إلى محتوى تعليمي متنوع. باستخدامك لمنصة إبداعي أو التسجيل فيها، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام المنصة.` },
  { title: "طبيعة الخدمة", content: null, list: [
    { label: "المنصة كوسيط", desc: "تعمل إبداعي كوسيط تقني بين المدربين والطلاب، حيث توفر البنية التحتية اللازمة لعرض وبيع وشراء المحتوى التعليمي." },
    { label: "المحتوى من المدربين", desc: "المنصة لا تقوم بإنشاء أو إنتاج المحتوى التعليمي بنفسها. جميع الدورات والمواد التعليمية يتم إعدادها ورفعها بواسطة المدربين المسجلين على المنصة." },
    { label: "عدم ضمان النتائج", desc: "المنصة لا تضمن تحقيق نتائج محددة من استخدام أي دورة تعليمية، حيث تعتمد النتائج على عوامل متعددة خاصة بكل مستخدم." },
  ]},
  { title: "حسابات المستخدمين", content: "عند إنشاء حساب على المنصة، يلتزم المستخدم بما يلي:", list: [
    { label: "صحة البيانات", desc: "تقديم معلومات صحيحة ودقيقة عند التسجيل وتحديثها عند الحاجة." },
    { label: "سرية الحساب", desc: "الحفاظ على سرية بيانات تسجيل الدخول وعدم مشاركتها مع أي طرف آخر. المستخدم مسؤول عن جميع الأنشطة التي تتم من خلال حسابه." },
    { label: "الاستخدام المشروع", desc: "عدم استخدام الحساب لأي غرض مخالف أو غير مشروع." },
  ]},
  { title: "مسؤولية المدرب (مقدم المحتوى)", content: "المدرب المسجل على المنصة يتحمل المسؤولية الكاملة عن:", list: [
    { label: "محتوى الدورة", desc: "جميع المواد التعليمية والمحتوى المرفوع على المنصة، بما في ذلك النصوص والفيديوهات والملفات." },
    { label: "دقة المعلومات", desc: "التأكد من صحة ودقة المعلومات المقدمة في الدورات التعليمية." },
    { label: "جودة المادة", desc: "الالتزام بتقديم محتوى ذي جودة مناسبة يتوافق مع الوصف المعلن للدورة." },
    { label: "الملكية الفكرية", desc: "ضمان امتلاكه لجميع الحقوق اللازمة للمحتوى المنشور، وعدم انتهاك حقوق الملكية الفكرية لأي طرف آخر." },
  ], note: "إبداعي كمنصة وسيطة غير مسؤولة عن محتوى الدورات التي يقدمها المدربون، ولا تتحمل أي مسؤولية تجاه دقة أو جودة هذا المحتوى." },
  { title: "المدفوعات والأسعار", content: null, list: [
    { label: "بوابة الدفع", desc: "تتم جميع عمليات الدفع من خلال بوابة دفع إلكترونية خارجية آمنة ومعتمدة. لا تقوم المنصة بتخزين بيانات البطاقات الائتمانية." },
    { label: "تحديد الأسعار", desc: "يقوم المدرب بتحديد أسعار دوراته بشكل مستقل. المنصة لا تتدخل في تسعير المحتوى." },
    { label: "عمولة المنصة", desc: "تحصل المنصة على عمولة محددة من كل عملية بيع ناجحة مقابل الخدمات التقنية والتشغيلية التي توفرها." },
    { label: "العملة", desc: "جميع الأسعار معروضة بالجنيه المصري ما لم يُذكر خلاف ذلك." },
  ]},
  { title: "سياسة الاسترجاع", content: `عمليات الاسترجاع واسترداد المبالغ تخضع لسياسة الاسترجاع الخاصة بالمنصة. للاطلاع على التفاصيل الكاملة، يُرجى مراجعة صفحة سياسة الاسترجاع أو التواصل مع فريق الدعم.` },
  { title: "الاستخدام المقبول", content: "يلتزم جميع مستخدمي المنصة بعدم القيام بأي من الأفعال التالية:", list: [
    { label: "إساءة الاستخدام", desc: "استخدام المنصة بأي طريقة تضر بالمنصة أو بالمستخدمين الآخرين أو تتعارض مع الغرض المخصص لها." },
    { label: "محتوى مخالف", desc: "رفع أو نشر أي محتوى غير قانوني أو مسيء أو ينتهك حقوق الآخرين." },
    { label: "الاختراق والتلاعب", desc: "محاولة الوصول غير المصرح به إلى أنظمة المنصة أو التلاعب بها أو إلحاق الضرر بالبنية التحتية." },
    { label: "المشاركة غير المصرح بها", desc: "مشاركة بيانات الدخول أو المحتوى المدفوع مع أطراف غير مصرح لها." },
  ]},
  { title: "الملكية الفكرية", content: null, list: [
    { label: "ملكية المحتوى", desc: "المحتوى التعليمي (الدورات، الفيديوهات، الملفات) مملوك لمقدم المحتوى (المدرب) ومحمي بموجب حقوق الملكية الفكرية." },
    { label: "حقوق المنصة", desc: "العلامة التجارية لإبداعي وتصميم المنصة والأكواد البرمجية مملوكة لمنصة إبداعي." },
    { label: "حظر إعادة النشر", desc: "لا يحق لأي مستخدم إعادة نشر أو بيع أو توزيع أو نسخ أي محتوى من المنصة بدون إذن كتابي مسبق من صاحب المحتوى." },
  ]},
  { title: "إيقاف الحسابات", content: `تحتفظ منصة إبداعي بالحق في تقييد أو تعليق أو إنهاء حساب أي مستخدم في حالة مخالفة هذه الشروط والأحكام، أو إساءة استخدام المنصة، أو القيام بأي نشاط يضر بالمنصة أو مستخدميها. سيتم إخطار المستخدم بأسباب الإيقاف عند الإمكان.` },
  { title: "حدود المسؤولية", content: "منصة إبداعي بصفتها وسيطاً تقنياً غير مسؤولة عن:", list: [
    { label: "محتوى الدورات", desc: "أي معلومات أو مواد تعليمية يقدمها المدربون عبر المنصة." },
    { label: "نتائج الاستخدام", desc: "أي نتائج أو توقعات مرتبطة باستخدام أي دورة تعليمية." },
    { label: "الأضرار غير المباشرة", desc: "أي خسائر أو أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة أو المحتوى المتاح عليها." },
    { label: "خدمات الطرف الثالث", desc: "أي مشكلات تتعلق بخدمات أو أنظمة تابعة لأطراف خارجية مثل بوابات الدفع." },
  ]},
  { title: "تكاملات الأطراف الخارجية (Zoom وGoogle Calendar)", content: "قد تُعقد الكورسات المباشرة والاستشارات وباقات الجلسات عبر Zoom، وقد يقوم المدرب بمزامنة المواعيد مع Google Calendar:", list: [
    { label: "ربط اختياري", desc: "المدرب فقط هو من يربط Zoom أو Google Calendar عبر شاشة الموافقة الرسمية للمزوّد، ويمكنه إلغاء الربط في أي وقت من لوحة التحكم. ولا يقوم الطالب بربط أي حساب." },
    { label: "تطبيق شروط المزوّد", desc: "الاجتماعات التي تُعقد على Zoom تخضع أيضاً لشروط وسياسة خصوصية Zoom. ولا تتحمل إبداعي مسؤولية انقطاع أو تغيّر خدمات الأطراف الخارجية." },
    { label: "إدارة الاجتماع", desc: "المدرب هو المضيف والمتحكم في الاجتماع، بما يشمل غرفة الانتظار والكتم والتسجيل. ولا يجوز للطالب تسجيل الاجتماع أو إعادة نشره أو مشاركة رابطه دون إذن المدرب." },
    { label: "معالجة البيانات", desc: "البيانات التي نصل إليها من هذه الخدمات وطريقة إلغاء الوصول موضحة في سياسة الخصوصية." },
  ]},
  { title: "تعديل الشروط", content: `تحتفظ منصة إبداعي بالحق في تعديل أو تحديث هذه الشروط والأحكام في أي وقت. سيتم نشر التعديلات على هذه الصفحة مع تحديث تاريخ آخر تعديل. استمرارك في استخدام المنصة بعد نشر التعديلات يعني موافقتك على الشروط المحدثة. ننصحك بمراجعة هذه الصفحة بشكل دوري.` },

  { title: "التواصل معنا", content: `إذا كان لديك أي أسئلة أو استفسارات حول هذه الشروط والأحكام، يمكنك التواصل معنا عبر:`, contacts: [{ label: "البريد الإلكتروني", value: "support@ebdaey.com" }] },
];

const sectionsEn: Section[] = [
  { title: "Introduction", content: `Ebdaey is an online marketplace that connects mentors (content creators) with students (users), letting mentors publish and sell courses and digital products, and letting students access a wide range of educational content. By using or registering on Ebdaey, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the platform.` },
  { title: "Nature of the service", content: null, list: [
    { label: "Platform as an intermediary", desc: "Ebdaey acts as a technical intermediary between mentors and students, providing the infrastructure needed to publish, sell, and purchase educational content." },
    { label: "Content is provided by mentors", desc: "Ebdaey does not create or produce the educational content itself. All courses and materials are prepared and uploaded by mentors registered on the platform." },
    { label: "No guarantee of outcomes", desc: "The platform does not guarantee specific outcomes from any course; results depend on many factors specific to each user." },
  ]},
  { title: "User accounts", content: "When creating an account on the platform, users agree to:", list: [
    { label: "Accurate information", desc: "Provide accurate, up-to-date information at registration and update it when needed." },
    { label: "Account confidentiality", desc: "Keep login credentials confidential and not share them with anyone. The user is responsible for all activity under their account." },
    { label: "Lawful use", desc: "Not use the account for any unlawful or prohibited purpose." },
  ]},
  { title: "Mentor (content creator) responsibility", content: "Mentors registered on the platform are fully responsible for:", list: [
    { label: "Course content", desc: "All educational materials and content uploaded to the platform, including text, videos, and files." },
    { label: "Accuracy of information", desc: "Ensuring the accuracy and validity of the information presented in their courses." },
    { label: "Quality of material", desc: "Delivering content of a suitable quality that matches the course's published description." },
    { label: "Intellectual property", desc: "Ensuring they hold all rights necessary to publish the content and that they do not infringe any third-party IP." },
  ], note: "As an intermediary, Ebdaey is not responsible for the content of courses provided by mentors and bears no liability for its accuracy or quality." },
  { title: "Payments and pricing", content: null, list: [
    { label: "Payment gateway", desc: "All payments are processed through a secure, approved external payment gateway. The platform does not store card details." },
    { label: "Setting prices", desc: "Mentors set their course prices independently. The platform does not interfere with content pricing." },
    { label: "Platform commission", desc: "The platform receives a defined commission on each successful sale in exchange for the technical and operational services provided." },
    { label: "Currency", desc: "All prices are shown in Egyptian Pounds (EGP) unless otherwise stated." },
  ]},
  { title: "Refund policy", content: `Refunds are governed by the platform's Refund Policy. For full details, please see the Refund Policy page or contact support.` },
  { title: "Acceptable use", content: "All users agree not to:", list: [
    { label: "Misuse the platform", desc: "Use the platform in any way that harms the platform or other users, or conflicts with its intended purpose." },
    { label: "Prohibited content", desc: "Upload or publish any unlawful or offensive content, or content that violates the rights of others." },
    { label: "Hacking and tampering", desc: "Attempt unauthorized access to platform systems, tamper with them, or damage the infrastructure." },
    { label: "Unauthorized sharing", desc: "Share login credentials or paid content with unauthorized parties." },
  ]},
  { title: "Intellectual property", content: null, list: [
    { label: "Content ownership", desc: "Educational content (courses, videos, files) is owned by the content provider (mentor) and protected by IP rights." },
    { label: "Platform rights", desc: "The Ebdaey brand, platform design, and codebase are owned by Ebdaey." },
    { label: "No republishing", desc: "No user may republish, resell, distribute, or copy content from the platform without prior written permission from the content owner." },
  ]},
  { title: "Account suspension", content: `Ebdaey reserves the right to restrict, suspend, or terminate any account in case of a breach of these Terms, misuse of the platform, or activity that harms the platform or its users. Users will be notified of the reasons where possible.` },
  { title: "Limitation of liability", content: "As a technical intermediary, Ebdaey is not liable for:", list: [
    { label: "Course content", desc: "Any information or materials provided by mentors through the platform." },
    { label: "Outcomes of use", desc: "Any results or expectations associated with the use of any course." },
    { label: "Indirect damages", desc: "Any direct or indirect losses arising from the use of the platform or the content available on it." },
    { label: "Third-party services", desc: "Any issues related to services or systems of third parties, such as payment gateways." },
  ]},
  { title: "Third-party integrations (Zoom and Google Calendar)", content: "Live courses, consultations, and session bundles may be delivered through Zoom, and mentors may sync bookings to Google Calendar:", list: [
    { label: "Optional connection", desc: "Only mentors connect Zoom or Google Calendar, through the provider's official consent screen, and may disconnect at any time from the mentor dashboard. Students never connect an account." },
    { label: "Provider terms apply", desc: "Meetings hosted on Zoom are also subject to Zoom's own terms and privacy policy. Ebdaey is not responsible for outages or changes in third-party services." },
    { label: "Meeting conduct", desc: "The mentor is the host and controls the meeting, including the waiting room, muting, and recording. Students may not record, redistribute, or share meeting links without the mentor's permission." },
    { label: "Data handling", desc: "The data we access from these providers, and how to revoke access, is described in our Privacy Policy." },
  ]},
  { title: "Changes to the Terms", content: `Ebdaey reserves the right to modify or update these Terms at any time. Changes will be posted on this page and the last-updated date will be revised. Continued use of the platform after changes are posted means you accept the updated Terms. Please review this page periodically.` },

  { title: "Contact us", content: `If you have any questions about these Terms & Conditions, you can reach us via:`, contacts: [{ label: "Email", value: "support@ebdaey.com" }] },
];

const TermsConditions = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const sections = isEn ? sectionsEn : sectionsAr;
  const dir = isEn ? "ltr" : "rtl";
  const borderSide = isEn ? "border-l-4 pl-3" : "border-r-4 pr-3";
  const listPad = isEn ? "pl-2" : "pr-2";

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title={isEn ? "Terms & Conditions | Ebdaey" : "الشروط والأحكام | إبداعي"}
        description={isEn
          ? "Terms and Conditions for using the Ebdaey platform to sell courses and digital products."
          : "الشروط والأحكام لاستخدام منصة إبداعي لبيع الكورسات والمنتجات الرقمية."}
        path="/terms"
      />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {isEn ? "Terms & Conditions" : "الشروط والأحكام"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEn ? "Last updated: " : "آخر تحديث: "}
            {new Date().toLocaleDateString(isEn ? "en-US" : "ar-EG", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className={`text-xl font-bold text-foreground border-primary ${borderSide}`}>
                {section.title}
              </h2>

              {section.content && (
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {section.content}
                </p>
              )}

              {section.list && (
                <ul className={`space-y-3 ${listPad}`}>
                  {section.list.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground text-sm">{item.label}: </span>
                        <span className="text-muted-foreground text-sm">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {section.note && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <p className="text-sm text-foreground font-medium">{section.note}</p>
                </div>
              )}

              {section.contacts && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  {section.contacts.map((c, i) => (
                    <p key={i} className="text-sm text-foreground">
                      <span className="font-semibold">{c.label}: </span>
                      <a href={`mailto:${c.value}`} className="text-primary hover:underline">{c.value}</a>
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            {isEn ? (
              <>
                By using Ebdaey, you agree to these Terms & Conditions and our
                <Link to="/privacy-policy" className="text-primary hover:underline mx-1">Privacy Policy</Link>.
              </>
            ) : (
              <>
                باستخدامك لمنصة إبداعي، فإنك توافق على هذه الشروط والأحكام و
                <Link to="/privacy-policy" className="text-primary hover:underline mx-1">سياسة الخصوصية</Link>
                الخاصة بالمنصة.
              </>
            )}
          </p>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default TermsConditions;
