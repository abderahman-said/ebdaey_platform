// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimitGuard } from "../_shared/rate-limit.ts";
import { signBunnyEmbedUrl, fetchBunnyCdn } from "../_shared/bunny-embed-token.ts";

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_TRANSCRIPTION_BYTES = 24 * 1024 * 1024; // Groq hard cap
const SAFE_BATCH_BYTES = 22 * 1024 * 1024; // safety margin under Groq cap
const MAX_TOTAL_DURATION_SEC = 90 * 60; // 90 min ceiling

const parseBunny = (url: string) => {
  if (!url?.startsWith("bunny:")) return null;
  const [, lib, vid] = url.split(":");
  if (!lib || !vid) return null;
  return { lib, vid };
};

const invokeNextTranscript = (courseId?: string) => {
  if (!courseId) return;
  const run = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/qa-transcribe-lesson`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ course_id: courseId, queued: true }),
  }).catch((e) => console.warn("Next transcript trigger failed", e));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(run);
};

interface HlsSegment {
  url: string;
  duration: number; // seconds
  sequence: number;
}

const resolveHlsUrl = (uri: string, baseUrl: string) => {
  const resolved = new URL(uri, baseUrl);
  const base = new URL(baseUrl);
  if (!resolved.search && base.search) resolved.search = base.search;
  return resolved.toString();
};

async function discoverBunnyPlaylistUrl(
  lib: string,
  vid: string,
  headers: Record<string, string>,
): Promise<string | null> {
  const embedUrls = [
    `https://iframe.mediadelivery.net/embed/${lib}/${vid}?preload=true&responsive=true`,
    `https://iframe.mediadelivery.net/play/${lib}/${vid}`,
  ];

  for (const rawEmbedUrl of embedUrls) {
    const embedUrl = await signBunnyEmbedUrl(rawEmbedUrl, lib, vid);
    const res = await fetch(embedUrl, {
      headers: { ...headers, Accept: "text/html", "User-Agent": "Mozilla/5.0" },
    }).catch(() => null);
    if (!res?.ok) continue;
    const html = await res.text();
    const playlistMatch = html.match(/https:\/\/[^"'\\\s<>]+\/playlist\.m3u8[^"'\\\s<>]*/);
    if (playlistMatch?.[0]) return playlistMatch[0].replace(/&amp;/g, "&");

    const cdnHostMatch = html.match(/https:\/\/(vz-[^/"'\\\s<>]+\.b-cdn\.net)\//);
    if (cdnHostMatch?.[1]) return `https://${cdnHostMatch[1]}/${vid}/playlist.m3u8`;
  }

  const configuredHost = (Deno.env.get("BUNNY_CDN_HOST") || Deno.env.get("BUNNY_CDN_HOSTNAME"))
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (configuredHost) return `https://${configuredHost}/${vid}/playlist.m3u8`;

  // No guessed fallback: Bunny CDN hosts are not derived from the library id,
  // so a fabricated host would just fail later with a confusing error.
  console.warn("[qa-transcribe] could not discover CDN host", lib, vid);
  return null;
}

async function fetchBunnyHlsSegments(
  lib: string,
  vid: string,
): Promise<{ segments: HlsSegment[]; headers: Record<string, string> } | null> {
  const referer = `https://iframe.mediadelivery.net/embed/${lib}/${vid}`;
  const headers = { Referer: referer, Origin: "https://iframe.mediadelivery.net" };
  const playlistUrl = await discoverBunnyPlaylistUrl(lib, vid, headers);
  if (!playlistUrl) return null;

  // Bunny's CDN hostname is not the library id; discover it from the player page first.
  const masterRes = await fetchBunnyCdn(playlistUrl, { headers }, lib).catch(() => null);
  if (!masterRes || !masterRes.ok) return null;
  const masterText = await masterRes.text();

  // Parse variants to pick the lowest-bandwidth one (smallest = least bytes per second).
  const lines = masterText.split("\n").map((l) => l.trim());
  let chosenVariant: { bandwidth: number; uri: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#EXT-X-STREAM-INF")) {
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : Number.MAX_SAFE_INTEGER;
      const uri = lines[i + 1];
      if (uri && !uri.startsWith("#")) {
        if (!chosenVariant || bw < chosenVariant.bandwidth) {
          chosenVariant = { bandwidth: bw, uri };
        }
      }
    }
  }

  // If master had no variants, maybe playlist.m3u8 IS a media playlist already.
  const mediaUrl = chosenVariant
    ? resolveHlsUrl(chosenVariant.uri, playlistUrl)
    : playlistUrl;

  const mediaRes = await fetchBunnyCdn(mediaUrl, { headers }, lib).catch(() => null);
  if (!mediaRes || !mediaRes.ok) return null;
  const mediaText = await mediaRes.text();

  const segments: HlsSegment[] = [];
  const mediaLines = mediaText.split("\n").map((l) => l.trim());
  let pendingDuration = 0;
  let mediaSequence = 0;
  let keyUrl: string | null = null;
  let keyIvHex: string | null = null;
  for (const line of mediaLines) {
    if (line.startsWith("#EXT-X-MEDIA-SEQUENCE:")) {
      const m = line.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
      if (m) mediaSequence = parseInt(m[1], 10);
    } else if (line.startsWith("#EXT-X-KEY")) {
      // MediaCage Basic encrypts HLS segments with AES-128.
      if (/METHOD=NONE/i.test(line)) {
        keyUrl = null;
        keyIvHex = null;
      } else {
        const uriMatch = line.match(/URI="([^"]+)"/);
        if (uriMatch?.[1]) keyUrl = resolveHlsUrl(uriMatch[1], mediaUrl);
        const ivMatch = line.match(/IV=0x([0-9a-fA-F]+)/);
        keyIvHex = ivMatch?.[1] ?? null;
      }
    } else if (line.startsWith("#EXTINF:")) {
      const m = line.match(/#EXTINF:([\d.]+)/);
      pendingDuration = m ? parseFloat(m[1]) : 0;
    } else if (line && !line.startsWith("#")) {
      const segUrl = resolveHlsUrl(line, mediaUrl);
      segments.push({
        url: segUrl,
        duration: pendingDuration,
        sequence: mediaSequence + segments.length,
      });
      pendingDuration = 0;
    }
  }

  if (!segments.length) return null;
  return { segments, headers, keyUrl, keyIvHex };
}

const hexToBytes = (hex: string) => {
  const clean = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
};

const sequenceIv = (sequence: number) => {
  const iv = new Uint8Array(16);
  const view = new DataView(iv.buffer);
  // HLS default IV: the media sequence number as a 128-bit big-endian value.
  view.setUint32(12, sequence >>> 0);
  return iv;
};

async function decryptSegment(
  bytes: Uint8Array,
  key: CryptoKey,
  sequence: number,
  keyIvHex: string | null,
): Promise<Uint8Array> {
  const iv = keyIvHex ? hexToBytes(keyIvHex) : sequenceIv(sequence);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
    return new Uint8Array(plain);
  } catch (err) {
    console.warn(`Segment ${sequence} decryption failed:`, err);
    return bytes;
  }
}

async function transcribeBunnyMp4(
  lib: string,
  vid: string,
  groqKey: string,
): Promise<{ text: string; segments: any[] } | null> {
  const referer = `https://iframe.mediadelivery.net/embed/${lib}/${vid}`;
  const headers = { Referer: referer, Origin: "https://iframe.mediadelivery.net", "User-Agent": "Mozilla/5.0" };
  const playlistUrl = await discoverBunnyPlaylistUrl(lib, vid, headers);
  const assetBase = new URL("./", playlistUrl).toString();
  const candidates = ["play_240p.mp4", "play_360p.mp4", "play_480p.mp4"];

  for (const filename of candidates) {
    const url = new URL(filename, assetBase).toString();
    const head = await fetchBunnyCdn(url, { method: "HEAD", headers }, lib).catch(() => null);
    const size = Number(head?.headers.get("content-length") || 0);
    if (!head?.ok || !size || size > SAFE_BATCH_BYTES) continue;

    const mediaRes = await fetchBunnyCdn(url, { headers }, lib);
    if (!mediaRes.ok) continue;
    const blob = await mediaRes.blob();
    if (!blob.size || blob.size > MAX_TRANSCRIPTION_BYTES) continue;

    const data = await transcribeBlob(new Blob([blob], { type: "video/mp4" }), groqKey, filename);
    return { text: data.text || "", segments: data.segments || [] };
  }

  return null;
}

async function transcribeBlob(blob: Blob, groqKey: string, filename: string) {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "ar");
  form.append("response_format", "verbose_json");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq error ${res.status}: ${txt}`);
  }
  return await res.json();
}

async function transcribeBunnyViaHls(
  lib: string,
  vid: string,
  groqKey: string,
): Promise<{ text: string; segments: any[] }> {
  const mp4Result = await transcribeBunnyMp4(lib, vid, groqKey);
  if (mp4Result?.text) return mp4Result;

  const hls = await fetchBunnyHlsSegments(lib, vid);
  if (!hls) throw new Error("تعذّر قراءة قائمة تشغيل الفيديو من Bunny.");

  const totalDuration = hls.segments.reduce((s, x) => s + x.duration, 0);
  if (totalDuration > MAX_TOTAL_DURATION_SEC) {
    throw new Error(
      `الفيديو طويل جداً (${Math.round(totalDuration / 60)} دقيقة). الحد الأقصى 90 دقيقة.`,
    );
  }

  // Download all segments (sequentially to be gentle on Bunny + memory).
  type Loaded = { bytes: Uint8Array; duration: number };
  const loaded: Loaded[] = [];
  let cryptoKey: CryptoKey | null = null;
  if (hls.keyUrl) {
    const keyRes = await fetchBunnyCdn(hls.keyUrl, { headers: hls.headers }).catch(() => null);
    if (!keyRes?.ok) throw new Error("تعذّر جلب مفتاح فك تشفير الفيديو من Bunny.");
    const keyBytes = new Uint8Array(await keyRes.arrayBuffer());
    cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, [
      "decrypt",
    ]);
  }

  for (const seg of hls.segments) {
    const res = await fetchBunnyCdn(seg.url, { headers: hls.headers });
    if (!res.ok) throw new Error(`Segment fetch failed: ${res.status}`);
    let buf = new Uint8Array(await res.arrayBuffer());
    if (cryptoKey) buf = await decryptSegment(buf, cryptoKey, seg.sequence, hls.keyIvHex);
    loaded.push({ bytes: buf, duration: seg.duration });
  }

  // Group segments into batches under SAFE_BATCH_BYTES.
  type Batch = { parts: Uint8Array[]; durationBefore: number; totalBytes: number };
  const batches: Batch[] = [];
  let cumulative = 0;
  let current: Batch = { parts: [], durationBefore: 0, totalBytes: 0 };
  for (const item of loaded) {
    // If a single segment is bigger than the cap, we still send it alone.
    if (current.totalBytes + item.bytes.byteLength > SAFE_BATCH_BYTES && current.parts.length > 0) {
      batches.push(current);
      current = { parts: [], durationBefore: cumulative, totalBytes: 0 };
    }
    current.parts.push(item.bytes);
    current.totalBytes += item.bytes.byteLength;
    cumulative += item.duration;
  }
  if (current.parts.length) batches.push(current);

  const texts: string[] = [];
  const mergedSegments: any[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    // Concatenate MPEG-TS segments; Groq accepts MPEG containers by extension/type.
    const blob = new Blob(batch.parts as BlobPart[], { type: "video/mpeg" });
    if (blob.size > MAX_TRANSCRIPTION_BYTES) {
      console.warn(`Batch ${i} exceeds Groq cap (${blob.size} bytes); skipping.`);
      continue;
    }
    try {
      const data = await transcribeBlob(blob, groqKey, `chunk-${i}.mpeg`);
      const offset = batch.durationBefore;
      if (data.text) texts.push(String(data.text).trim());
      if (Array.isArray(data.segments)) {
        for (const s of data.segments) {
          mergedSegments.push({
            ...s,
            start: (s.start ?? 0) + offset,
            end: (s.end ?? 0) + offset,
          });
        }
      }
    } catch (err) {
      console.warn(`Batch ${i} transcription failed:`, err);
      // continue with remaining batches
    }
  }

  if (!texts.length) {
    throw new Error("فشل تفريغ الفيديو: ملف 240p أكبر من حد Groq، وأجزاء HLS لا تُقبل مباشرة من Whisper.");
  }

  return { text: texts.join("\n"), segments: mergedSegments };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestBody: any = {};
  let activeLessonId: string | undefined;
  let activeCourseId: string | undefined;
  try {
    const { requireRole, callerOwnsTenant } = await import("../_shared/require-role.ts");
    const auth = await requireRole(req, ["mentor", "admin"]);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const limited = await rateLimitGuard(req, { name: "qa-transcribe", max: 10, windowSeconds: 300 }, corsHeaders);
  if (limited) return limited;



    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    requestBody = await req.json();
    let lesson_id = requestBody.lesson_id as string | undefined;
    const queuedCourseId = requestBody.course_id as string | undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!lesson_id && queuedCourseId) {
      const { data: pending } = await supabase
        .from("lesson_transcripts")
        .select("lesson_id")
        .eq("course_id", queuedCourseId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      lesson_id = pending?.lesson_id;
      if (!lesson_id) {
        return new Response(JSON.stringify({ ok: true, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!lesson_id) throw new Error("lesson_id required");
    activeLessonId = lesson_id;

    const { data: lesson, error: lErr } = await supabase
      .from("lessons")
      .select("id, video_url, audio_url, tenant_id, section_id, course_sections!inner(course_id)")
      .eq("id", lesson_id)
      .single();
    if (lErr || !lesson) throw new Error("Lesson not found");

    // Tenant isolation: only the owning mentor, an admin, or internal
    // service-role callers may transcribe this lesson.
    if (!(await callerOwnsTenant(auth.user?.id, (lesson as any).tenant_id))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseId = (lesson as any).course_sections.course_id;
    activeCourseId = courseId;

    const mediaUrl = lesson.video_url || lesson.audio_url;
    if (!mediaUrl) throw new Error("No media");

    // Upsert processing
    await supabase.from("lesson_transcripts").upsert({
      lesson_id,
      course_id: courseId,
      tenant_id: lesson.tenant_id,
      status: "processing",
      provider: "groq-whisper",
      error: null,
    }, { onConflict: "lesson_id" });

    let transcript = "";
    let segments: any[] = [];

    const bunny = parseBunny(mediaUrl);
    if (bunny) {
      // Bunny videos: use HLS chunking — handles any length within MAX_TOTAL_DURATION_SEC.
      const result = await transcribeBunnyViaHls(bunny.lib, bunny.vid, groqKey);
      transcript = result.text;
      segments = result.segments;
    } else {
      // Direct URL (audio_url, etc.) — fetch once and send to Groq.
      const mediaRes = await fetch(mediaUrl);
      if (!mediaRes.ok) throw new Error(`Media fetch failed: ${mediaRes.status}`);
      const blob = await mediaRes.blob();
      if (blob.size > MAX_TRANSCRIPTION_BYTES) {
        throw new Error(`الملف كبير جداً (${(blob.size/1024/1024).toFixed(1)}MB). الحد الأقصى 24MB.`);
      }
      const data = await transcribeBlob(blob, groqKey, "audio.mp4");
      transcript = data.text || "";
      segments = data.segments || [];
    }

    await supabase.from("lesson_transcripts").update({
      status: "done",
      transcript_text: transcript,
      segments,
      error: null,
    }).eq("lesson_id", lesson_id);

    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/qa-index-lesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ lesson_id }),
      });
    } catch (e) {
      console.warn("Index trigger failed", e);
    }

    invokeNextTranscript(courseId);

    return new Response(JSON.stringify({ ok: true, length: transcript.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("qa-transcribe-lesson error:", e);
    try {
      const failedLessonId = activeLessonId || requestBody.lesson_id;
      if (failedLessonId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("lesson_transcripts").update({
          status: "failed",
          error: e.message,
        }).eq("lesson_id", failedLessonId);
        const { data: row } = await supabase
          .from("lesson_transcripts")
          .select("course_id")
          .eq("lesson_id", failedLessonId)
          .maybeSingle();
        invokeNextTranscript(row?.course_id || activeCourseId || requestBody.course_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
