---
name: Bunny.net Stream Integration
description: Video hosting via Bunny.net Stream - upload via edge function, playback via iframe embed
type: feature
---
- Videos uploaded via `bunny-upload` edge function (authenticated, FormData)
- Video status checked via `bunny-status` edge function
- Stored URL format: `bunny:{libraryId}:{videoId}`
- Playback: Bunny.net iframe embed (`iframe.mediadelivery.net/embed/{lib}/{id}`)
- Helper utilities in `src/lib/bunny.ts`: `isBunnyUrl`, `getBunnyEmbedUrl`, `parseBunnyUrl`
- Non-video files still use Supabase Storage (course-assets bucket)
- Secrets: `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID`
