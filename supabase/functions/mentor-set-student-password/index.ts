import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimitGuard } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const limited = await rateLimitGuard(req, { name: "mentor-set-student-password", max: 20, windowSeconds: 600 }, corsHeaders);
  if (limited) return limited;


  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mentorId = userData.user.id;

    const body = await req.json();
    const { student_id, password } = body as {
      student_id?: string;
      password?: string;
    };

    if (!student_id || !password || typeof password !== "string" || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة. كلمة المرور 6 أحرف على الأقل" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get mentor's tenant
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", mentorId)
      .maybeSingle();
    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify student belongs to this tenant
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("id, user_id, tenant_id, email")
      .eq("id", student_id)
      .maybeSingle();
    if (studentErr || !student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (student.tenant_id !== tenant.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!student.user_id) {
      return new Response(
        JSON.stringify({ error: "هذا الطالب ليس له حساب مستخدم" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // The login may be shared with other academies or be a mentor/admin account;
    // one tenant owner must never be able to take over such an account.
    const { data: otherTenants } = await admin.from("students").select("id")
      .eq("user_id", student.user_id).neq("tenant_id", tenant.id).limit(1);
    const { data: privileged } = await admin.from("user_roles").select("role")
      .eq("user_id", student.user_id).in("role", ["admin", "mentor"]).limit(1);
    if ((otherTenants || []).length || (privileged || []).length) {
      return new Response(
        JSON.stringify({ error: "لا يمكن تغيير كلمة مرور هذا الحساب لأنه مرتبط بمنصات أخرى" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(
      student.user_id,
      { password },
    );
    if (updErr) {
      return new Response(JSON.stringify({ error: "تعذر تغيير كلمة المرور" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, email: student.email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
