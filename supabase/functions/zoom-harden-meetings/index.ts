// Repairs Zoom meetings that were created before the host-only settings existed.
// Older meetings kept Zoom's defaults, which let the first participant (the
// student) claim host controls. This re-applies the locked-down settings to all
// upcoming meetings.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { hardenZoomMeeting } from "../_shared/zoom.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const internalKey = req.headers.get("x-internal-service-key");
    const isInternal = !!internalKey && internalKey === SERVICE_KEY;

    let tenantFilter: string | null = null;
    if (!isInternal) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      const { data: userRes } = await admin.auth.getUser(token);
      const user = userRes?.user;
      if (!user) return json({ ok: false, reason: "unauthorized" }, 401);

      const { data: adminRole } = await admin
        .from("user_roles").select("id")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!adminRole) {
        const { data: tenant } = await admin
          .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
        if (!tenant) return json({ ok: false, reason: "forbidden" }, 403);
        tenantFilter = (tenant as any).id;
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    let sessionsQuery = admin
      .from("live_course_sessions")
      .select("id, tenant_id, zoom_meeting_id")
      .not("zoom_meeting_id", "is", null)
      .gte("session_date", today);
    if (tenantFilter) sessionsQuery = sessionsQuery.eq("tenant_id", tenantFilter);

    let bookingsQuery = admin
      .from("consultation_bookings")
      .select("id, tenant_id, zoom_meeting_id, status")
      .not("zoom_meeting_id", "is", null)
      .gte("booking_date", today)
      .in("status", ["scheduled", "confirmed"]);
    if (tenantFilter) bookingsQuery = bookingsQuery.eq("tenant_id", tenantFilter);

    const [{ data: sessions }, { data: bookings }] = await Promise.all([sessionsQuery, bookingsQuery]);

    const targets = [
      ...((sessions || []) as any[]).map((s) => ({ kind: "session", id: s.id, tenant_id: s.tenant_id, meeting_id: s.zoom_meeting_id })),
      ...((bookings || []) as any[]).map((b) => ({ kind: "booking", id: b.id, tenant_id: b.tenant_id, meeting_id: b.zoom_meeting_id })),
    ];

    let fixed = 0;
    const failures: Array<{ kind: string; id: string; code: string; message: string }> = [];
    for (const t of targets) {
      const res = await hardenZoomMeeting(admin, t.tenant_id, String(t.meeting_id));
      if (res.ok) fixed += 1;
      else failures.push({ kind: t.kind, id: t.id, code: res.code, message: res.message });
    }

    console.log("[zoom-harden] summary", JSON.stringify({ total: targets.length, fixed, failures }));
    return json({ ok: true, total: targets.length, fixed, failures });
  } catch (err) {
    console.error("zoom-harden-meetings error:", err);
    return json({ ok: false, reason: "unexpected_error" }, 500);
  }
});
