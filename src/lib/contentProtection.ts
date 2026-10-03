import { supabase } from "@/integrations/supabase/client";

export type ProtectionEventType =
  | "screen_recording"
  | "devtools_open"
  | "print_screen"
  | "print_attempt"
  | "copy_attempt"
  | "save_attempt"
  | "watermark_session";

/** Event recorded when a student views protected content with the watermark on. */
export const WATERMARK_EVENT: ProtectionEventType = "watermark_session";

export const PROTECTION_EVENT_LABELS: Record<ProtectionEventType | string, string> = {
  screen_recording: "تسجيل شاشة",
  devtools_open: "فتح أدوات المتصفح",
  print_screen: "زر لقطة الشاشة",
  print_attempt: "محاولة طباعة",
  copy_attempt: "محاولة نسخ",
  save_attempt: "محاولة حفظ الصفحة",
  watermark_session: "مشاهدة بعلامة مائية",
};

export interface ProtectionContext {
  tenantId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  fingerprint?: string | null;
}

const lastSent = new Map<string, number>();
const THROTTLE_MS = 60_000;

/** Records a capture attempt. Never throws — protection must not break playback. */
export async function logProtectionEvent(
  eventType: ProtectionEventType,
  ctx: ProtectionContext,
  throttleMs: number = THROTTLE_MS,
): Promise<void> {
  if (!ctx.studentId || !ctx.tenantId) return;

  const key = `${eventType}:${ctx.lessonId || ctx.courseId || "-"}`;
  const now = Date.now();
  const previous = lastSent.get(key) || 0;
  if (now - previous < throttleMs) return;
  lastSent.set(key, now);

  try {
    await supabase.from("content_protection_events").insert({
      tenant_id: ctx.tenantId,
      student_id: ctx.studentId,
      course_id: ctx.courseId || null,
      lesson_id: ctx.lessonId || null,
      event_type: eventType,
      session_fingerprint: ctx.fingerprint || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch {
    /* ignore */
  }
}

/** Event types that mean the student actually tried to screen-record content. */
export const CAPTURE_EVENT_TYPES: ProtectionEventType[] = ["screen_recording"];

/**
 * True when this student already has a recorded screen-recording
 * attempt, so the watermark must stay on for them on later views too.
 */
export async function hasCaptureHistory(studentId: string): Promise<boolean> {
  try {
    // Students can't read the events table directly (admin-only RLS),
    // so use a scoped security-definer check on their own record.
    const { data } = await (supabase.rpc as any)("has_my_capture_history", {
      _student_id: studentId,
    });
    return data === true;
  } catch {
    return false;
  }
}


let watermarkFlag: boolean | null = null;

/** Global watermark switch managed by platform admins (defaults to on). */
export async function isWatermarkEnabled(): Promise<boolean> {
  if (watermarkFlag !== null) return watermarkFlag;
  try {
    const { data } = await supabase
      .from("platform_feature_flags")
      .select("enabled")
      .eq("key", "content_watermark_enabled")
      .maybeSingle();
    watermarkFlag = data ? !!data.enabled : true;
  } catch {
    watermarkFlag = true;
  }
  return watermarkFlag;
}

export interface StudentRestriction {
  id: string;
  scope: string;
  course_id: string | null;
  reason: string | null;
}

/** Active admin restrictions for a student (account-wide or per course). */
export async function fetchStudentRestrictions(studentId: string): Promise<StudentRestriction[]> {
  try {
    const { data } = await supabase
      .from("student_content_restrictions")
      .select("id, scope, course_id, reason")
      .eq("student_id", studentId)
      .eq("is_active", true);
    return (data || []) as StudentRestriction[];
  } catch {
    return [];
  }
}

export function findBlockingRestriction(
  restrictions: StudentRestriction[],
  courseId: string | null | undefined,
): StudentRestriction | null {
  const account = restrictions.find((r) => r.scope === "account");
  if (account) return account;
  if (!courseId) return null;
  return restrictions.find((r) => r.scope === "course" && r.course_id === courseId) || null;
}
