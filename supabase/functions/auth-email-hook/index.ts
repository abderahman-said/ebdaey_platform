import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createAuthEmailHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration
const SITE_NAME = "ebdaey"
const SENDER_DOMAIN = "notify.ebdaey.com"
const ROOT_DOMAIN = "ebdaey.com"
const FROM_DOMAIN = "notify.ebdaey.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

const OTP_TTL_MINUTES = 15

const EMAIL_SUBJECTS: Record<'ar' | 'en', Record<string, string>> = {
  en: {
    signup: 'Confirm your email',
    invite: "You've been invited",
    magiclink: 'Your login link',
    recovery: 'Reset your password',
    email_change: 'Confirm your new email',
    reauthentication: 'Your verification code',
  },
  ar: {
    signup: 'تأكيد بريدك الإلكتروني',
    invite: 'تمت دعوتك',
    magiclink: 'رابط تسجيل الدخول',
    recovery: 'إعادة تعيين كلمة المرور',
    email_change: 'تأكيد بريدك الجديد',
    reauthentication: 'رمز التحقق الخاص بك',
  },
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// Resolve the recipient's language:
// - Mentor (tenant match on email) → tenants.dashboard_language
// - Student (students table) → their mentor's tenants.public_language
// - Fallback → Arabic
async function resolveLanguage(email: string): Promise<'ar' | 'en'> {
  try {
    const supabase = adminClient()
    const { data: tn } = await supabase
      .from('tenants')
      .select('dashboard_language')
      .eq('email', email)
      .maybeSingle()
    if (tn) return (tn as any)?.dashboard_language === 'en' ? 'en' : 'ar'

    const { data: st } = await supabase
      .from('students')
      .select('tenant_id')
      .eq('email', email)
      .maybeSingle()
    if ((st as any)?.tenant_id) {
      const { data: mentorTn } = await supabase
        .from('tenants')
        .select('public_language')
        .eq('id', (st as any).tenant_id)
        .maybeSingle()
      return (mentorTn as any)?.public_language === 'en' ? 'en' : 'ar'
    }
  } catch (error) {
    console.error('language lookup failed', error)
  }
  return 'ar'
}

function generateSixDigitCode(): string {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(values[0] % 1_000_000).padStart(6, '0')
}

function extractTokenHash(url?: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const direct = parsed.searchParams.get('token_hash')
    if (direct) return direct
    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''))
      return hashParams.get('token_hash')
    }
  } catch {
    const match = url.match(/[?#&]token_hash=([^&#]+)/)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return null
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashMentorConfirmationCode(email: string, code: string, salt: string): Promise<string> {
  return sha256Hex(`${email.trim().toLowerCase()}:${code}:${salt}`)
}

async function lookupUserId(email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        },
      },
    )
    const json = await res.json()
    return (json?.users ?? []).find(
      (u: any) => (u?.email || '').toLowerCase() === email.toLowerCase(),
    )?.id ?? null
  } catch (error) {
    console.error('user id lookup failed', error)
    return null
  }
}

// Signup emails carry a 6-digit mentor confirmation code. The hashed code is
// persisted so verify-mentor-email-code can validate it later.
async function issueMentorConfirmationCode(email: string, url: string): Promise<string | null> {
  try {
    const messageId = crypto.randomUUID()
    const code = generateSixDigitCode()
    const supabase = adminClient()
    const { error } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup',
      recipient_email: email,
      status: 'pending',
      metadata: {
        mentor_confirmation: {
          version: 1,
          salt: messageId,
          code_hash: await hashMentorConfirmationCode(email, code, messageId),
          token_hash: extractTokenHash(url),
          user_id: await lookupUserId(email),
          expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
        },
      },
    })
    if (error) {
      console.error('failed to persist mentor confirmation code', { code: error.code, message: error.message })
      return null
    }
    return code
  } catch (error) {
    console.error('mentor confirmation code issue failed', error)
    return null
  }
}


// Template mapping for preview mode
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://ebdaey.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const handler = createAuthEmailHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: Deno.env.get('LOVABLE_SEND_URL'),
  emails: {
    signup: async (data) => {
      const language = await resolveLanguage(data.email)
      const code = await issueMentorConfirmationCode(data.email, data.url)
      return {
        subject: EMAIL_SUBJECTS[language].signup,
        element: React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
          token: code ?? data.token ?? '',
          language,
        }),
      }
    },
    invite: async (data) => {
      const language = await resolveLanguage(data.email)
      return {
        subject: EMAIL_SUBJECTS[language].invite,
        element: React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
          language,
        }),
      }
    },
    magiclink: async (data) => {
      const language = await resolveLanguage(data.email)
      return {
        subject: EMAIL_SUBJECTS[language].magiclink,
        element: React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          language,
        }),
      }
    },
    recovery: async (data) => {
      const language = await resolveLanguage(data.email)
      return {
        subject: EMAIL_SUBJECTS[language].recovery,
        element: React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          language,
        }),
      }
    },
    email_change: async (data) => {
      const language = await resolveLanguage(data.email)
      return {
        subject: EMAIL_SUBJECTS[language].email_change,
        element: React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
          language,
        }),
      }
    },
    reauthentication: async (data) => {
      const language = await resolveLanguage(data.email)
      return {
        subject: EMAIL_SUBJECTS[language].reauthentication,
        element: React.createElement(ReauthenticationEmail, {
          token: data.token ?? '',
          language,
        }),
      }
    },
  },

})

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  return handler(req)
})
