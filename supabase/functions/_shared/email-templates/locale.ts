// Shared bilingual helpers for auth email templates.
// The auth-email-hook resolves the recipient's language (mentor's
// dashboard_language when the email matches a tenant; falls back to ar).

export type EmailLang = 'ar' | 'en'

export const LOGO_URL_AR =
  'https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-v2.png'
export const LOGO_URL_EN =
  'https://hnrcibzgoziqvtsiepws.supabase.co/storage/v1/object/public/course-assets/email-assets%2Flogo-en-v2.png'

export const logoFor = (lang: EmailLang) => (lang === 'en' ? LOGO_URL_EN : LOGO_URL_AR)
export const dirFor = (lang: EmailLang) => (lang === 'en' ? 'ltr' : 'rtl')
export const alignFor = (lang: EmailLang) =>
  (lang === 'en' ? 'left' : 'right') as 'left' | 'right'
export const fontFor = (lang: EmailLang) =>
  lang === 'en'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
    : '"SF Arabic", Arial, sans-serif'
