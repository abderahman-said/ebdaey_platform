// Google Calendar helper for Lovable App User Connector gateway.
// The connection_api_key is a per-mentor key issued by the gateway after OAuth.
const GATEWAY_BASE = "https://connector-gateway.lovable.dev";

export interface GcalAccount {
  tenant_id: string;
  google_email: string;
  connection_api_key: string;
  calendar_id: string;
  busy_sync_enabled: boolean;
}

function gwHeaders(connectionApiKey: string): HeadersInit {
  const clientKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!clientKey) throw new Error("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY not configured");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
  return {
    "Authorization": `Bearer ${lovableKey}`,
    "X-Client-Api-Key": clientKey,
    "X-Connection-Api-Key": connectionApiKey,
    "Content-Type": "application/json",
  };
}

export async function getGcalAccount(supabase: any, tenantId: string): Promise<GcalAccount | null> {
  const { data } = await supabase
    .from("mentor_google_calendar_accounts")
    .select("tenant_id, google_email, connection_api_key, calendar_id, busy_sync_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data ?? null;
}

// Build a local date-time and let Google resolve the UTC offset from the
// accompanying Africa/Cairo timeZone. Cairo observes daylight-saving time,
// so a fixed numeric offset is incorrect for part of the year.
function toCairoLocalDateTime(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}`;
}

function addMinutesToLocalDateTime(localDateTime: string, minutes: number): string {
  // Treat the local date-time fields as UTC only for offset-free arithmetic,
  // then return the same fields without a suffix. Google applies Cairo's
  // correct offset to both start and end using the supplied IANA time zone.
  const d = new Date(`${localDateTime}Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export interface EventInput {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  attendees?: Array<{ email: string; displayName?: string }>;
  meetingLink?: string | null;
  location?: string | null;
}

export async function createEvent(
  account: GcalAccount,
  input: EventInput,
): Promise<{ id: string; htmlLink?: string } | null> {
  const start = toCairoLocalDateTime(input.date, input.time);
  const end = addMinutesToLocalDateTime(start, input.durationMinutes);

  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: start, timeZone: "Africa/Cairo" },
    end: { dateTime: end, timeZone: "Africa/Cairo" },
    reminders: { useDefault: true },
  };
  if (input.attendees && input.attendees.length > 0) {
    body.attendees = input.attendees;
  }
  if (input.meetingLink) {
    body.location = input.meetingLink;
    body.description = `${body.description}\n\n${input.meetingLink}`.trim();
  } else if (input.location) {
    body.location = input.location;
  }

  const url = `${GATEWAY_BASE}/google_calendar/calendar/v3/calendars/${encodeURIComponent(account.calendar_id)}/events?sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: gwHeaders(account.connection_api_key),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[gcal] createEvent failed ${res.status}: ${text}`);
    return null;
  }
  const data = await res.json();
  return { id: data.id, htmlLink: data.htmlLink };
}

export async function updateEvent(
  account: GcalAccount,
  eventId: string,
  input: EventInput,
): Promise<boolean> {
  const start = toCairoLocalDateTime(input.date, input.time);
  const end = addMinutesToLocalDateTime(start, input.durationMinutes);
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: start, timeZone: "Africa/Cairo" },
    end: { dateTime: end, timeZone: "Africa/Cairo" },
  };
  if (input.attendees && input.attendees.length > 0) body.attendees = input.attendees;
  if (input.meetingLink) body.location = input.meetingLink;

  const url = `${GATEWAY_BASE}/google_calendar/calendar/v3/calendars/${encodeURIComponent(account.calendar_id)}/events/${eventId}?sendUpdates=all`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: gwHeaders(account.connection_api_key),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[gcal] updateEvent failed ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}

export async function deleteEvent(account: GcalAccount, eventId: string): Promise<boolean> {
  const url = `${GATEWAY_BASE}/google_calendar/calendar/v3/calendars/${encodeURIComponent(account.calendar_id)}/events/${eventId}?sendUpdates=all`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: gwHeaders(account.connection_api_key),
  });
  return res.ok || res.status === 410; // 410 = already gone
}

export interface BusyRange { start: string; end: string; }

export async function getBusy(
  account: GcalAccount,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<BusyRange[]> {
  const url = `${GATEWAY_BASE}/google_calendar/calendar/v3/freeBusy`;
  const res = await fetch(url, {
    method: "POST",
    headers: gwHeaders(account.connection_api_key),
    body: JSON.stringify({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      timeZone: "Africa/Cairo",
      items: [{ id: account.calendar_id }],
    }),
  });
  if (!res.ok) {
    console.error(`[gcal] freeBusy failed ${res.status}: ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  const cal = data.calendars?.[account.calendar_id];
  return (cal?.busy ?? []) as BusyRange[];
}
