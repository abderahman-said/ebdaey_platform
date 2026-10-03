// Shared Zoom API helper: refresh tokens and create meetings for a tenant.

interface ZoomAccountRow {
  id: string;
  tenant_id: string;
  zoom_user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface CreateMeetingParams {
  topic: string;
  startDateTimeISO: string; // e.g. 2026-07-20T07:20:00
  durationMinutes: number;
  timezone?: string;
}

interface CreatedMeeting {
  meeting_id: string;
  join_url: string;
  start_url: string;
}

export type ZoomFailureCode = "not_connected" | "configuration_error" | "token_refresh_failed" | "database_error" | "meeting_create_failed";

export type ZoomMeetingResult =
  | { ok: true; meeting: CreatedMeeting }
  | { ok: false; code: ZoomFailureCode; message: string; status?: number };

const safeZoomMessage = (value: string) => value.replace(/(?:access|refresh)_token["'=:\s]+[^\s,"}]+/gi, "$1_token=[redacted]").slice(0, 1000);

async function refreshZoomToken(supabase: any, account: ZoomAccountRow): Promise<string> {
  const CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET");
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Zoom credentials are not configured");
  const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Zoom token refresh failed (${res.status}): ${safeZoomMessage(t)}`);
  }
  const tok = await res.json();
  const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  const { error: updateError } = await supabase.from("mentor_zoom_accounts").update({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token || account.refresh_token,
    token_expires_at: expiresAt,
  }).eq("id", account.id);
  if (updateError) throw new Error(`Zoom token persistence failed: ${updateError.message}`);
  return tok.access_token;
}

async function getValidAccessToken(supabase: any, account: ZoomAccountRow): Promise<string> {
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Date.now() < expiresAt) return account.access_token;
  return await refreshZoomToken(supabase, account);
}

/** Settings that make the mentor the only host with full controls. */
export const HOST_ONLY_SETTINGS = {
  join_before_host: false,
  waiting_room: true,
  mute_upon_entry: true,
  host_video: true,
  participant_video: false,
  approval_type: 2,
  auto_recording: "none",
  alternative_hosts: "",
  allow_multiple_devices: false,
} as const;

/**
 * Disabled: the Zoom app only holds `user:read:user` and `meeting:write:meeting`.
 * Host-only security settings are applied in the create-meeting payload instead,
 * so no PATCH (which would need `meeting:update:meeting`) is ever issued.
 */
export async function hardenZoomMeeting(
  _supabase: any,
  _tenantId: string,
  _meetingId: string,
): Promise<{ ok: true } | { ok: false; code: ZoomFailureCode; message: string }> {
  return { ok: true };
}



export async function createZoomMeetingForTenant(
  supabase: any,
  tenantId: string,
  params: CreateMeetingParams,
): Promise<ZoomMeetingResult> {
  try {
    const { data: account, error: accountError } = await supabase
      .from("mentor_zoom_accounts")
      .select("id, tenant_id, zoom_user_id, access_token, refresh_token, token_expires_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (accountError) return { ok: false, code: "database_error", message: accountError.message };
    if (!account) return { ok: false, code: "not_connected", message: "Zoom account is not connected" };

    const accessToken = await getValidAccessToken(supabase, account as ZoomAccountRow);

    const body = {
      topic: params.topic.slice(0, 200),
      type: 2, // scheduled
      start_time: params.startDateTimeISO,
      duration: Math.max(15, Math.min(1440, params.durationMinutes || 30)),
      timezone: params.timezone || "Africa/Cairo",
      // The mentor is the only host. Students wait in the waiting room so they
      // can never claim host controls by joining first.
      settings: { ...HOST_ONLY_SETTINGS },


    };

    const res = await fetch(
      `https://api.zoom.us/v2/users/${encodeURIComponent((account as any).zoom_user_id)}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[zoom] create meeting failed", res.status, errText);
      return { ok: false, code: "meeting_create_failed", status: res.status, message: safeZoomMessage(errText) || `Zoom returned HTTP ${res.status}` };
    }
    const m = await res.json();
    if (!m.id || !m.join_url || !m.start_url) {
      return { ok: false, code: "meeting_create_failed", message: "Zoom response did not include all meeting URLs" };
    }
    return { ok: true, meeting: { meeting_id: String(m.id), join_url: m.join_url, start_url: m.start_url } };
  } catch (e) {
    console.error("[zoom] createZoomMeetingForTenant error", e);
    const message = safeZoomMessage(e instanceof Error ? e.message : String(e));
    const code = message.includes("not configured") ? "configuration_error" : message.includes("token") ? "token_refresh_failed" : "meeting_create_failed";
    return { ok: false, code, message };
  }
}

