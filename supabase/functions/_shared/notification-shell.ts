// Shared branded HTML shell for platform notification emails.
// Wraps a plain-text body inside a consistent visual frame.
// Supports Arabic (RTL) and English (LTR) with a language-matched logo.

const LOGO_URL_AR =
  "https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-v2.png";
const LOGO_URL_EN =
  "https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-en-v2.png";

export type EmailLanguage = "ar" | "en";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replace {{variable}} placeholders using the provided variables map. */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = variables?.[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Wrap a plain-text body in the branded HTML shell. Auto-linkifies URLs. */
export function wrapNotificationHtml(
  bodyText: string,
  language: EmailLanguage = "ar",
): string {
  const isEn = language === "en";
  const dir = isEn ? "ltr" : "rtl";
  const lang = isEn ? "en" : "ar";
  const align = isEn ? "left" : "right";
  const marginStart = isEn ? "margin-inline-end:auto" : "margin-inline-start:auto";
  const fontFamily = isEn
    ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
    : "'SF Arabic',Tahoma,Arial,sans-serif";
  const logoUrl = isEn ? LOGO_URL_EN : LOGO_URL_AR;
  const footerText = isEn ? "ebdaey" : "منصة إبداعي";

  const escaped = escapeHtml(bodyText);
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) =>
      `<a href="${url}" style="color:#059669;text-decoration:underline;word-break:break-all;">${url}</a>`,
  );
  const html = withLinks.replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontFamily};color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="padding:28px 28px 12px;text-align:${align};">
                <img src="${logoUrl}" alt="ebdaey" width="110" style="display:block;${marginStart};" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;text-align:${align};font-size:15px;line-height:1.85;color:#1e2229;">
                ${html}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#fafafa;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
                ${footerText} · <a href="https://ebdaey.com" style="color:#999;text-decoration:none;">ebdaey.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Convert body text to plain-text alternative (unchanged, minus HTML). */
export function toPlainText(bodyText: string): string {
  return bodyText;
}
