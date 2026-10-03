import SiteNavbar from "@/components/common/SiteNavbar";
import HomeFooter from "@/components/home/HomeFooter";
import { SeoHead } from "@/components/common/SeoHead";
import { useTranslation } from "react-i18next";

type Section = {
  title: string;
  content?: string | null;
  list?: { label: string; desc: string }[];
  contacts?: { label: string; value: string }[];
};

const sectionsAr: Section[] = [
  {
    title: "مقدمة",
    content: `منصة "إبداعي" هي سوق إلكتروني يتيح للمدربين والمعلمين بيع الدورات التعليمية والمنتجات الرقمية، ويتيح للطلاب الوصول إلى محتوى تعليمي متميز. نحن في إبداعي نلتزم بحماية خصوصية مستخدمينا وضمان أمان بياناتهم الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية المعلومات التي تقدمها لنا عند استخدام المنصة.`,
  },
  {
    title: "البيانات التي نجمعها",
    content: null,
    list: [
      { label: "الاسم الكامل", desc: "يُستخدم لإنشاء حسابك وتخصيص تجربتك على المنصة." },
      { label: "البريد الإلكتروني", desc: "يُستخدم لتسجيل الدخول والتواصل معك بخصوص طلباتك ودوراتك." },
      { label: "رقم الهاتف", desc: "يُستخدم للتواصل معك عند الحاجة وتأكيد العمليات." },
      { label: "بيانات الدفع", desc: "تتم معالجة عمليات الدفع بالكامل من خلال بوابة دفع آمنة تابعة لطرف ثالث. لا نقوم بتخزين بيانات بطاقتك الائتمانية على خوادمنا." },
      { label: "بيانات الاستخدام", desc: "قد نجمع معلومات حول كيفية تفاعلك مع المنصة لتحسين تجربة المستخدم، مثل الصفحات التي تزورها ومدة استخدامك." },
    ],
  },
  {
    title: "كيف نستخدم بياناتك",
    content: "نستخدم البيانات التي نجمعها للأغراض التالية:",
    list: [
      { label: "معالجة المشتريات", desc: "إتمام عمليات الشراء وتأكيد الطلبات وإصدار الفواتير." },
      { label: "توفير الوصول للدورات", desc: "منحك إمكانية الوصول إلى الدورات والمحتوى الذي اشتركت فيه." },
      { label: "التواصل معك", desc: "إرسال إشعارات مهمة تتعلق بحسابك أو طلباتك أو تحديثات المنصة." },
      { label: "تحسين تجربة المستخدم", desc: "تطوير وتحسين خدماتنا بناءً على أنماط الاستخدام وملاحظات المستخدمين." },
    ],
  },
  {
    title: "مشاركة البيانات",
    content: `نحن لا نبيع بياناتك الشخصية لأي طرف ثالث تحت أي ظرف من الظروف. قد نشارك بياناتك فقط في الحالات التالية:`,
    list: [
      { label: "بوابة الدفع", desc: "تتم مشاركة البيانات اللازمة لإتمام عمليات الدفع مع مزود خدمة الدفع الإلكتروني المعتمد لدينا." },
      { label: "مزودي الخدمات", desc: "قد نشارك بيانات محدودة مع مزودي خدمات موثوقين يساعدوننا في تشغيل المنصة، وذلك في حدود ما هو ضروري فقط." },
    ],
  },
  {
    title: "حماية البيانات",
    content: `نتخذ إجراءات أمنية مناسبة لحماية بياناتك الشخصية من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. تشمل هذه الإجراءات تشفير البيانات أثناء النقل، واستخدام بروتوكولات أمان حديثة، ومراجعة دورية لأنظمتنا الأمنية.`,
  },
  {
    title: "ملفات تعريف الارتباط (Cookies)",
    content: `قد تستخدم المنصة ملفات تعريف الارتباط وتقنيات مشابهة لتحسين تجربتك على الموقع، مثل تذكر تفضيلاتك وتسهيل عملية تسجيل الدخول. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من خلال متصفحك في أي وقت.`,
  },
  {
    title: "حقوق المستخدم وكيفية استخدامها",
    content: "يحق لك كمستخدم (صاحب البيانات):",
    list: [
      { label: "طلب الوصول إلى بياناتك", desc: "يمكنك طلب نسخة من البيانات الشخصية المحفوظة لدينا." },
      { label: "طلب تعديل بياناتك", desc: "يمكنك تحديث أو تصحيح معلوماتك الشخصية في أي وقت من لوحة التحكم أو بالتواصل معنا." },
      { label: "طلب حذف بياناتك", desc: "يمكنك طلب حذف حسابك وبياناتك الشخصية من المنصة." },
      { label: "الاعتراض أو تقييد المعالجة", desc: "يمكنك الاعتراض على معالجة بياناتك أو طلب تقييدها، وسحب أي موافقة منحتها سابقاً (مثل ربط أحد التطبيقات)." },
      { label: "نقل البيانات", desc: "يمكنك طلب بياناتك في صيغة قابلة للنقل والقراءة الآلية." },
      { label: "كيفية تنفيذ هذه الحقوق", desc: "أرسل بريداً إلى support@ebdaey.com من البريد المسجّل في حسابك، أو استخدم صفحة التواصل https://ebdaey.com/contact. نستجيب للطلبات الموثّقة خلال 30 يوماً كحد أقصى ودون أي مقابل. وإذا لم تكن راضياً عن ردنا، يحق لك تقديم شكوى إلى الجهة المختصة بحماية البيانات في بلدك." },
    ],
  },
  {
    title: "ربط حساب Zoom (بيانات مستخدمي Zoom)",
    content: `يستطيع المدرب (المنتور) اختيارياً ربط حسابه في Zoom بلوحة تحكمه في إبداعي، لتُعقد جلسات الكورسات المباشرة والاستشارات وباقات الجلسات كاجتماعات Zoom. الربط اختياري بالكامل ولا يتم إلا عبر شاشة موافقة Zoom الرسمية، ويمكن إلغاؤه في أي وقت، ولا يقوم الطالب بربط حساب Zoom أبداً. عند الربط نطلب الأذونات (Scopes) التالية فقط:`,
    list: [
      { label: "user:read:user", desc: "يُستخدم مرة واحدة عند الربط لقراءة معرّف حساب Zoom (والبريد) للحساب المرتبط، حتى تُنشأ الاجتماعات باسم المضيف الصحيح." },
      { label: "meeting:write:meeting", desc: "لإنشاء اجتماع Zoom مجدول عند نشر جلسة كورس مباشر أو استشارة أو حجز من باقة جلسات، والحصول على رابط الانضمام الذي يُشارك مع الطلاب المشتركين." },
    ],
  },
  {
    title: "ما نخزّنه من بيانات Zoom وإلغاء الربط",
    content: null,
    list: [
      { label: "ما نخزّنه", desc: "معرّف حساب Zoom المرتبط، ورموز الوصول والتحديث (OAuth) مشفّرة، ومعرّف الاجتماع ورابط الانضمام ورابط بدء الاجتماع لكل اجتماع أنشأه تطبيقنا." },
      { label: "ما لا نخزّنه", desc: "لا نصل إلى أو نخزّن التسجيلات أو النصوص أو رسائل المحادثة أو صوت وفيديو المشاركين أو جهات الاتصال أو إعدادات حسابك في Zoom. ولا نقرأ أو نعدّل إلا الاجتماعات التي أنشأها تطبيقنا." },
      { label: "لا بيع ولا إعلانات", desc: "لا تُبَاع بيانات Zoom ولا تُستخدم للإعلانات ولا لتدريب أي نماذج ذكاء اصطناعي." },
      { label: "إلغاء الربط", desc: "يمكن للمدرب فصل Zoom من لوحة التحكم (التكاملات ← Zoom ← فصل)، أو إزالة تطبيق إبداعي من https://marketplace.zoom.us/user/installed. عند الفصل نُلغي ونحذف الرموز المخزّنة فوراً، وتُحذف بيانات الاجتماعات مع سجلات الكورس أو الحجز المرتبطة بها." },
    ],
  },

  {
    title: "ربط حساب Google Calendar (بيانات مستخدمي Google)",
    content: `يستطيع المدرب (المنتور) اختيارياً ربط حسابه في Google Calendar بلوحة تحكمه في إبداعي، وذلك لمزامنة مواعيد الاستشارات والجلسات المباشرة التي يحجزها الطلاب. الربط اختياري بالكامل ولا يتم إلا بموافقة صريحة من المدرب عبر شاشة موافقة Google الرسمية، ولا يقوم الطالب بربط حسابه في Google أبداً. عند الربط نطلب الأذونات (Scopes) التالية فقط:`,
    list: [
      { label: "https://www.googleapis.com/auth/calendar.events", desc: "لإنشاء موعد في تقويم المدرب عند حجز الطالب لاستشارة أو جلسة، وتحديثه عند تغيير الموعد أو المدة، وحذفه عند الإلغاء أو الاسترداد. لا نقرأ ولا نعدّل أي مواعيد لم ينشئها تطبيقنا." },
      { label: "https://www.googleapis.com/auth/calendar.events.freebusy", desc: "لقراءة أوقات الانشغال (وقت البداية والنهاية فقط، دون أي تفاصيل أو عناوين للمواعيد) لإخفاء الأوقات غير المتاحة من صفحة الحجز." },
      { label: "https://www.googleapis.com/auth/calendar.calendarlist.readonly", desc: "لعرض قائمة تقاويم المدرب حتى يختار التقويم الذي ستُضاف إليه المواعيد." },
      { label: "https://www.googleapis.com/auth/userinfo.email", desc: "لعرض بريد حساب Google المرتبط داخل لوحة التحكم لتأكيد الحساب الصحيح." },
    ],
  },
  {
    title: "ما نخزّنه من بيانات Google وما لا نخزّنه",
    content: null,
    list: [
      { label: "ما نخزّنه", desc: "بريد حساب Google المرتبط، ومعرّف التقويم المختار، ومعرّف الموعد (Event ID) الخاص بكل حجز أنشأه تطبيقنا، ورمز وصول مُشفّر لازم لاستمرار المزامنة." },
      { label: "ما لا نخزّنه", desc: "لا نخزّن محتوى تقويمك ولا عناوين أو تفاصيل أو حضور المواعيد الأخرى، ولا نُنشئ نسخة من تقويمك على خوادمنا." },
      { label: "لا استخدام إعلاني", desc: "لا نستخدم بيانات Google للإعلانات، ولا نبيعها، ولا نشاركها مع أي طرف ثالث، ولا نستخدمها لتدريب أي نماذج ذكاء اصطناعي عامة أو مخصصة." },
      { label: "الوصول البشري", desc: "لا يطّلع أي فرد من فريقنا على بيانات Google الخاصة بك إلا بموافقتك الصريحة، أو للأمن، أو للالتزام بالقانون، أو لمعالجة خلل تقني محدد." },
      { label: "الاستخدام المحدود (Limited Use)", desc: "استخدام ونقل المعلومات المستلمة من واجهات Google API يتوافق مع سياسة بيانات مستخدمي خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use)." },
    ],
  },
  {
    title: "إلغاء الربط والاحتفاظ بالبيانات",
    content: `يمكن للمدرب فصل حساب Google Calendar في أي وقت من لوحة التحكم (الإعدادات ← التقويم)، أو من صفحة أذونات حساب Google على https://myaccount.google.com/permissions. عند الفصل نحذف رموز الوصول ومعرّف التقويم من قواعد بياناتنا فوراً وتتوقف المزامنة. نحتفظ ببيانات الحساب الأخرى طوال مدة استخدامك للمنصة، ويتم حذفها خلال 30 يوماً من طلب حذف الحساب، فيما عدا السجلات المالية التي يلزمنا القانون بالاحتفاظ بها.`,
  },
  {
    title: "التواصل معنا",
    content: `إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه أو كيفية تعاملنا مع بياناتك، يمكنك التواصل معنا عبر:`,
    contacts: [{ label: "البريد الإلكتروني", value: "support@ebdaey.com" }],
  },
  {
    title: "تحديثات سياسة الخصوصية",
    content: `قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو لأسباب تشغيلية أو قانونية. في حالة إجراء تغييرات جوهرية، سنقوم بإشعارك عبر البريد الإلكتروني أو من خلال إشعار بارز على المنصة. ننصحك بمراجعة هذه الصفحة بشكل دوري للاطلاع على أي تحديثات.`,
  },
];


