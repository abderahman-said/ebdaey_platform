// Unified notification sender. Reads template by key from
// public.notification_templates, renders {{variables}}, wraps in shared HTML
// shell, then enqueues to the transactional email queue.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import {
  renderTemplate,
  toPlainText,
  wrapNotificationHtml,
} from "../_shared/notification-shell.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ebdaey";

interface RequestBody {
  templateKey: string;
  to: string;
  variables?: Record<string, string | number | null | undefined>;
  idempotencyKey?: string;
  /** "ar" (default) or "en". If omitted, auto-detected from mentor's dashboard_language when the recipient matches a tenant. */
  language?: "ar" | "en";
  /** Optional tenant context — most reliable way to pick the email language. */
  tenant_id?: string;

}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal-only endpoint: transactional emails may only be triggered by
    // other backend functions / cron using the service role key.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ") || authHeader.slice(7).trim() !== serviceKey) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as RequestBody;

    if (!body?.templateKey || typeof body.templateKey !== "string") {
      return json({ error: "templateKey required" }, 400);
    }
    if (
      !body?.to ||
      typeof body.to !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)
    ) {
      return json({ error: "valid recipient email required" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const { data: tpl, error: tErr } = await supabase
      .from("notification_templates")
      .select("template_key, subject, body, subject_en, body_en, enabled")
      .eq("template_key", body.templateKey)
      .maybeSingle();

    if (tErr) {
      console.error("template fetch error", tErr);
      return json({ error: "Template lookup failed" }, 500);
    }
    if (!tpl) {
      return json({ error: `Unknown template: ${body.templateKey}` }, 404);
    }
    if (!tpl.enabled) {
      return json({ success: true, skipped: true, reason: "disabled" }, 200);
    }

    // Resolve language: explicit param wins; otherwise auto-detect.
    // Mentor recipient → tenants.dashboard_language.
    // Student recipient → their mentor's tenants.public_language.
    let language: "ar" | "en" = body.language === "en" ? "en" : body.language === "ar" ? "ar" : "ar";
    let resolved = !!body.language;

    // Preferred path: caller passes the tenant, so we never depend on matching
    // emails (student emails can be duplicated across tenants).
    if (!resolved && (body as any).tenant_id) {
      const { data: ctxTn } = await supabase
        .from("tenants")
        .select("public_language, dashboard_language")
        .eq("id", (body as any).tenant_id)
        .maybeSingle();
      if (ctxTn) {
        const isMentorTemplate = (body.templateKey || "").startsWith("mentor.");
        const lang = isMentorTemplate
          ? (ctxTn as any).dashboard_language
          : (ctxTn as any).public_language;
        language = lang === "en" ? "en" : "ar";
        resolved = true;
      }
    }

    if (!resolved) {
      const { data: tnRows } = await supabase
        .from("tenants")
        .select("dashboard_language")
        .eq("email", body.to)
        .limit(1);
      const tn = (tnRows as any[] | null)?.[0];
      if (tn) {
        if ((tn as any)?.dashboard_language === "en") language = "en";
      } else {
        const { data: stRows } = await supabase
          .from("students")
          .select("tenant_id")
          .eq("email", body.to)
          .order("created_at", { ascending: false })
          .limit(1);
        const st = (stRows as any[] | null)?.[0];
        if ((st as any)?.tenant_id) {
          const { data: mentorTn } = await supabase
            .from("tenants")
            .select("public_language")
            .eq("id", (st as any).tenant_id)
            .maybeSingle();
          if ((mentorTn as any)?.public_language === "en") language = "en";
        } else {

          // Mentor whose tenants.email is empty: match via their auth account email.
          try {
            const res = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?filter=${encodeURIComponent(body.to)}`,
              {
                headers: {
                  apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
                },
              },
            );
            const j = await res.json();
            const uid = (j?.users ?? []).find(
              (u: any) => (u?.email || "").toLowerCase() === body.to.toLowerCase(),
            )?.id;
            if (uid) {
              const { data: ownerTn } = await supabase
                .from("tenants")
                .select("dashboard_language")
                .eq("owner_id", uid)
                .maybeSingle();
              if ((ownerTn as any)?.dashboard_language === "en") language = "en";
            }
          } catch (e) {
            console.error("owner language lookup failed", e);
          }
        }
      }
    }


    const vars = body.variables ?? {};
    const useEn = language === "en" && (tpl as any).subject_en && (tpl as any).body_en;
    const subject = renderTemplate(useEn ? (tpl as any).subject_en : tpl.subject, vars);
    const bodyText = renderTemplate(useEn ? (tpl as any).body_en : tpl.body, vars);
    const html = wrapNotificationHtml(bodyText, language);
    const text = toPlainText(bodyText);

    const idempotencyKey = body.idempotencyKey ??
      `${body.templateKey}-${crypto.randomUUID()}`;

    try {
      const result = await sendManagedEmail(supabase, {
        to: body.to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        subject,
        html,
        text,
        label: body.templateKey,
        idempotencyKey,
      });

      if (!result.sent) {
        return json(
          { success: true, skipped: true, reason: result.reason, message_id: result.message_id },
          200,
        );
      }

      return json({ success: true, sent: true, message_id: result.message_id }, 200);
    } catch (error) {
      console.error("send error", error);
      return json({ error: "Failed to send" }, 500);
    }

  } catch (err) {
    console.error("send-notification error", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
