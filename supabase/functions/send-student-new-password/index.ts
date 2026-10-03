import { createClient } from "npm:@supabase/supabase-js@2";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import { emailLogoHeader } from "../_shared/email-logo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROOT_DOMAIN = "ebdaey.com";

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
  ];
  for (let i = 3; i < 12; i++) chars.push(all[bytes[i] % all.length]);
  return chars.join("");
}

const normalizePhone = (v: string) => v.replace(/[^\d]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ok = () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { identifier, tenant_slug } = await req.json();
    if (!identifier || typeof identifier !== "string") {
      return new Response(JSON.stringify({ error: "identifier required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const raw = identifier.trim();
    const isEmail = raw.includes("@");

    let query = supabase
      .from("students")
      .select("id, user_id, email, full_name, phone, tenant_id")
      .order("created_at", { ascending: false })
      .limit(20);

    if (isEmail) query = query.ilike("email", raw);
    const { data: rows } = await query;

    let students = rows || [];
    if (!isEmail) {
      const digits = normalizePhone(raw);
      students = students.filter(
        (s: any) => s.phone && normalizePhone(s.phone).endsWith(digits.slice(-9)),
      );
      if (digits.length < 8) students = [];
    }

    if (!students.length) return ok(); // don't leak account existence

    // Prefer a student inside the requesting mentor tenant when provided.
    let student: any = students[0];
    if (tenant_slug) {
      const { data: tenant } = await supabase
        .from("tenants").select("id").eq("slug", tenant_slug).maybeSingle();
      if (tenant) {
        student = students.find((s: any) => s.tenant_id === tenant.id) || student;
      }
    }
    if (!student?.user_id || !student?.email) return ok();

    const newPassword = generatePassword();
    const { error: updErr } = await supabase.auth.admin.updateUserById(student.user_id, {
      password: newPassword,
    });
    if (updErr) {
      console.error("password update failed", updErr);
      return new Response(JSON.stringify({ error: "update_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug, public_language")
      .eq("id", student.tenant_id)
      .maybeSingle();

    const isEn = (tenant as any)?.public_language === "en";
    const dir = isEn ? "ltr" : "rtl";
    const lang = isEn ? "en" : "ar";
    const fontFamily = isEn
      ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
      : "Arial,Tahoma,sans-serif";
    const brand = (tenant as any)?.name || "ebdaey";
    const loginUrl = `https://${ROOT_DOMAIN}/${(tenant as any)?.slug || ""}/dashboard`;

    const t = isEn
      ? {
          subject: `Your new password — ${brand}`,
          h1: "Your new password",
          hello: `Hello ${student.full_name || ""},`,
          intro: "We generated a new password for your account. Use it to sign in:",
          emailLabel: "Email:",
          pwLabel: "New password:",
          advice: "For your security, change this password after signing in.",
          cta: "Sign in now",
        }
      : {
          subject: `كلمة المرور الجديدة — ${brand}`,
          h1: "كلمة المرور الجديدة",
          hello: `مرحباً ${student.full_name || ""}،`,
          intro: "تم إنشاء كلمة مرور جديدة لحسابك. استخدمها لتسجيل الدخول:",
          emailLabel: "البريد الإلكتروني:",
          pwLabel: "كلمة المرور الجديدة:",
          advice: "لأمان حسابك، يُفضّل تغيير كلمة المرور بعد تسجيل الدخول.",
          cta: "تسجيل الدخول",
        };

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${fontFamily};color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    ${emailLogoHeader(isEn)}
    <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">${t.h1}</h1>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.hello}</p>
    <p style="font-size:15px;line-height:1.7;color:#334155;">${t.intro}</p>
    <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="font-size:14px;margin:4px 0;color:#0f172a;"><strong>${t.emailLabel}</strong> <span dir="ltr">${student.email}</span></p>
      <p style="font-size:18px;margin:10px 0 0;color:#0f172a;letter-spacing:1px;"><strong>${t.pwLabel}</strong> <span dir="ltr" style="font-family:monospace;">${newPassword}</span></p>
    </div>
    <p style="font-size:13px;line-height:1.7;color:#64748b;">${t.advice}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;">${t.cta}</a>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">${brand}</p>
  </div>
</body></html>`;

    const text = `${t.intro}\n${t.emailLabel} ${student.email}\n${t.pwLabel} ${newPassword}\n${loginUrl}`;

    const idempotencyKey = `student-new-password-${student.id}-${Date.now()}`;

    try {
      await sendManagedEmail(supabase, {
        to: student.email,
        from: `${brand} <noreply@${FROM_DOMAIN}>`,
        subject: t.subject,
        html,
        text,
        label: "student_new_password",
        idempotencyKey,
      });
    } catch (sendError) {
      console.error("Send failed:", sendError);
      return new Response(JSON.stringify({ error: "send_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return ok();
  } catch (e) {
    console.error("send-student-new-password error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
