import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import { supabase } from "@/integrations/supabase/client";
import CertificatePreview from "@/components/mentor/CertificatePreview";
import type { CertificateTemplate } from "@/components/mentor/CertificateTemplateEditor";
import { loadCertificateFonts } from "@/lib/loadCertificateFonts";
import { getCertificateVerifyUrl } from "@/lib/certificate";
import certificateBodyFont from "@/assets/forma-djr-arabic.otf.asset.json";
import certificateScriptFont from "@/assets/mehraban-arabic.otf.asset.json";
import { parse as parseOpenTypeFont } from "opentype.js";

interface CourseCertificateProps {
  studentName: string;
  courseName: string;
  mentorName: string;
  completionDate: string;
  certificateId: string;
  tenantId: string;
  mentorSlug?: string;
}

const defaultTemplate: Omit<CertificateTemplate, "tenant_id"> = {
  template_name: "قالب افتراضي",
  logo_url: null, signature_url: null, watermark_url: null,
  watermark_opacity: 5, seal_url: null, background_url: null,
  primary_color: "#3b82f6", secondary_color: "#6b7280",
  accent_color: "#fbbf24", border_color: "#e5e7eb",
  title_font: "serif", body_font: "sans-serif",
  border_style: "double", border_width: 8,
  show_qr: true, show_certificate_id: true,
  show_date: true, show_expiry: false,
  certificate_title: "شهادة إتمام",
  certificate_text: "تشهد هذه الشهادة بأن",
  achievement_text: "قد أتم بنجاح دورة",
};

const CERTIFICATE_WIDTH = 1476;
const CERTIFICATE_HEIGHT = 1140;

const fontDataUrlCache = new Map<string, Promise<string>>();

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const fetchDataUrl = (url: string) => {
  const absoluteUrl = new URL(url, window.location.origin).href;
  if (!fontDataUrlCache.has(absoluteUrl)) {
    fontDataUrlCache.set(
      absoluteUrl,
      fetch(absoluteUrl)
        .then((response) => {
          if (!response.ok) throw new Error("تعذر تحميل موارد الشهادة");
          return response.blob();
        })
        .then(blobToDataUrl)
    );
  }
  const cached = fontDataUrlCache.get(absoluteUrl);
  if (!cached) return Promise.reject(new Error("تعذر تحميل موارد الشهادة"));
  return cached;
};

/** Loads the TrueType build so it can be converted to SVG vector outlines. */
const msMadiCache: { promise?: Promise<{ dataUrl: string; format: string; buffer: ArrayBuffer } | null> } = {};
const fetchMsMadiDataUrl = () => {
  if (!msMadiCache.promise) {
    msMadiCache.promise = (async () => {
      try {
        // Google returns WOFF2 to browsers, which opentype.js cannot parse.
        // The official TrueType source contains the same Ms Madi glyphs.
        const response = await fetch("https://fonts.gstatic.com/s/msmadi/v2/HTxsL2UxNnOji5E1N-A.ttf");
        if (!response.ok) return null;
        const blob = await response.blob();
        return { dataUrl: await blobToDataUrl(blob), format: "truetype", buffer: await blob.arrayBuffer() };
      } catch {
        return null;
      }
    })();
  }
  return msMadiCache.promise;
};