/**
 * Ensures a live_course_sessions row has a Zoom meeting.
 * Creates one lazily (and persists it) when the session is Zoom-based and has
 * no join URL yet. Returns { join_url, start_url } (possibly nulls).
 */
export async function ensureSessionZoomMeeting(
  supabase: any,
  session: {
    id: string;
    tenant_id: string;
    title?: string | null;
    session_date: string;
    session_time: string;
    duration_minutes?: number | null;
    zoom_join_url?: string | null;
    zoom_start_url?: string | null;
  },
  courseTitle: string,
): Promise<{ ok: true; outcome: "existing" | "created"; join_url: string; start_url: string | null } | { ok: false; code: ZoomFailureCode; message: string; status?: number }> {
  if (session.zoom_join_url) {
    return { ok: true, outcome: "existing", join_url: session.zoom_join_url, start_url: session.zoom_start_url || null };
  }

  const result = await createZoomMeetingForTenant(supabase, session.tenant_id, {
    topic: `${courseTitle}${session.title ? ` — ${session.title}` : ""}`,
    startDateTimeISO: `${session.session_date}T${session.session_time}`,
    durationMinutes: session.duration_minutes || 60,
  });
  if (!result.ok) return result;
  const meeting = result.meeting;

  const { error: updateError } = await supabase.from("live_course_sessions").update({
    zoom_meeting_id: meeting.meeting_id,
    zoom_join_url: meeting.join_url,
    zoom_start_url: meeting.start_url,
    zoom_generation_error: null,
    zoom_generation_attempted_at: new Date().toISOString(),
  }).eq("id", session.id);
  if (updateError) return { ok: false, code: "database_error", message: updateError.message };

  return { ok: true, outcome: "created", join_url: meeting.join_url, start_url: meeting.start_url };
}

/**
 * Ensures a consultation_bookings row has a Zoom meeting.
 * Creates one lazily (and persists it) when the appointment is Zoom-based and
 * has no meeting link yet. Safe to call repeatedly.
 */
export async function ensureBookingZoomMeeting(
  supabase: any,
  booking: {
    id: string;
    tenant_id: string;
    live_course_id: string;
    booking_date: string;
    booking_time: string;
    duration_minutes?: number | null;
    meeting_link?: string | null;
    zoom_start_url?: string | null;
  },
  course: { title?: string | null; attendance_type?: string | null; meeting_link?: string | null },
  studentLabel = "",
): Promise<
  | { ok: true; outcome: "existing" | "created" | "manual_link" | "not_zoom"; join_url: string | null; start_url: string | null }
  | { ok: false; code: ZoomFailureCode; message: string; status?: number }
> {
  if (booking.meeting_link) {
    return { ok: true, outcome: "existing", join_url: booking.meeting_link, start_url: booking.zoom_start_url || null };
  }
  if (course?.meeting_link) {
    return { ok: true, outcome: "manual_link", join_url: course.meeting_link, start_url: null };
  }
  if (course?.attendance_type !== "zoom") {
    return { ok: true, outcome: "not_zoom", join_url: null, start_url: null };
  }

  const result = await createZoomMeetingForTenant(supabase, booking.tenant_id, {
    topic: `${course?.title || "Consultation"}${studentLabel ? ` — ${studentLabel}` : ""}`,
    startDateTimeISO: `${booking.booking_date}T${booking.booking_time}`,
    durationMinutes: booking.duration_minutes || 30,
  });
  if (!result.ok) {
    console.error("[zoom] booking meeting failed", booking.id, result.code, result.message);
    return result;
  }

  const { error: updateError } = await supabase.from("consultation_bookings").update({
    meeting_link: result.meeting.join_url,
    zoom_meeting_id: result.meeting.meeting_id,
    zoom_start_url: result.meeting.start_url,
  }).eq("id", booking.id);
  if (updateError) return { ok: false, code: "database_error", message: updateError.message };

  return { ok: true, outcome: "created", join_url: result.meeting.join_url, start_url: result.meeting.start_url };
}

/**
 * Strips Zoom host tokens (`zak`) and rewrites host start links (/s/<id>) into
 * plain join links, so a student can never receive host powers through a link.
 */
export function sanitizeJoinLink(link?: string | null): string | null {
  if (!link) return null;
  const raw = String(link).trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!/(^|\.)zoom\.us$/i.test(url.hostname)) return raw;
    url.searchParams.delete("zak");
    url.searchParams.delete("tk");
    const m = url.pathname.match(/^\/s\/(\d+)$/);
    if (m) url.pathname = `/j/${m[1]}`;
    return url.toString();
  } catch {
    return raw;
  }
}
