// Shared Ebdaey logo header for app emails (Arabic + English variants).

export const EMAIL_LOGO_URL_AR =
  "https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-v2.png";
export const EMAIL_LOGO_URL_EN =
  "https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-en-v2.png";

export const emailLogoUrl = (isEn: boolean) =>
  isEn ? EMAIL_LOGO_URL_EN : EMAIL_LOGO_URL_AR;

/** Logo block placed at the top of an email body. */
export function emailLogoHeader(isEn: boolean): string {
  return `<div style="text-align:${isEn ? "left" : "right"};margin:0 0 24px;">
      <img src="${emailLogoUrl(isEn)}" alt="ebdaey" width="120" style="display:inline-block;border:0;outline:none;text-decoration:none;" />
    </div>`;
}
