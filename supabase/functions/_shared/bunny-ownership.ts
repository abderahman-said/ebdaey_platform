import { createClient } from "npm:@supabase/supabase-js@2";

const adminClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** Record which user/tenant created a Bunny video slot. */
export async function recordBunnyVideoOwner(userId: string, videoId: string, libraryId: string) {
  if (!userId || userId === "service_role") return;
  const admin = adminClient();
  const { data: t } = await admin.from("tenants").select("id").eq("owner_id", userId).maybeSingle();
  const { error } = await admin.from("bunny_video_owners").upsert({
    video_id: videoId, library_id: libraryId, user_id: userId, tenant_id: t?.id ?? null,
  });
  if (error) console.error("[bunny-ownership] record failed", error.message);
}

/**
 * True when the caller may act on this Bunny video: admin / service, the user
 * who created it, or the owner of a tenant whose content references it.
 */
export async function callerOwnsBunnyVideo(userId: string, videoId: string): Promise<boolean> {
  if (!userId) return false;
  if (userId === "service_role") return true;
  const admin = adminClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if ((roles || []).some((r: any) => r.role === "admin")) return true;

  const { data: own } = await admin.from("bunny_video_owners").select("user_id, tenant_id").eq("video_id", videoId).maybeSingle();
  const { data: t } = await admin.from("tenants").select("id").eq("owner_id", userId).maybeSingle();
  if (own) return own.user_id === userId || (!!t?.id && own.tenant_id === t.id);
  if (!t?.id) return false;

  // Legacy videos created before ownership was recorded: accept if the
  // caller's own content already references the video.
  const pat = `*${videoId}*`;
  const checks = await Promise.all([
    admin.from("lessons").select("id").eq("tenant_id", t.id).or(`video_url.like."${pat}",audio_url.like."${pat}"`).limit(1),
    admin.from("courses").select("id").eq("tenant_id", t.id).like("banner_video_url", `%${videoId}%`).limit(1),
    admin.from("live_courses").select("id").eq("tenant_id", t.id).like("banner_video_url", `%${videoId}%`).limit(1),
    admin.from("digital_products").select("id").eq("tenant_id", t.id).like("banner_video_url", `%${videoId}%`).limit(1),
  ]);
  checks.forEach((r) => r.error && console.error("[bunny-ownership] lookup", r.error.message));
  if (checks.some((r) => (r.data || []).length > 0)) return true;
  // Refuse if any other academy's content already uses this video.
  const others = await Promise.all([
    admin.from("lessons").select("id").or(`video_url.like."${pat}",audio_url.like."${pat}"`).limit(1),
    admin.from("courses").select("id").like("banner_video_url", `%${videoId}%`).limit(1),
    admin.from("live_courses").select("id").like("banner_video_url", `%${videoId}%`).limit(1),
    admin.from("digital_products").select("id").like("banner_video_url", `%${videoId}%`).limit(1),
  ]);
  if (others.some((r) => (r.data || []).length > 0)) return false;
  // Fresh upload not yet saved into any content and created before ownership
  // was recorded: claim it for this mentor so the editor can finish showing it.
  await recordBunnyVideoOwner(userId, videoId, "");
  console.warn("[bunny-ownership] claimed unrecorded video", videoId);
  return true;
}
