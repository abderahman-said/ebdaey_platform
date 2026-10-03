import { escapeHtml } from "../_shared/internal-auth.ts";
// Admin login guard: brute-force throttling + issuing the 6-digit 2FA code.
//
// Actions:
//   precheck        (public)  — is this email/IP currently locked out?
//   record_failure  (public)  — record a failed admin sign-in attempt
//   send_code       (admin)   — email a fresh 6-digit verification code
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import {
  ATTEMPT_WINDOW_SECONDS,
  CODE_TTL_SECONDS,
  callerIp,
  corsHeaders,
  emailShell,
  generateCode,
  hashSecret,
  json,
  lockState,
  MAX_FAILED_ATTEMPTS,
  recordAttempt,
  requireAdmin,
  serviceClient,
} from "../_shared/admin-mfa.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const ip = callerIp(req);

    if (action === "precheck" || action === "record_failure") {
      const email = typeof body?.email === "string" ? body.email.trim() : "";
      if (!email || email.length > 200) return json({ error: "invalid_input" }, 400);

      const limited = await rateLimitGuard(
        req,
        { name: `admin-login-guard:${action}`, max: 30, windowSeconds: 600, identifier: ip },
        corsHeaders,
      );
      if (limited) return limited;

      const supa = serviceClient();

      if (action === "record_failure") {
        await recordAttempt(supa, email, ip, false);
        const state = await lockState(supa, email, ip);
        if (state.locked) {
          await supa.from("activity_logs").insert({
            action: "حجب مؤقت لمحاولات دخول إدارية متكررة",
            actor_type: "system",
            target_type: "admin_login",
            details: { email: email.toLowerCase(), ip, failures: state.failures },
          }).then(undefined, () => {});

          // Alert every admin that someone is hammering the login.
          try {
            const { data: admins } = await supa
              .from("user_roles").select("user_id").eq("role", "admin");
            for (const row of admins || []) {
              const { data: u } = await supa.auth.admin.getUserById(row.user_id);
              const to = u?.user?.email;
              if (!to) continue;
              await sendManagedEmail(supa, {
                to,
                from: `إبداعي <noreply@${FROM_DOMAIN}>`,
                subject: "تنبيه أمان: محاولات دخول فاشلة للوحة الإدارة",
                html: emailShell(
                  "محاولات دخول فاشلة للوحة الإدارة",
                  `<p style="font-size:14px;color:#333;line-height:1.9">سجّلنا ${state.failures} محاولة دخول فاشلة خلال آخر ١٥ دقيقة.</p>
                   <p style="font-size:14px;color:#333;line-height:1.9">البريد المستخدم: <b>${escapeHtml(email.toLowerCase())}</b><br/>عنوان الشبكة: <b>${escapeHtml(ip)}</b></p>
                   <p style="font-size:14px;color:#333;line-height:1.9">تم حجب المحاولات مؤقتًا. إن لم تكن أنت، غيّر كلمة السر فورًا.</p>`,
                ),
                text: `محاولات دخول فاشلة للوحة الإدارة: ${state.failures} محاولة. البريد: ${email.toLowerCase()} — IP: ${ip}`,
                label: "admin_login_lockout_alert",
                idempotencyKey: `lockout-${email.toLowerCase()}-${Math.floor(Date.now() / 60000)}`,
              });
            }
          } catch (e) {
            console.error("lockout alert failed", (e as Error).message);
          }
        }
        return json({ ok: true, locked: state.locked, retry_after_seconds: state.retryAfterSeconds });
      }

      const state = await lockState(supa, email, ip);
      return json({
        locked: state.locked,
        retry_after_seconds: state.retryAfterSeconds,
        max_attempts: MAX_FAILED_ATTEMPTS,
        window_seconds: ATTEMPT_WINDOW_SECONDS,
      });
    }

    if (action === "send_code") {
      const auth = await requireAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);

      const limited = await rateLimitGuard(
        req,
        { name: "admin-login-guard:send_code", max: 5, windowSeconds: 600, identifier: auth.user.id },
        corsHeaders,
      );
      if (limited) return limited;

      const supa = auth.supa;
      if (!auth.user.email) return json({ error: "no_email" }, 400);

      // Invalidate any outstanding code for this admin.
      await supa
        .from("admin_login_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("user_id", auth.user.id)
        .is("consumed_at", null);

      const code = generateCode();
      const { error: insErr } = await supa.from("admin_login_codes").insert({
        user_id: auth.user.id,
        code_hash: await hashSecret(code),
        expires_at: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
      });
      if (insErr) return json({ error: "code_create_failed" }, 500);

      await sendManagedEmail(supa, {
        to: auth.user.email,
        from: `إبداعي <noreply@${FROM_DOMAIN}>`,
        subject: "رمز الدخول للوحة الإدارة",
        html: emailShell(
          "رمز الدخول للوحة الإدارة",
          `<p style="font-size:14px;color:#333;line-height:1.9">استخدم هذا الرمز لإكمال تسجيل الدخول:</p>
           <div style="font-size:30px;font-weight:700;letter-spacing:8px;text-align:center;background:#f2f4f7;border-radius:10px;padding:16px;margin:14px 0;direction:ltr">${code}</div>
           <p style="font-size:13px;color:#666;line-height:1.9">الرمز صالح لمدة ١٠ دقائق ولاستخدام واحد فقط. إن لم تطلبه، غيّر كلمة السر فورًا.</p>
           <p style="font-size:13px;color:#666">عنوان الشبكة: <b>${escapeHtml(ip)}</b></p>`,
        ),
        text: `رمز الدخول للوحة الإدارة: ${code} (صالح ١٠ دقائق)`,
        label: "admin_login_code",
        idempotencyKey: `admin-code-${auth.user.id}-${Date.now()}`,
      });

      return json({ ok: true, sent_to: auth.user.email.replace(/^(.).*(@.*)$/, "$1***$2") });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("admin-login-guard error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
