import { createClient } from 'npm:@supabase/supabase-js@2'
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GENERIC_ERROR = 'الرمز غير صحيح أو منتهي الصلاحية. اطلب رمزاً جديداً.'

type MentorConfirmation = {
  version?: number
  salt?: string
  code_hash?: string
  token_hash?: string
  user_id?: string | null
  expires_at?: string
  consumed_at?: string | null
}

type EmailLogRow = {
  id: string
  metadata: {
    mentor_confirmation?: MentorConfirmation
  } | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashCode(email: string, code: string, salt: string): Promise<string> {
  return sha256Hex(`${email.trim().toLowerCase()}:${code}:${salt}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
      return json({ error: GENERIC_ERROR })
    }

  const limited = await rateLimitGuard(req, { name: "verify-mentor-email-code", max: 10, windowSeconds: 600 }, corsHeaders);
  if (limited) return limited;


    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing backend configuration')
      return json({ error: 'تعذر التحقق الآن. حاول مرة أخرى لاحقاً.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: rows, error: lookupError } = await admin
      .from('email_send_log')
      .select('id, metadata')
      .eq('template_name', 'signup')
      .eq('recipient_email', email)
      .in('status', ['pending', 'sent'])
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8)

    if (lookupError) {
      console.error('Failed to load confirmation records', lookupError)
      return json({ error: 'تعذر التحقق الآن. حاول مرة أخرى لاحقاً.' }, 500)
    }

    let matchedRow: EmailLogRow | null = null
    let matchedConfirmation: MentorConfirmation | null = null

    for (const row of (rows ?? []) as EmailLogRow[]) {
      const confirmation = row.metadata?.mentor_confirmation
      if (!confirmation?.salt || !confirmation.code_hash || !confirmation.expires_at) continue
      if (confirmation.consumed_at) continue
      if (new Date(confirmation.expires_at).getTime() <= Date.now()) continue

      const candidateHash = await hashCode(email, code, confirmation.salt)
      if (candidateHash === confirmation.code_hash) {
        matchedRow = row
        matchedConfirmation = confirmation
        break
      }
    }

    if (!matchedRow || !matchedConfirmation) {
      return json({ error: GENERIC_ERROR })
    }

    let sessionData: any = null

    if (matchedConfirmation.token_hash) {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { data, error: verifyError } = await authClient.auth.verifyOtp({
        token_hash: matchedConfirmation.token_hash,
        type: 'signup',
      })

      if (!verifyError && data.session) {
        sessionData = data.session
      } else {
        console.warn('Token hash verification unavailable, falling back to admin confirmation', verifyError)
      }
    }

    const userId = matchedConfirmation.user_id
    if (!sessionData) {
      if (userId) {
        const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        })

        if (updateError) {
          console.warn('Admin email confirmation failed, continuing with session link', updateError)
        }
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })

      if (linkError || !linkData.properties?.hashed_token) {
        console.error('Session link generation failed', linkError)
        return json({ error: 'تم تأكيد البريد. سجّل الدخول للمتابعة.' }, 200)
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: sessionLinkData, error: sessionLinkError } = await authClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (sessionLinkError || !sessionLinkData.session) {
        console.error('Session creation failed after confirmation', sessionLinkError)
        return json({ error: 'تم تأكيد البريد. سجّل الدخول للمتابعة.' }, 200)
      }

      sessionData = sessionLinkData.session
    }

    if (!sessionData) {
      return json({ error: GENERIC_ERROR })
    }

    await admin
      .from('email_send_log')
      .update({
        metadata: {
          ...(matchedRow.metadata ?? {}),
          mentor_confirmation: {
            ...matchedConfirmation,
            consumed_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', matchedRow.id)

    return json({ session: sessionData })
  } catch (error) {
    console.error('Unexpected verification error', error)
    return json({ error: 'تعذر التحقق الآن. حاول مرة أخرى لاحقاً.' }, 500)
  }
})