Automatic HLS generation (no manual steps)

Goal: When a lesson video is uploaded, a background job transcodes it to HLS and updates the lesson with `hlsManifestPath` so the player streams chunk‑by‑chunk automatically.

Pipeline
1) Upload in app (already done): we save the source MP4 to
   `platforms/<platformId>/courses/<courseId>/lessons/<lessonId>/video.<ext>` and mark the lesson:
   - `videoStatus: "processing"`
   - `sourceVideoPath: <above path>`

2) Background transcode - **Two Options:**

   **Option A: Self-Hosted FFmpeg (Current Implementation)**
   - Uses `/api/video/transcode` endpoint with FFmpeg on your server
   - No external services required
   - See `docs/SELF-HOSTED-TRANSCODE.md` for details
   - **Pros**: Full control, no vendor lock-in
   - **Cons**: Requires FFmpeg on server, may hit timeout limits on serverless platforms

   **Option B: Google Transcoder API + Cloud Functions**
   - Trigger: Firestore onWrite of the lesson (when `videoStatus == "processing"` and `sourceVideoPath` present), or a Storage finalize trigger for the source path.
   - Action: Create a Transcoder Job:
     - Input: `gs://<bucket>/<sourceVideoPath>`
     - Output: `gs://<bucket>/platforms/<pid>/courses/<cid>/lessons/<lid>/hls/`
     - Preset: HLS (CMAF) multi-bitrate (480p/720p/1080p) or your chosen template
   - On job success: update lesson doc with
     - `hlsManifestPath: platforms/<pid>/courses/<cid>/lessons/<lid>/hls/manifest.m3u8`
     - `videoStatus: "ready"`
   - On failure: set `videoStatus: "failed"` and log the error.
   - **Pros**: Managed service, no server maintenance, scales automatically
   - **Cons**: Requires Google Cloud setup, costs per transcoding job

3) Playback in app:
   - If `hlsManifestPath` exists: player uses short‑lived signed URLs to stream manifest and segments.
   - Else if `videoUrl` and `videoStatus == "processing"`: show "Processing video…" until ready.

## Setup for Option A (Self-Hosted)

See `docs/SELF-HOSTED-TRANSCODE.md` for complete instructions.

Quick setup:
1. Install FFmpeg on server: `apt-get install ffmpeg` or `brew install ffmpeg`
2. Deploy app (API route `/api/video/transcode` already included)
3. Upload video → transcoding happens automatically

## Setup for Option B (Google Transcoder)

Minimum setup steps:
1) Enable Transcoder API in GCP project
2) Create a service account with permissions: Transcoder Admin, Storage Object Admin, Firestore read/write (if using Firestore trigger).
3) Deploy a Cloud Function (Node 18+) with the trigger of your choice (Storage or Firestore) that:
   - Reads platform/course/lesson IDs and `sourceVideoPath`
   - Creates a Transcoder Job to the `hls/` directory
   - Updates the lesson doc on success/failure

References
- Transcoder API: https://cloud.google.com/transcoder/docs
- Example job templates: https://cloud.google.com/transcoder/docs/how-to/job-templates


