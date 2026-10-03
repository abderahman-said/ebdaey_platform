import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification-only bookkeeping: Lovable enforces suppression at send time.
// These rows keep the project's own delivery history in sync.
function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function logEvent(
  eventId: string,
  recipient: string,
  status: 'bounced' | 'complained' | 'suppressed',
  message: string,
) {
  const supabase = admin()
  const { error } = await supabase.from('email_send_log').insert({
    message_id: eventId,
    template_name: 'system',
    recipient_email: recipient,
    status,
    error_message: message,
  })
  if (error && error.code !== '23505') {
    console.error('email_send_log write failed', { event_id: eventId, code: error.code, message: error.message })
    throw new Error('email_send_log write failed')
  }
}

async function suppress(
  eventId: string,
  recipient: string,
  reason: 'bounce' | 'complaint' | 'unsubscribe',
) {
  const supabase = admin()
  const { error } = await supabase
    .from('suppressed_emails')
    .upsert({ email: recipient.trim().toLowerCase(), reason }, { onConflict: 'email' })
  if (error) {
    console.error('suppressed_emails write failed', { event_id: eventId, code: error.code, message: error.message })
    throw new Error('suppressed_emails write failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      const recipient = event.data.recipient
      await logEvent(event.event_id, recipient, 'bounced', 'Email bounced')
      await suppress(event.event_id, recipient, 'bounce')
    },
    'email.complaint': async (event) => {
      const recipient = event.data.recipient
      await logEvent(event.event_id, recipient, 'complained', 'Spam complaint received')
      await suppress(event.event_id, recipient, 'complaint')
    },
    'email.unsubscribed': async (event) => {
      const recipient = event.data.recipient
      await logEvent(event.event_id, recipient, 'suppressed', 'Recipient unsubscribed')
      await suppress(event.event_id, recipient, 'unsubscribe')
    },
  },
})

Deno.serve((req) => handler(req))