const sectionsEn: Section[] = [
  {
    title: "Introduction",
    content: `Ebdaey is an online marketplace that enables mentors and instructors to sell courses and digital products, and allows students to access high-quality educational content. At Ebdaey we are committed to protecting our users' privacy and keeping their personal data secure. This Privacy Policy explains how we collect, use, and protect the information you provide when using the platform.`,
  },
  {
    title: "Data we collect",
    content: null,
    list: [
      { label: "Full name", desc: "Used to create your account and personalize your experience on the platform." },
      { label: "Email address", desc: "Used to sign you in and to contact you about your orders and courses." },
      { label: "Phone number", desc: "Used to reach you when needed and to confirm transactions." },
      { label: "Payment data", desc: "All payments are processed by a secure third-party payment gateway. We do not store your card details on our servers." },
      { label: "Usage data", desc: "We may collect information about how you interact with the platform — such as the pages you visit and time spent — to improve the user experience." },
    ],
  },
  {
    title: "How we use your data",
    content: "We use the data we collect for the following purposes:",
    list: [
      { label: "Processing purchases", desc: "Completing purchases, confirming orders, and issuing invoices." },
      { label: "Providing course access", desc: "Giving you access to the courses and content you have enrolled in." },
      { label: "Communicating with you", desc: "Sending important notifications about your account, orders, or platform updates." },
      { label: "Improving the experience", desc: "Developing and enhancing our services based on usage patterns and user feedback." },
    ],
  },
  {
    title: "Data sharing",
    content: `We do not sell your personal data to any third party under any circumstances. We may share your data only in the following cases:`,
    list: [
      { label: "Payment gateway", desc: "The data required to complete payments is shared with our approved online payment provider." },
      { label: "Service providers", desc: "We may share limited data with trusted service providers that help us run the platform, strictly as needed." },
    ],
  },
  {
    title: "Data protection",
    content: `We take appropriate security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. These measures include encryption in transit, modern security protocols, and periodic reviews of our systems.`,
  },
  {
    title: "Cookies",
    content: `The platform may use cookies and similar technologies to improve your experience, such as remembering your preferences and simplifying sign-in. You can control cookie settings from your browser at any time.`,
  },
  {
    title: "Your rights and how to exercise them",
    content: "As a user (data subject), you have the right to:",
    list: [
      { label: "Request access to your data", desc: "You may request a copy of the personal data we hold about you." },
      { label: "Request corrections", desc: "You may update or correct your personal information at any time from your dashboard or by contacting us." },
      { label: "Request deletion", desc: "You may request deletion of your account and personal data from the platform." },
      { label: "Object or restrict processing", desc: "You may object to, or ask us to restrict, processing of your data, and withdraw any consent you previously gave (for example, an integration connection)." },
      { label: "Data portability", desc: "You may request your data in a portable, machine-readable format." },
      { label: "How to exercise these rights", desc: "Email support@ebdaey.com from the address registered on your account, or use our contact page at https://ebdaey.com/contact. We respond to verified requests within 30 days at the latest and never charge a fee. If you are unsatisfied with our response, you may lodge a complaint with your local data protection authority." },
    ],
  },
  {
    title: "Zoom connection (Zoom user data)",
    content: `Mentors may optionally connect their own Zoom account to their Ebdaey dashboard so that live course sessions, consultations, and session bundles are hosted as Zoom meetings. The connection is optional, is granted only through Zoom's official OAuth consent screen, and can be revoked at any time. Students never connect a Zoom account. When a mentor connects, we request only the following scopes:`,
    list: [
      { label: "user:read:user", desc: "Called once during connection to read the Zoom account ID (and email) of the account being linked, so meetings are created under the correct host." },
      { label: "meeting:write:meeting", desc: "To create the scheduled Zoom meeting when a mentor publishes a live course session, consultation, or session bundle booking, and to obtain the join URL shared with enrolled students." },
    ],
  },
  {
    title: "What Zoom data we store — and what we never store",
    content: null,
    list: [
      { label: "What we store", desc: "The connected Zoom account ID, encrypted OAuth access and refresh tokens, and the meeting ID, join URL, and host start URL of each meeting our app created." },
      { label: "What we never store", desc: "We never access or store recordings, cloud transcripts, chat messages, participant audio/video, contacts, registrants, or your Zoom account settings. We only ever read or modify meetings our app created." },
      { label: "No advertising, no selling", desc: "Zoom user data is never sold, never used for advertising, and never used to train AI models." },
      { label: "Revoking access", desc: "A mentor can disconnect Zoom from the dashboard (Integrations → Zoom → Disconnect), or remove the Ebdaey app from https://marketplace.zoom.us/user/installed. On disconnect we revoke and delete the stored tokens immediately; meeting metadata for past sessions is deleted with the related course or booking records." },
    ],
  },

  {
    title: "Google Calendar connection (Google user data)",
    content: `Mentors may optionally connect their own Google Calendar account to their Ebdaey dashboard so that consultations and live sessions booked by students are synced to their calendar. The connection is entirely optional, is granted only through Google's official consent screen, and can be revoked at any time. Students never connect a Google account. When a mentor connects, we request only the following scopes:`,
    list: [
      { label: "https://www.googleapis.com/auth/calendar.events", desc: "To create an event in the mentor's calendar when a student books a paid consultation or session, update that event when the time or duration changes, and delete it when the booking is cancelled or refunded. We never read or modify events our app did not create." },
      { label: "https://www.googleapis.com/auth/calendar.events.freebusy", desc: "To read busy time ranges only (start and end times, with no event titles, details, or attendees) so unavailable slots are hidden on the public booking page." },
      { label: "https://www.googleapis.com/auth/calendar.calendarlist.readonly", desc: "To list the mentor's calendars so they can choose which calendar booking events are written to." },
      { label: "https://www.googleapis.com/auth/userinfo.email", desc: "To display the connected Google account email in the dashboard so the mentor can confirm the correct account is linked." },
    ],
  },
  {
    title: "What Google data we store — and what we never store",
    content: null,
    list: [
      { label: "What we store", desc: "The connected Google account email, the selected calendar ID, the Google event ID of each booking our app created, and an encrypted access credential required to keep the sync working." },
      { label: "What we never store", desc: "We do not store your calendar contents, nor the titles, descriptions, or attendees of any other events. We never create a copy of your calendar on our servers." },
      { label: "No advertising, no selling", desc: "Google user data is never used for advertising, never sold, never shared with third parties, and never used to train generalized or personalized AI/ML models." },
      { label: "Human access", desc: "No Ebdaey staff member reads your Google data except with your explicit consent, for security purposes, to comply with applicable law, or to resolve a specific technical fault you report." },
      { label: "Limited Use compliance", desc: "Ebdaey's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements." },
    ],
  },
  {
    title: "Revoking access and data retention",
    content: `A mentor can disconnect Google Calendar at any time from the dashboard (Settings → Calendar), or from Google account permissions at https://myaccount.google.com/permissions. On disconnect we immediately delete the stored access credential and calendar ID from our database and all syncing stops. Other account data is retained while you use the platform and is deleted within 30 days of an account deletion request, except financial records we are legally required to keep.`,
  },
  {

    title: "Contact us",
    content: `If you have any questions about this Privacy Policy or how we handle your data, you can reach us via:`,
    contacts: [{ label: "Email", value: "support@ebdaey.com" }],
  },
  {
    title: "Updates to this policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or for operational or legal reasons. If we make material changes, we will notify you via email or with a prominent notice on the platform. We recommend reviewing this page periodically.`,
  },
];

