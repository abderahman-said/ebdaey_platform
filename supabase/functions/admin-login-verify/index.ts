// Admin 2FA verification + trusted-device checks.
//
// Actions (all require a signed-in admin JWT):
//   verify_code   — confirm the 6-digit code, issue a device token
//   check_device  — is this device token still valid for the signed-in admin?
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import {
  CODE_MAX_ATTEMPTS,
  SESSION_DEVICE_HOURS,
  TRUSTED_DEVICE_DAYS,
  callerIp,
  corsHeaders,
  emailShell,
  generateDeviceToken,
  hashSecret,
  json,
  recordAttempt,
  requireAdmin,
} from "../_shared/admin-mfa.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const supa = auth.supa;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const ip = callerIp(req);

    if (action === "check_device") {
      const token = typeof body?.device_token === "string" ? body.device_token : "";
      if (!token || token.length > 200) return json({ ok: false });
      const { data: device } = await supa
        .from("admin_trusted_devices")
        .select("id, expires_at")
        .eq("user_id", auth.user.id)
        .eq("token_hash", await hashSecret(token))
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!device) return json({ ok: false });
      await supa
        .from("admin_trusted_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", device.id)
        .then(undefined, () => {});
      return json({ ok: true, expires_at: device.expires_at });
    }

    if (action === "verify_code") {
      const limited = await rateLimitGuard(
        req,
        { name: "admin-login-verify", max: 15, windowSeconds: 600, identifier: auth.user.id },
        corsHeaders,
      );
      if (limited) return limited;

      const code = String(body?.code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ error: "invalid_code_format" }, 400);
      const trust = body?.trust_device === true;

      const { data: row } = await supa
        .from("admin_login_codes")
        .select("id, code_hash, attempts, expires_at")
        .eq("user_id", auth.user.id)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) return json({ error: "no_active_code" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return json({ error: "code_expired" }, 400);
      }
      if (row.attempts >= CODE_MAX_ATTEMPTS) {
        await supa.from("admin_login_codes")
          .update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
        return json({ error: "too_many_code_attempts" }, 429);
      }

      const matches = row.code_hash === (await hashSecret(code));
      if (!matches) {
        await supa.from("admin_login_codes")
          .update({ attempts: row.attempts + 1 }).eq("id", row.id);
        await recordAttempt(supa, auth.user.email, ip, false);
        return json({
          error: "wrong_code",
          attempts_left: Math.max(0, CODE_MAX_ATTEMPTS - (row.attempts + 1)),
        }, 400);
      }

      await supa.from("admin_login_codes")
        .update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

      const token = generateDeviceToken();
      const expiresAt = new Date(
        Date.now() +
          (trust ? TRUSTED_DEVICE_DAYS * 86400 : SESSION_DEVICE_HOURS * 3600) * 1000,
      ).toISOString();
      const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

      const { error: devErr } = await supa.from("admin_trusted_devices").insert({
        user_id: auth.user.id,
        token_hash: await hashSecret(token),
        persistent: trust,
        user_agent: userAgent,
        ip,
        expires_at: expiresAt,
      });
      if (devErr) return json({ error: "device_create_failed" }, 500);

      await recordAttempt(supa, auth.user.email, ip, true);
      await supa.from("activity_logs").insert({
        action: "دخول ناجح للوحة الإدارة بعد التحقق بخطوتين",
        actor_id: auth.user.id,
        actor_type: "admin",
        target_type: "admin_login",
        details: { ip, user_agent: userAgent, trusted_device: trust },
      }).then(undefined, () => {});

      // New-device sign-in alert.
      try {
        if (auth.user.email) {
          await sendManagedEmail(supa, {
            to: auth.user.email,
            from: `إبداعي <noreply@${FROM_DOMAIN}>`,
            subject: "تم تسجيل دخول جديد للوحة الإدارة",
            html: emailShell(
              "تم تسجيل دخول جديد للوحة الإدارة",
              `<p style="font-size:14px;color:#333;line-height:1.9">تم الدخول بنجاح من جهاز جديد.</p>
               <p style="font-size:14px;color:#333;line-height:1.9">عنوان الشبكة: <b>${ip}</b><br/>الجهاز: <b>${userAgent || "غير معروف"}</b></p>
               <p style="font-size:13px;color:#666">إن لم تكن أنت، غيّر كلمة السر فورًا.</p>`,
            ),
            text: `دخول جديد للوحة الإدارة من ${ip}`,
            label: "admin_new_device_login",
            idempotencyKey: `admin-login-${auth.user.id}-${Date.now()}`,
          });
        }
      } catch (e) {
        console.error("new device alert failed", (e as Error).message);
      }

      return json({ ok: true, device_token: token, expires_at: expiresAt });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("admin-login-verify error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
