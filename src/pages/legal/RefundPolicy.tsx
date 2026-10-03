import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/common/SeoHead";
import { useTranslation } from "react-i18next";

type Section = {
  title: string;
  content?: string | null;
  list?: { label: string; desc: string }[];
  steps?: { num: string; text: string }[];
  contacts?: { label: string; value: string }[];
};

const sectionsAr: Section[] = [
  { title: "مقدمة", content: `رضا مستخدمينا يمثل أولوية قصوى لدينا في منصة إبداعي. نحن ندرك أنه في بعض الأحيان قد لا يلبي المنتج التعليمي توقعاتك، ولهذا وضعنا سياسة استرجاع واضحة وعادلة تحمي حقوق جميع الأطراف. توضح هذه السياسة الشروط والإجراءات المتعلقة بطلبات استرداد المبالغ المدفوعة على المنصة.` },
  { title: "أهلية الاسترجاع", content: "يمكنك طلب استرجاع المبلغ المدفوع وفقاً للشروط التالية:", list: [
    { label: "المدة الزمنية", desc: "يجب تقديم طلب الاسترجاع خلال 3 أيام من تاريخ الشراء." },
    { label: "تقديم سبب واضح", desc: "يجب توضيح سبب طلب الاسترجاع بشكل محدد عند التواصل مع فريق الدعم." },
    { label: "نسبة الاستهلاك", desc: "يجب ألا يكون المستخدم قد استهلك أكثر من 25٪ من محتوى الدورة." },
  ]},
  { title: "حالات لا يُقبل فيها الاسترجاع", content: "لا يتم قبول طلبات الاسترجاع في الحالات التالية:", list: [
    { label: "استهلاك المحتوى", desc: "إذا تم مشاهدة أو الوصول إلى أكثر من 25٪ من محتوى الدورة التعليمية." },
    { label: "تحميل المواد", desc: "إذا تم تحميل المواد التعليمية المرفقة بالكامل (ملفات، مستندات، أو موارد قابلة للتنزيل)." },
    { label: "انتهاء المدة", desc: "إذا مر أكثر من 3 أيام على تاريخ الشراء." },
    { label: "إساءة الاستخدام", desc: "إذا ثبت أن المستخدم يسيء استخدام سياسة الاسترداد، مثل الشراء والاسترداد المتكرر بهدف الوصول المجاني للمحتوى." },
    { label: "طلبات متكررة", desc: "إذا قدم المستخدم طلبات استرجاع متكررة غير مبررة لدورات مختلفة." },
    { label: "مخالفة الشروط", desc: "إذا كان المستخدم قد خالف شروط وأحكام المنصة." },
  ]},
  { title: "إجراءات طلب الاسترجاع", content: "للتقدم بطلب استرجاع، يُرجى اتباع الخطوات التالية:", steps: [
    { num: "١", text: "تواصل مع فريق الدعم عبر البريد الإلكتروني مع ذكر اسمك، البريد الإلكتروني المسجل به، واسم الدورة." },
    { num: "٢", text: "وضّح سبب طلب الاسترجاع بشكل مفصل." },
    { num: "٣", text: "سيقوم فريقنا بمراجعة طلبك والتحقق من استيفاء شروط الاسترجاع." },
    { num: "٤", text: "سيتم الرد عليك خلال 3 أيام عمل بقرار القبول أو الرفض مع التوضيح." },
  ]},
  { title: "طريقة استرداد المبلغ", content: null, list: [
    { label: "وسيلة الدفع الأصلية", desc: "يتم استرداد المبلغ إلى نفس وسيلة الدفع التي تم استخدامها عند الشراء (بطاقة ائتمانية أو محفظة إلكترونية)." },
    { label: "حالات استثنائية", desc: "في بعض الحالات، قد يتم الاسترداد بطريقة بديلة حسب ما تحدده المنصة بالتنسيق مع المستخدم." },
    { label: "رسوم بوابة الدفع", desc: "قد يتم خصم رسوم المعاملة الخاصة ببوابة الدفع من المبلغ المسترد، وهي رسوم خارجة عن سيطرة المنصة." },
  ]},
  { title: "دور المنصة", content: `تعمل منصة إبداعي كوسيط تقني بين المدرب (مقدم المحتوى) والطالب (المشتري). قرارات الاسترجاع تخضع لسياسات المنصة وتُتخذ بناءً على مراجعة كل حالة على حدة، مع مراعاة حقوق جميع الأطراف.` },
  { title: "مدة المعالجة", content: null, list: [
    { label: "مراجعة الطلب", desc: "يتم مراجعة طلبات الاسترجاع خلال 3 أيام عمل من تاريخ استلام الطلب." },
    { label: "تنفيذ الاسترداد", desc: "في حالة الموافقة، يتم تنفيذ عملية الاسترداد خلال 5 إلى 10 أيام عمل، حسب الجهة المصدرة لوسيلة الدفع." },
  ]},
  { title: "حق الرفض", content: `تحتفظ منصة إبداعي بالحق في رفض أي طلب استرداد إذا ثبت وجود إساءة استخدام لسياسة الاسترداد، أو محاولة احتيال، أو عدم استيفاء الشروط المذكورة أعلاه. في حالة الرفض، سيتم إبلاغ المستخدم بالأسباب بشكل واضح.` },
  { title: "التواصل معنا", content: `لتقديم طلب استرجاع أو لأي استفسار حول هذه السياسة، يمكنك التواصل معنا عبر:`, contacts: [{ label: "البريد الإلكتروني", value: "support@ebdaey.com" }] },
];

