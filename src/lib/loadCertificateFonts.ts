/**
 * Lazily injects the certificate Arabic font (Forma DJR Arabic) via a
 * local `@font-face` stylesheet so the preview matches the exported PDF
 * exactly and does not depend on a network call to Google Fonts at runtime.
 */

import lielaFont from "@/assets/mehraban-arabic.otf.asset.json";
import bodyFont from "@/assets/forma-djr-arabic.otf.asset.json";

let injected = false;

export function loadCertificateFonts() {
  if (injected || typeof document === "undefined") return;
  injected = true;

  // Handwritten script fonts: Ms Madi for Latin (English) personal names,
  // Liela (self-hosted) for Arabic personal names.
  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href = "https://fonts.googleapis.com/css2?family=Ms+Madi&display=swap";
  fonts.setAttribute("data-certificate-fonts", "script-fonts");
  document.head.appendChild(fonts);

  const style = document.createElement("style");
  style.setAttribute("data-certificate-fonts", "true");
  style.textContent = `
    @font-face {
      font-family: 'Liela';
      src: url('${lielaFont.url}') format('opentype');
      font-weight: 400 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Forma DJR Arabic';
      src: url('${bodyFont.url}') format('opentype');
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}
