import { useState } from "react";
import { Plus, Trash2, GripVertical, HelpCircle, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import IconPicker from "./IconPicker";
import RichTextEditor from "./RichTextEditor";

interface LandingFeature {
  text: string;
  icon: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface LandingSettingsEditorProps {
  header: string;
  subheader: string;
  headerColor: string;
  subheaderColor: string;
  headerSize: string;
  subheaderSize: string;
  features: LandingFeature[];
  communityLink: string;
  faqs: FaqItem[];
  onHeaderChange: (v: string) => void;
  onSubheaderChange: (v: string) => void;
  onHeaderColorChange: (v: string) => void;
  onSubheaderColorChange: (v: string) => void;
  onHeaderSizeChange: (v: string) => void;
  onSubheaderSizeChange: (v: string) => void;
  onFeaturesChange: (v: LandingFeature[]) => void;
  onCommunityLinkChange: (v: string) => void;
  onFaqsChange: (v: FaqItem[]) => void;
}


const LandingSettingsEditor = ({
  header, subheader, headerColor, subheaderColor,
  headerSize, subheaderSize, features,
  communityLink, faqs,
  onHeaderChange, onSubheaderChange, onHeaderColorChange,
  onSubheaderColorChange, onHeaderSizeChange, onSubheaderSizeChange,
  onFeaturesChange, onCommunityLinkChange, onFaqsChange,
}: LandingSettingsEditorProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const mx1 = isRtl ? "ml-1" : "mr-1";
  const fontSizes = [
    { value: "xl", label: t("landingSettings.fontSizes.small") },
    { value: "2xl", label: t("landingSettings.fontSizes.medium") },
    { value: "3xl", label: t("landingSettings.fontSizes.large") },
    { value: "4xl", label: t("landingSettings.fontSizes.xlarge") },
    { value: "5xl", label: t("landingSettings.fontSizes.huge") },
  ];

  const addFeature = () => {
    if (features.length >= 8) return;
    onFeaturesChange([...features, { text: "", icon: "Star" }]);
  };

  const updateFeature = (index: number, updates: Partial<LandingFeature>) => {
    const updated = features.map((f, i) => i === index ? { ...f, ...updates } : f);
    onFeaturesChange(updated);
  };

  const removeFeature = (index: number) => {
    onFeaturesChange(features.filter((_, i) => i !== index));
  };

  const addFaq = () => {
    if (faqs.length >= 10) return;
    onFaqsChange([...faqs, { question: "", answer: "" }]);
  };

  const updateFaq = (index: number, updates: Partial<FaqItem>) => {
    const updated = faqs.map((f, i) => i === index ? { ...f, ...updates } : f);
    onFaqsChange(updated);
  };

  const removeFaq = (index: number) => {
    onFaqsChange(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* FAQs */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("landingSettings.faqs.title")}</h2>
          </div>
          <Button onClick={addFaq} variant="outline" size="sm" disabled={faqs.length >= 10}>
            <Plus className={`w-4 h-4 ${mx1}`} />
            {t("landingSettings.faqs.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t("landingSettings.faqs.hint")}</p>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="p-4 border border-border rounded-lg bg-background space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-primary mt-2 shrink-0">{t("landingSettings.faqs.prefix")}{index + 1}</span>
                <Input
                  value={faq.question}
                  onChange={e => updateFaq(index, { question: e.target.value })}
                  placeholder={t("landingSettings.faqs.questionPlaceholder")}
                  className="flex-1 bg-background dark:bg-input"
                />
                <Button variant="ghost" size="icon" className="text-destructive shrink-0 h-8 w-8" onClick={() => removeFaq(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <RichTextEditor label={t("landingSettings.faqs.answerLabel")}
              content={faq.answer}
              onChange={val => updateFaq(index, { answer: val })}
              />
            </div>
          ))}
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t("landingSettings.faqs.empty")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingSettingsEditor;
