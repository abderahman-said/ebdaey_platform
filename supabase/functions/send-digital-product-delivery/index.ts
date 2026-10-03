import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendManagedEmail, FROM_DOMAIN } from "../_shared/send-managed-email.ts";
import { emailLogoHeader } from "../_shared/email-logo.ts";
import { isServiceCall, escapeHtml } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "ebdaey";
const ROOT_DOMAIN = "ebdaey.com";

interface RequestBody {
  purchaseId: string;
  idempotencyKey?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isServiceCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { purchaseId, idempotencyKey: requestedIdempotencyKey } = (await req.json()) as RequestBody;
    if (!purchaseId || typeof purchaseId !== "string") {
      return new Response(JSON.stringify({ error: "purchaseId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: purchase, error: pErr } = await supabase
      .from("digital_product_purchases")
      .select("id, student_id, digital_product_id, tenant_id, payment_status")
      .eq("id", purchaseId)
      .single();

    if (pErr || !purchase) {
      return new Response(JSON.stringify({ error: "Purchase not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purchase.payment_status !== "completed") {
      return new Response(JSON.stringify({ error: "Purchase not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: student }, { data: product }, { data: tenant }] = await Promise.all([
      supabase.from("students").select("email, full_name").eq("id", purchase.student_id).single(),
      supabase.from("digital_products").select("title, slug").eq("id", purchase.digital_product_id).single(),
      supabase.from("tenants").select("slug, name, public_language").eq("id", purchase.tenant_id).single(),
    ]);

    if (!student?.email || !product || !tenant) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEn = (tenant as any).public_language === "en";
    const dir = isEn ? "ltr" : "rtl";
    const lang = isEn ? "en" : "ar";
    const fontFamily = isEn
      ? "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
      : "Arial,Tahoma,sans-serif";

    const deliveryUrl = `https://${ROOT_DOMAIN}/${tenant.slug}/product/${product.slug}/delivery?purchase=${purchase.id}`;

    const subject = isEn
      ? `Your product is ready: ${product.title}`
      : `منتجك جاهز: ${product.title}`;

    const t = isEn
      ? {
          h1: `Thank you for your purchase from ${escapeHtml(tenant.name)} 🎉`,
          hello: `Hello ${escapeHtml(student.full_name || "")},`,
          body: `Your purchase of <strong style="color:#0f172a;">"${escapeHtml(product.title)}"</strong> is confirmed. You can download your files directly from the delivery page.`,
          cta: "Download your product",
          fallback: "If the button doesn't work, copy the following link and open it in your browser:",
        }
      : {
          h1: `شكراً لشرائك من ${escapeHtml(tenant.name)} 🎉`,
          hello: `مرحباً ${escapeHtml(student.full_name || "")}،`,
          body: `تم تأكيد شرائك للمنتج <strong style="color:#0f172a;">"${escapeHtml(product.title)}"</strong>. يمكنك تحميل ملفاتك مباشرة من صفحة التسليم.`,
          cta: "تحميل المنتج الآن",
          fallback: "إذا لم يعمل الزر، انسخ الرابط التالي وافتحه في المتصفح:",
        };

    const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${fontFamily};color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    ${emailLogoHeader(isEn)}
    <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">${t.h1}</h1>
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px;color:#334155;">${t.hello}</p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#334155;">${t.body}</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${deliveryUrl}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">
        ${t.cta}
      </a>
    </div>
    <p style="font-size:13px;line-height:1.7;margin:24px 0 0;color:#64748b;">
      ${t.fallback}<br>
      <span style="word-break:break-all;color:#0f172a;">${deliveryUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;">
    <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;">${SITE_NAME} • ${escapeHtml(tenant.name)}</p>
  </div>
</body></html>`;

    const text = isEn
      ? `Thank you for your purchase from ${tenant.name}\n\nYour purchase of "${product.title}" is confirmed.\nDownload link: ${deliveryUrl}\n\n${SITE_NAME}`
      : `شكراً لشرائك من ${tenant.name}\n\nتم تأكيد شرائك للمنتج "${product.title}".\nرابط التحميل: ${deliveryUrl}\n\n${SITE_NAME}`;

    const idempotencyKey = requestedIdempotencyKey || `digital-product-delivery-${purchase.id}`;

    try {
      await sendManagedEmail(supabase, {
        to: student.email,
        from: `${tenant.name} <noreply@${FROM_DOMAIN}>`,
        subject,
        html,
        text,
        label: "digital_product_delivery",
        idempotencyKey,
      });
    } catch (sendError) {
      console.error("Send failed:", sendError);
      return new Response(JSON.stringify({ error: "Send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delivery email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