const PrivacyPolicy = () => {
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
        title={isEn ? "Privacy Policy | Ebdaey" : "سياسة الخصوصية | إبداعي"}
        description={isEn
          ? "How Ebdaey collects, uses, and protects the personal data of its users."
          : "كيفية جمع وحماية بيانات مستخدمي منصة إبداعي وضمان خصوصيتهم."}
        path="/privacy-policy"
      />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {isEn ? "Privacy Policy" : "سياسة الخصوصية"}
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

        {!isEn && (
          <section dir="ltr" className="mt-12 space-y-4 text-left">
            <h2 className="text-xl font-bold text-foreground border-l-4 border-primary pl-3">
              Google User Data Disclosure (English)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ebdaey (ebdaey.com) is an online course and consultation platform. Mentors may optionally
              connect their own Google Calendar so that consultations and live sessions booked and paid
              for by students on Ebdaey are written to their calendar. Students never connect a Google
              account. Access is granted only through Google's official consent screen and can be revoked
              at any time.
            </p>
            <ul className="space-y-3 pl-2">
              {[
                ["calendar.events", "Create an event when a student books a session, update it when the time or duration changes, and delete it when the booking is cancelled or refunded. We never read or modify events our app did not create."],
                ["calendar.events.freebusy", "Read busy time ranges only (start/end times, no titles, details, or attendees) to hide unavailable slots on the booking page."],
                ["calendar.calendarlist.readonly", "List the mentor's calendars so they can pick which calendar events are written to."],
                ["userinfo.email", "Show the connected Google account email in the mentor dashboard."],
              ].map(([scope, desc]) => (
                <li key={scope} className="flex gap-3 items-start">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground text-sm">{scope}: </span>
                    <span className="text-muted-foreground text-sm">{desc}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We store only the connected Google account email, the selected calendar ID, the Google event
              ID of bookings our app created, and an encrypted access credential. We never store your
              calendar contents. Google user data is never sold, never used for advertising, and never used
              to train generalized or personalized AI/ML models. Ebdaey's use and transfer of information
              received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Mentors can disconnect at any time from the
              dashboard or at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                myaccount.google.com/permissions
              </a>
              ; stored credentials are deleted immediately. Questions: support@ebdaey.com
            </p>
          </section>
        )}



        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "By using Ebdaey, you agree to this Privacy Policy."
              : "باستخدامك لمنصة إبداعي، فإنك توافق على سياسة الخصوصية هذه."}
          </p>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default PrivacyPolicy;
