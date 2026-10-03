import { createClient } from "npm:@supabase/supabase-js@2";
import { requireRole } from "../_shared/require-role.ts";
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import { emailLogoHeader } from "../_shared/email-logo.ts";
import { buildPayoutReference } from "../_shared/payout-reference.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admins only — a mentor must never trigger settlement emails for their own balance.
    const auth = await requireRole(req, ["admin"]);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const limited = await rateLimitGuard(req, {
      name: "send-settlement-email",
      max: 20,
      windowSeconds: 600,
      identifier: auth.user?.id,
    }, corsHeaders);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const { tenant_id, amount, adjustment_id } = body;
    if (!tenant_id || typeof tenant_id !== "string") return json({ error: "tenant_id required" }, 400);
    const settledAmount = Number(amount);
    if (!Number.isFinite(settledAmount) || settledAmount <= 0 || settledAmount > 10000000) {
      return json({ error: "invalid amount" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .select("id, name, owner_id, public_language")
      .eq("id", tenant_id)
      .maybeSingle();
    if (tErr || !tenant) return json({ error: "Mentor not found" }, 404);
    if (!tenant.owner_id) return json({ error: "Mentor has no owner account" }, 400);

    const { data: ownerData, error: oErr } = await admin.auth.admin.getUserById(tenant.owner_id);
    const email = ownerData?.user?.email;
    if (oErr || !email) return json({ error: "Mentor account email not found" }, 404);

    const isEn = (tenant as any)?.public_language === "en";
    const dir = isEn ? "ltr" : "rtl";
    const align = isEn ? "left" : "right";
    const fontFamily = isEn
      ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
      : "Arial,Tahoma,sans-serif";
    const brand = (tenant as any)?.name || "ebdaey";
    const dashboardUrl = "https://app.ebdaey.com/";

    // Allow admins to enable/disable and customize the settlement email from the UI.
    const { data: template } = await admin
      .from("notification_templates")
      .select("subject, body, enabled")
      .eq("template_key", "mentor.balance_settlement")
      .maybeSingle();

    const amountStr = fmt(settledAmount);
    // Same reference the mentor sees in the Transfers tab.
    const reference = typeof adjustment_id === "string" && adjustment_id
      ? buildPayoutReference(adjustment_id)
      : "";
    const vars: Record<string, string> = {
      mentor_name: brand,
      amount: amountStr,
      reference,
    };

    let subject: string;
    let html: string;
    let text: string;

    if (template?.enabled && template.subject && template.body) {
      subject = interpolate(template.subject, vars);
      text = interpolate(template.body, vars);
      // Wrap the customized text body in a simple branded HTML layout.
      html = `
        <div dir="${dir}" style="font-family:${fontFamily};max-width:520px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;text-align:${align};">
          ${emailLogoHeader(isEn)}
          <p style="margin:0 0 16px;line-height:1.7;white-space:pre-wrap;">${text.replace(/\n/g, "<br/>")}</p>
          ${reference ? `<div style="background:#f3f4f6;border-radius:12px;padding:12px 16px;margin:0 0 16px;">
            <div style="font-size:13px;color:#6b7280;">${isEn ? "Reference number" : "الرقم المرجعي"}</div>
            <div style="font-size:15px;font-weight:700;font-family:monospace;letter-spacing:0.5px;">${reference}</div>
          </div>` : ""}
          <a href="${dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">
            ${isEn ? "Open your dashboard" : "افتح لوحة التحكم"}
          </a>
        </div>`;
    } else {
      // Default bilingual email when the template is disabled or missing.
      const t = isEn
        ? {
            subject: `Balance settled — ${amountStr} EGP transferred`,
            h1: "Your balance has been settled",
            hello: `Hello ${brand},`,
            intro: "The platform has executed a balance settlement and bank transfer to your approved bank account.",
            amountLabel: "Settled amount",
            referenceLabel: "Reference number",
            note: "The amount will reach your bank account according to your bank's usual transfer time. Your dashboard balance has been reset to zero.",
            cta: "Open your dashboard",
          }
        : {
            subject: `تمت تسوية رصيدك — ${amountStr} ج.م`,
            h1: "تم تنفيذ تسوية رصيدك",
            hello: `مرحباً ${brand}،`,
            intro: "قامت المنصة بتنفيذ تسوية رصيدك وتحويله بنكياً إلى حسابك البنكي المعتمد.",
            amountLabel: "المبلغ المحوّل",
            referenceLabel: "الرقم المرجعي",
            note: "سيصلك المبلغ على حسابك البنكي حسب المدة المعتادة لدى البنك، وتم تصفير رصيدك في لوحة التحكم.",
            cta: "افتح لوحة التحكم",
          };

      subject = t.subject;
      html = `
        <div dir="${dir}" style="font-family:${fontFamily};max-width:520px;margin:0 auto;padding:24px;background:#ffffff;color:#111827;text-align:${align};">
          ${emailLogoHeader(isEn)}
          <h1 style="font-size:20px;margin:0 0 12px;">${t.h1}</h1>
          <p style="margin:0 0 12px;line-height:1.7;">${t.hello}</p>
          <p style="margin:0 0 16px;line-height:1.7;">${t.intro}</p>
          <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:0 0 16px;">
            <div style="font-size:13px;color:#6b7280;">${t.amountLabel}</div>
            <div style="font-size:24px;font-weight:700;color:#059669;">${amountStr} ${isEn ? "EGP" : "ج.م"}</div>
            ${reference ? `<div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
              <div style="font-size:13px;color:#6b7280;">${t.referenceLabel}</div>
              <div style="font-size:15px;font-weight:700;font-family:monospace;letter-spacing:0.5px;">${reference}</div>
            </div>` : ""}
          </div>
          <p style="margin:0 0 20px;line-height:1.7;color:#4b5563;font-size:14px;">${t.note}</p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">${t.cta}</a>
        </div>`;
      text = `${t.h1}\n\n${t.hello}\n${t.intro}\n${t.amountLabel}: ${amountStr} ${isEn ? "EGP" : "ج.م"}${reference ? `\n${t.referenceLabel}: ${reference}` : ""}\n\n${t.note}\n${t.cta}: ${dashboardUrl}`;
    }

    const result = await sendManagedEmail(admin, {
      to: email,
      from: `Ebdaey Platform <noreply@${FROM_DOMAIN}>`,
      subject,
      html,
      text,
      label: "mentor_balance_settlement",
      idempotencyKey: `settlement-${tenant_id}-${Math.round(settledAmount * 100)}-${Date.now()}`,
    });

    return json({ ok: true, sent: result.sent });
  } catch (e) {
    console.error("send-settlement-email failed", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
