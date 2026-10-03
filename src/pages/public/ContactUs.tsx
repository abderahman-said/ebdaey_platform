import SiteNavbar from "@/components/common/SiteNavbar";
import SiteSocialLinks from "@/components/common/SiteSocialLinks";
import HomeFooter from "@/components/home/HomeFooter";
import { useState } from "react";
import { SeoHead } from "@/components/common/SeoHead";
import { contactPageJsonLd, organizationJsonLd } from "@/lib/siteStructuredData";
import { Mail, Phone, MessageCircle, Clock, HelpCircle, CreditCard, RefreshCw, UserCog, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const ContactUs = () => {
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const dir = isEn ? "ltr" : "rtl";
  const textAlign = isEn ? "text-start" : "text-end";

  const supportTopics = isEn
    ? [
        { icon: HelpCircle, label: "Course inquiries", color: "text-primary" },
        { icon: CreditCard, label: "Payment issues", color: "text-emerald-500" },
        { icon: RefreshCw, label: "Refund requests", color: "text-amber-500" },
        { icon: UserCog, label: "Account access issues", color: "text-sky-500" },
      ]
    : [
        { icon: HelpCircle, label: "الاستفسار عن الدورات", color: "text-primary" },
        { icon: CreditCard, label: "مشاكل الدفع", color: "text-emerald-500" },
        { icon: RefreshCw, label: "طلبات الإسترداد", color: "text-amber-500" },
        { icon: UserCog, label: "مشاكل الوصول للحساب", color: "text-sky-500" },
      ];

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({
        title: isEn ? "Please fill in all required fields" : "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: isEn ? "Message sent successfully ✅" : "تم إرسال رسالتك بنجاح ✅",
        description: isEn ? "We'll get back to you as soon as possible." : "سنرد عليك في أقرب وقت ممكن.",
      });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title={isEn ? "Contact us | Ebdaey" : "تواصل معنا | إبداعي"}
        description={isEn
          ? "Contact the Ebdaey support team for inquiries, technical support, and refund requests."
          : "تواصل مع فريق دعم منصة إبداعي للاستفسارات والدعم الفني وطلبات الاسترداد."}
        path="/contact"
        jsonLd={[contactPageJsonLd(isEn ? "en" : "ar"), organizationJsonLd(isEn ? "en" : "ar")]}
      />
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            {isEn ? "Contact us" : "تواصل معنا"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {isEn
              ? "We're here to help! If you have any question, don't hesitate to reach out to the Ebdaey support team."
              : "نحن هنا لمساعدتك! إذا كان لديك أي سؤال أو استفسار، لا تتردد في التواصل مع فريق دعم إبداعي وسنكون سعداء بخدمتك."}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-sm">{isEn ? "Email" : "البريد الإلكتروني"}</h3>
            <a href="mailto:support@ebdaey.com" className="text-primary text-sm hover:underline block">support@ebdaey.com</a>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Phone className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-bold text-foreground text-sm">{isEn ? "Phone" : "الهاتف"}</h3>
            <a href="tel:+201505925116" className="text-muted-foreground text-sm hover:text-foreground block" dir="ltr">+20 15 05925116</a>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold text-foreground text-sm">{isEn ? "WhatsApp" : "واتساب"}</h3>
            <a href="https://wa.me/201505925116" target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-foreground block" dir="ltr">+20 15 05925116</a>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <span className="text-sm font-bold text-foreground">
            {isEn ? "Follow us on" : "تابعنا على"}
          </span>
          <SiteSocialLinks variant="light" />
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {isEn ? "Send us a message" : "أرسل لنا رسالة"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {isEn ? "Name" : "الاسم"} <span className="text-destructive">*</span>
                    </label>
                    <Input name="name" value={form.name} onChange={handleChange} placeholder={isEn ? "Your full name" : "اسمك الكامل"} className={`h-11 rounded-xl ${textAlign}`} maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {isEn ? "Email" : "البريد الإلكتروني"} <span className="text-destructive">*</span>
                    </label>
                    <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com" className="h-11 rounded-xl" dir="ltr" maxLength={255} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {isEn ? "Phone" : "رقم الهاتف"} <span className="text-muted-foreground text-xs">({isEn ? "optional" : "اختياري"})</span>
                    </label>
                    <Input name="phone" value={form.phone} onChange={handleChange} placeholder="01xxxxxxxxx" className="h-11 rounded-xl" dir="ltr" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {isEn ? "Subject" : "الموضوع"} <span className="text-destructive">*</span>
                    </label>
                    <Input name="subject" value={form.subject} onChange={handleChange} placeholder={isEn ? "Message subject" : "موضوع رسالتك"} className={`h-11 rounded-xl ${textAlign}`} maxLength={200} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {isEn ? "Message" : "الرسالة"} <span className="text-destructive">*</span>
                  </label>
                  <Textarea name="message" value={form.message} onChange={handleChange} placeholder={isEn ? "Type your message here..." : "اكتب رسالتك هنا..."} className={`min-h-[120px] rounded-xl ${textAlign} resize-none`} maxLength={2000} />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-bold gap-2">
                  {loading
                    ? (isEn ? "Sending..." : "جارٍ الإرسال...")
                    : <>{isEn ? "Send message" : "إرسال الرسالة"} <Send className="w-4 h-4" /></>}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-sm">
                  {isEn ? "Expected response time" : "مدة الرد المتوقعة"}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isEn ? (
                  <>We aim to answer all inquiries within <span className="font-bold text-foreground">24 – 48 hours</span> on business days.</>
                ) : (
                  <>نسعى للرد على جميع الاستفسارات خلال <span className="font-bold text-foreground">24 – 48 ساعة</span> في أيام العمل الرسمية.</>
                )}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-foreground text-sm">
                {isEn ? "We can help you with" : "يمكننا مساعدتك في"}
              </h3>
              <div className="space-y-3">
                {supportTopics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                      <topic.icon className={`w-4 h-4 ${topic.color}`} />
                    </div>
                    <span className="text-sm text-muted-foreground">{topic.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-2xl p-5 text-center space-y-2">
              <p className="text-sm font-bold text-foreground">
                {isEn ? "We care about every message 💙" : "نهتم بكل رسالة 💙"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "The Ebdaey team is committed to providing the best support possible. Your satisfaction is our priority and we're always improving your experience."
                  : "فريق إبداعي ملتزم بتقديم أفضل دعم ممكن. رضاك هو أولويتنا ونعمل دائماً على تحسين تجربتك معنا."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default ContactUs;