const sectionsEn: Section[] = [
  { title: "Introduction", content: `User satisfaction is a top priority for us at Ebdaey. We understand that a product may sometimes not meet your expectations, which is why we have put in place a clear and fair refund policy that protects the rights of all parties. This policy explains the terms and procedures for refund requests on the platform.` },
  { title: "Refund eligibility", content: "You may request a refund under the following conditions:", list: [
    { label: "Time window", desc: "Refund requests must be submitted within 3 days of the purchase date." },
    { label: "Clear reason", desc: "You must clearly explain the reason for the refund request when contacting support." },
    { label: "Consumption limit", desc: "You must not have consumed more than 25% of the course content." },
  ]},
  { title: "Cases where refunds are not accepted", content: "Refund requests are not accepted in the following cases:", list: [
    { label: "Content consumption", desc: "If more than 25% of the course content has been watched or accessed." },
    { label: "Materials downloaded", desc: "If the attached educational materials have been fully downloaded (files, documents, or downloadable resources)." },
    { label: "Window expired", desc: "If more than 3 days have passed since the purchase date." },
    { label: "Abuse", desc: "If it is proven that the user is abusing the refund policy, such as repeatedly buying and refunding to gain free access." },
    { label: "Repeated requests", desc: "If the user has made repeated, unjustified refund requests across different courses." },
    { label: "Terms violation", desc: "If the user has violated the platform's Terms & Conditions." },
  ]},
  { title: "How to request a refund", content: "To submit a refund request, follow these steps:", steps: [
    { num: "1", text: "Contact the support team by email with your name, registered email, and the course name." },
    { num: "2", text: "Explain the reason for the refund request in detail." },
    { num: "3", text: "Our team will review your request and verify eligibility." },
    { num: "4", text: "You will receive a decision (approval or rejection with reasoning) within 3 business days." },
  ]},
  { title: "Refund method", content: null, list: [
    { label: "Original payment method", desc: "Refunds are issued to the same payment method used for the purchase (credit card or e-wallet)." },
    { label: "Exceptions", desc: "In some cases, refunds may be issued via an alternative method as arranged by the platform with the user." },
    { label: "Gateway fees", desc: "Payment gateway transaction fees may be deducted from the refunded amount; these fees are outside the platform's control." },
  ]},
  { title: "Role of the platform", content: `Ebdaey acts as a technical intermediary between the mentor (content provider) and the student (buyer). Refund decisions follow the platform's policies and are made on a case-by-case basis, taking into account the rights of all parties.` },
  { title: "Processing time", content: null, list: [
    { label: "Request review", desc: "Refund requests are reviewed within 3 business days of receipt." },
    { label: "Refund execution", desc: "Once approved, the refund is executed within 5 to 10 business days, depending on the payment method's issuer." },
  ]},
  { title: "Right to refuse", content: `Ebdaey reserves the right to refuse any refund request if abuse, fraud, or failure to meet the above conditions is established. If refused, the user will be clearly informed of the reasons.` },
  { title: "Contact us", content: `To submit a refund request or ask about this policy, you can reach us via:`, contacts: [{ label: "Email", value: "support@ebdaey.com" }] },
];

const RefundPolicy = () => {
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
        title={isEn ? "Refund Policy | Ebdaey" : "سياسة الاسترداد | إبداعي"}
        description={isEn
          ? "Conditions and procedures for refund requests on the Ebdaey platform."
          : "شروط وإجراءات طلبات استرداد المبالغ المدفوعة على منصة إبداعي."}
        path="/refund-policy"
      />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {isEn ? "Refund Policy" : "سياسة الاسترداد"}
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
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{section.content}</p>
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

              {section.steps && (
                <div className={`space-y-3 ${listPad}`}>
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {step.num}
                      </span>
                      <p className="text-muted-foreground text-sm pt-1">{step.text}</p>
                    </div>
                  ))}
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
                By using Ebdaey, you agree to this Refund Policy, our
                <Link to="/terms" className="text-primary hover:underline mx-1">Terms & Conditions</Link>
                and
                <Link to="/privacy-policy" className="text-primary hover:underline mx-1">Privacy Policy</Link>.
              </>
            ) : (
              <>
                باستخدامك لمنصة إبداعي، فإنك توافق على سياسة الاسترداد هذه و
                <Link to="/terms" className="text-primary hover:underline mx-1">الشروط والأحكام</Link>
                و
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

export default RefundPolicy;
