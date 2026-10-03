// Managed email send for feature senders that build their own subject/HTML at
// send time. Mirrors the scaffolded template helper's request shape and records
// the outcome in email_send_log (app data, notification-only — Lovable owns
// suppression, retries, unsubscribe and rate limits).

import { EmailAPIError, sendLovableEmail } from "npm:@lovable.dev/email-js@0.1.0";

export const SENDER_DOMAIN = "notify.ebdaey.com";
export const FROM_DOMAIN = "notify.ebdaey.com";

export type ManagedEmailResult =
  | { sent: true; message_id: string }
  | { sent: false; reason: "recipient_suppressed"; message_id: string };

export interface ManagedEmailInput {
  to: string;
  /** Full From header, e.g. `Brand <noreply@notify.example.com>` */
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Log label / template name, e.g. "digital_product_delivery" */
  label: string;
  idempotencyKey: string;
}

export async function sendManagedEmail(
  supabase: any,
  input: ManagedEmailInput,
): Promise<ManagedEmailResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const messageId = `${input.idempotencyKey}-${crypto.randomUUID()}`;

  const log = async (
    status: "sent" | "suppressed" | "failed",
    errorMessage?: string,
  ) => {
    const { error } = await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.label,
      recipient_email: input.to,
      status,
      error_message: errorMessage ?? null,
    });
    if (error) {
      console.error("email_send_log write failed", {
        status,
        label: input.label,
        code: error.code,
        message: error.message,
      });
    }
  };

  try {
    await sendLovableEmail(
      {
        to: input.to,
        from: input.from,
        sender_domain: SENDER_DOMAIN,
        subject: input.subject,
        html: input.html,
        text: input.text,
        purpose: "transactional",
        label: input.label,
        idempotency_key: input.idempotencyKey,
      },
      { apiKey, sendUrl: Deno.env.get("LOVABLE_SEND_URL") },
    );
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === "recipient_suppressed") {
      await log("suppressed", "Recipient is suppressed");
      return { sent: false, reason: "recipient_suppressed", message_id: messageId };
    }
    const message = error instanceof Error ? error.message : String(error);
    await log("failed", message.slice(0, 1000));
    throw error;
  }

  await log("sent");
  return { sent: true, message_id: messageId };
}