const inlineSvgResources = async (svg: SVGSVGElement) => {
  const [bodyFont, arabicScriptFont, latinScriptFont] = await Promise.all([
    fetchDataUrl(certificateBodyFont.url),
    fetchDataUrl(certificateScriptFont.url).catch(() => null),
    fetchMsMadiDataUrl(),
  ]);

  const defs = svg.querySelector("defs") ?? document.createElementNS("http://www.w3.org/2000/svg", "defs");
  if (!defs.parentElement) svg.insertBefore(defs, svg.firstChild);

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    @font-face { font-family: 'Forma DJR Arabic'; src: url('${bodyFont}') format('opentype'); font-weight: 400 900; font-style: normal; }
    ${arabicScriptFont ? `@font-face { font-family: 'Liela'; src: url('${arabicScriptFont}') format('opentype'); font-weight: 400 700; font-style: normal; }` : ""}
    ${latinScriptFont ? `@font-face { font-family: 'Ms Madi'; src: url('${latinScriptFont.dataUrl}') format('${latinScriptFont.format}'); font-weight: 400; font-style: normal; }` : ""}
    text { font-family: 'Forma DJR Arabic', Arial, sans-serif; }
  `;
  defs.insertBefore(style, defs.firstChild);

  // Convert Latin signatures to vector outlines. Browser SVG image decoding can
  // ignore embedded webfonts, while paths preserve the exact Ms Madi shapes.
  svg.querySelectorAll<SVGTextElement>('[data-signature-font="latin"]').forEach((text) => {
    if (!latinScriptFont) return;
    const value = text.textContent || "";
    const fontSize = Number(text.getAttribute("font-size")) || 44;
    const centerX = Number(text.getAttribute("x")) || CERTIFICATE_WIDTH / 2;
    const centerY = Number(text.getAttribute("y")) || 846;
    const font = parseOpenTypeFont(latinScriptFont.buffer.slice(0));
    const initialPath = font.getPath(value, 0, 0, fontSize);
    const bounds = initialPath.getBoundingBox();
    const path = font.getPath(
      value,
      centerX - (bounds.x1 + bounds.x2) / 2,
      centerY - (bounds.y1 + bounds.y2) / 2,
      fontSize
    );
    const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
    outline.setAttribute("d", path.toPathData(3));
    outline.setAttribute("fill", "#6b7280");
    outline.setAttribute("stroke", "#6b7280");
    outline.setAttribute("stroke-width", "1.6");
    outline.setAttribute("stroke-linejoin", "round");
    outline.setAttribute("paint-order", "stroke fill");
    text.replaceWith(outline);
  });

  const images = Array.from(svg.querySelectorAll("image"));
  await Promise.all(
    images.map(async (image) => {
      const href = image.getAttribute("href") || image.getAttribute("xlink:href");
      if (!href || href.startsWith("data:")) return;
      const dataUrl = await fetchDataUrl(href);
      image.setAttribute("href", dataUrl);
      image.removeAttribute("xlink:href");
    })
  );
};

const svgToCanvas = async (svg: SVGSVGElement, scale = 3) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(CERTIFICATE_WIDTH));
  clone.setAttribute("height", String(CERTIFICATE_HEIGHT));
  await inlineSvgResources(clone);

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("تعذر تجهيز الشهادة"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = CERTIFICATE_WIDTH * scale;
    canvas.height = CERTIFICATE_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز ملف PDF");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const CourseCertificate = ({
  studentName, courseName, mentorName,
  completionDate, certificateId, tenantId, mentorSlug,
}: CourseCertificateProps) => {
  const { t } = useTranslation();
  const certRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<CertificateTemplate>({ ...defaultTemplate, tenant_id: tenantId });
  const [certLang, setCertLang] = useState<"ar" | "en">("ar");
  const [themeColor, setThemeColor] = useState<string | undefined>(undefined);
  const [mentorPersonalName, setMentorPersonalName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // The certificate always follows the mentor storefront (public) language and brand color.
    (async () => {
      // Read from the public view first: students viewing the certificate outside the
      // mentor storefront (e.g. app host) can't always read the private tenants row,
      // which previously made the certificate fall back to the near-black default color.
      let lang: string | null = null;
      let color: string | null = null;

      const { data: pub } = await (supabase as any)
        .from("public_tenants")
        .select("public_language, primary_color")
        .eq("id", tenantId)
        .maybeSingle();
      if (pub) {
        lang = pub.public_language ?? null;
        color = pub.primary_color ?? null;
      }

      if (!color || !lang) {
        const { data } = await (supabase as any)
          .from("tenants")
          .select("public_language, primary_color")
          .eq("id", tenantId)
          .maybeSingle();
        lang = lang ?? data?.public_language ?? null;
        color = color ?? data?.primary_color ?? null;
      }

      setCertLang(lang === "en" ? "en" : "ar");
      const raw = (color || "").trim();
      setThemeColor(
        raw ? (/^(#|rgb|hsl)/i.test(raw) ? raw : `hsl(${raw})`) : undefined
      );
      const { data: personal } = await (supabase as any).rpc("get_certificate_mentor_name", { _tenant_id: tenantId });
      setMentorPersonalName((personal as string | null) || null);
    })();
  }, [tenantId]);






  useEffect(() => {
    loadCertificateFonts();
    const fetch = async () => {
      const { data } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) setTemplate(data as unknown as CertificateTemplate);
    };
    fetch();
  }, [tenantId]);

  const displayMentorName = mentorName;

  const handleDownload = async () => {
    setDownloading(true);
    const host = document.createElement("div");
    host.setAttribute("dir", "rtl");
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "-99999px";
    host.style.width = `${CERTIFICATE_WIDTH}px`;
    host.style.background = "transparent";
    document.body.appendChild(host);

    const root = createRoot(host);
    try {
      await new Promise<void>((resolve) => {
        root.render(
          <CertificatePreview
            template={template}
            studentName={studentName}
            courseName={courseName}
            mentorName={displayMentorName}
            mentorSubName={mentorPersonalName || undefined}
            completionDate={completionDate}
            certificateId={certificateId}
            verifyUrl={getCertificateVerifyUrl(certificateId, mentorSlug)}
            language={certLang}
            themeColor={themeColor}

          />
        );
        // Wait for fonts + images to load
        setTimeout(async () => {
          try { await (document as any).fonts?.ready; } catch { /* ignore */ }
          const imgs = Array.from(host.querySelectorAll("img"));
          await Promise.all(
            imgs.map((img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((r) => {
                    img.onload = () => r(null);
                    img.onerror = () => r(null);
                  })
            )
          );
          resolve();
        }, 300);
      });

      const svg = host.querySelector("svg") as SVGSVGElement | null;
      if (!svg) throw new Error("تعذر العثور على الشهادة");

      const canvas = await svgToCanvas(svg, 3);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      // A4 landscape (mm)
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // certificate aspect 1476/1140 ≈ 1.295. A4 landscape 297/210 ≈ 1.414
      // Fit by height, center horizontally.
      const imgH = pageH;
      const imgW = (canvas.width / canvas.height) * imgH;
      const offsetX = (pageW - imgW) / 2;
      pdf.addImage(imgData, "JPEG", offsetX, 0, imgW, imgH);
      pdf.save(`certificate-${certificateId}.pdf`);
    } catch (e) {
      console.error("Certificate export failed", e);
    } finally {
      root.unmount();
      host.remove();
      setDownloading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-success hover:bg-success/90 text-success-foreground gap-2">
          <Award className="w-4 h-4" />
          {t("miscPublic.studentDashboard.completionCertificate")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-success" />
            {t("miscPublic.studentDashboard.courseCompletionCertificate")}
          </DialogTitle>
        </DialogHeader>

        <div ref={certRef}>
          <CertificatePreview
            template={template}
            studentName={studentName}
            courseName={courseName}
            mentorName={displayMentorName}
            mentorSubName={mentorPersonalName || undefined}
            completionDate={completionDate}
            certificateId={certificateId}
            verifyUrl={getCertificateVerifyUrl(certificateId, mentorSlug)}
            language={certLang}
            themeColor={themeColor}

          />
        </div>


        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? "جاري التحضير..." : "تحميل الشهادة PDF"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CourseCertificate;
