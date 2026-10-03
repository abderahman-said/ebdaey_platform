import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import certificateFrame from "@/assets/certificate-frame.png.asset.json";
import type { CertificateTemplate } from "./CertificateTemplateEditor";
import { loadCertificateFonts } from "@/lib/loadCertificateFonts";

interface CertificatePreviewProps {
  template?: CertificateTemplate;
  studentName: string;
  courseName: string;
  mentorName: string;
  /** Optional secondary line under the mentor name (personal name). */
  mentorSubName?: string;
  completionDate: string;
  certificateId: string;
  verifyUrl?: string;
  /** Overrides the auto-detected tenant theme color (any CSS color). */
  themeColor?: string;
  /** Forces the certificate copy language ("ar" | "en"); defaults to the active UI language. */
  language?: string;
}

const CERTIFICATE_WIDTH = 1476;
const CERTIFICATE_HEIGHT = 1140;
const FALLBACK_COLOR = "hsl(220 70% 50%)";

/** True when the text has no Arabic letters (i.e. an English/Latin name). */
const isLatin = (text: string) => !!text && !/[\u0600-\u06FF\u0750-\u077F]/.test(text);

const fittedSize = (text: string, base: number, min: number, idealLength: number) => {
  const length = [...(text || "")].length;
  if (length <= idealLength) return base;
  return Math.max(min, Math.round((base * idealLength) / length));
};

/** Reads the live tenant primary color so the frame follows the mentor theme. */
const resolveThemeColor = () => {
  if (typeof window === "undefined") return FALLBACK_COLOR;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return FALLBACK_COLOR;
  return raw.startsWith("hsl") || raw.startsWith("#") || raw.startsWith("rgb") ? raw : `hsl(${raw})`;
};

