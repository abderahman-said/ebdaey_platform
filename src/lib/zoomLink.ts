/**
 * Sanitizes any meeting link before it is shown to a student.
 *
 * Zoom "start" links (https://.../s/<id>?zak=...) carry a host token: whoever
 * opens one becomes the meeting host. Those links must never reach a student,
 * even if a mentor pasted one manually as the course meeting link.
 */
export function sanitizeStudentMeetingLink(link?: string | null): string | null {
  if (!link) return null;
  const raw = link.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  const isZoom = /(^|\.)zoom\.us$/i.test(url.hostname);
  if (!isZoom) return raw;

  // Drop host tokens.
  url.searchParams.delete("zak");
  url.searchParams.delete("tk");

  // Convert a host start link (/s/<id>) into a plain join link (/j/<id>).
  const startMatch = url.pathname.match(/^\/s\/(\d+)$/);
  if (startMatch) {
    url.pathname = `/j/${startMatch[1]}`;
  }

  return url.toString();
}