const CertificatePreview = ({
  studentName,
  courseName,
  mentorName,
  mentorSubName,
  completionDate,
  certificateId,
  verifyUrl,
  themeColor,
  language,
}: CertificatePreviewProps) => {
  const { t: translate, i18n } = useTranslation();
  const activeLanguage = language || i18n.language || "ar";
  // Render the certificate copy in the requested language, independent of the
  // surrounding page language.
  const t = language && !i18n.language?.startsWith(language)
    ? i18n.getFixedT(language)
    : translate;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [detectedColor, setDetectedColor] = useState<string>(FALLBACK_COLOR);

  useEffect(() => {
    loadCertificateFonts();
  }, []);

  useEffect(() => {
    if (themeColor) return;
    setDetectedColor(resolveThemeColor());
    const observer = new MutationObserver(() => setDetectedColor(resolveThemeColor()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, [themeColor]);

  const color = themeColor || detectedColor;

  useEffect(() => {
    if (!verifyUrl) {
      setQrDataUrl("");
      return;
    }

    QRCode.toDataURL(verifyUrl, {
      margin: 0,
      width: 320,
      color: { dark: "#1f2430", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [verifyUrl]);

  const formattedDate = new Date(completionDate).toLocaleDateString(
    activeLanguage.startsWith("en") ? "en-US" : "ar-EG",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const textStyle: React.CSSProperties = {
    fontFamily: "'Forma DJR Arabic', Arial, sans-serif",
    fill: "#22262f",
    textAnchor: "middle",
    dominantBaseline: "middle",
    direction: activeLanguage.startsWith("en") ? "ltr" : "rtl",
    unicodeBidi: "plaintext",
  };

  const mutedStyle: React.CSSProperties = { ...textStyle, fill: "#6b7280" };

  return (
    <div className="relative mx-auto w-full overflow-hidden">
      <svg
        data-certificate-svg="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={t("certificatePreview.ariaLabel", { course: courseName, student: studentName })}
        style={{
          display: "block",
          aspectRatio: `${CERTIFICATE_WIDTH} / ${CERTIFICATE_HEIGHT}`,
          boxShadow: "0 25px 60px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <title>{t("certificatePreview.title", { course: courseName })}</title>
        <defs>
          <filter id="qrShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
          </filter>
          <mask id="certFrameMask" maskUnits="userSpaceOnUse" x="0" y="0" width={CERTIFICATE_WIDTH} height={CERTIFICATE_HEIGHT}>
            <image
              href={certificateFrame.url}
              x="0"
              y="0"
              width={CERTIFICATE_WIDTH}
              height={CERTIFICATE_HEIGHT}
              preserveAspectRatio="none"
            />
          </mask>
        </defs>

        {/* Paper */}
        <rect x="0" y="0" width={CERTIFICATE_WIDTH} height={CERTIFICATE_HEIGHT} fill="#ffffff" />

        {/* Decorative frame, tinted with the mentor theme color */}
        <rect
          x="0"
          y="0"
          width={CERTIFICATE_WIDTH}
          height={CERTIFICATE_HEIGHT}
          fill={color}
          mask="url(#certFrameMask)"
        />

        <text x="738" y="236" fontSize="72" fontWeight="800" style={{ ...textStyle, fill: color }}>
          {t("certificatePreview.heading")}
        </text>
        <rect x="618" y="288" width="240" height="5" rx="2.5" fill={color} opacity="0.55" />

        <text x="738" y="366" fontSize="30" fontWeight="500" style={mutedStyle}>
          {t("certificatePreview.awardedTo")}
        </text>

        <text x="738" y="456" fontSize={fittedSize(studentName, 66, 42, 28)} fontWeight="800" style={textStyle}>
          {studentName}
        </text>
        <rect x="438" y="502" width="600" height="2" fill="#22262f" opacity="0.15" />

        <text x="738" y="566" fontSize="28" fontWeight="500" style={mutedStyle}>
          {t("certificatePreview.completedCourse")}
        </text>

        <text x="738" y="644" fontSize={fittedSize(courseName, 48, 30, 42)} fontWeight="800" style={{ ...textStyle, fill: color }}>
          {courseName}
        </text>

        <text x="738" y="746" fontSize="24" fontWeight="500" style={mutedStyle}>
          {t("certificatePreview.supervisedBy")}
        </text>
        <text x="738" y="800" fontSize={fittedSize(mentorName, 38, 26, 34)} fontWeight="700" style={textStyle}>
          {mentorName}
        </text>
        {mentorSubName && (
          <text
            data-signature-font={isLatin(mentorSubName) ? "latin" : "arabic"}
            x="738"
            y={isLatin(mentorSubName) ? 846 : 848}
            fontSize={fittedSize(mentorSubName, isLatin(mentorSubName) ? 44 : 38, isLatin(mentorSubName) ? 30 : 26, 40)}
            fontWeight={isLatin(mentorSubName) ? "700" : "500"}
            style={
              isLatin(mentorSubName)
                ? { ...mutedStyle, fontFamily: "'Ms Madi', cursive", direction: "ltr", fontWeight: 700 }
                : { ...mutedStyle, fontFamily: "'Liela', 'Forma DJR Arabic', sans-serif", fontWeight: 700 }
            }
          >
            {mentorSubName}
          </text>
        )}

        {verifyUrl && (
          <g transform="translate(1150 856)">
            <text x="74" y="-12" fontSize="14" fontWeight="500" style={mutedStyle}>
              {t("certificatePreview.scanToVerify")}
            </text>
            <rect x="0" y="0" width="148" height="148" rx="6" fill="#fff" filter="url(#qrShadow)" />
            {qrDataUrl && <image href={qrDataUrl} x="6" y="6" width="136" height="136" preserveAspectRatio="xMidYMid meet" />}
          </g>
        )}

        <text x="252" y="906" fontSize="18" fontWeight="500" style={{ ...mutedStyle, opacity: 0.85 }}>
          {t("certificatePreview.issueDate")}
        </text>
        <text x="252" y="948" fontSize="26" fontWeight="700" style={textStyle}>
          {formattedDate}
        </text>

        <text
          x="738"
          y="1046"
          fontSize="17"
          fontFamily="'Courier New', monospace"
          fill="#6b7280"
          textAnchor="middle"
          dominantBaseline="middle"
          direction={activeLanguage.startsWith("en") ? "ltr" : "rtl"}
          unicodeBidi="plaintext"
        >
          {t("certificatePreview.certificateId", { id: certificateId })}
        </text>
      </svg>
    </div>
  );
};

export default CertificatePreview;
