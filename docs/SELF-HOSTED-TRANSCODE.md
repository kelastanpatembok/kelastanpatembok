# Self-Hosted Video Transcoding (FFmpeg)

This solution uses FFmpeg on your own server to transcode videos to HLS, without relying on Google Cloud Functions or Google Transcoder API.

## How It Works

1. **Upload**: User uploads a video → saved to Firebase Storage
2. **Trigger**: App calls `/api/video/transcode` with video path
3. **Transcode**: Server downloads video, uses FFmpeg to generate HLS segments
4. **Upload HLS**: Segments and manifest uploaded back to Storage
5. **Update**: Lesson document updated with `hlsManifestPath` and `videoStatus: "ready"`

## Requirements

### Server-Side
- **FFmpeg must be installed** on your server:
  - **Linux/Debian**: `apt-get install ffmpeg`
  - **macOS**: `brew install ffmpeg`
  - **Windows**: Download from https://ffmpeg.org/download.html
  - **Docker**: Add `RUN apt-get update && apt-get install -y ffmpeg` to your Dockerfile

### Deployment Platform Considerations

#### ✅ Works Well On:
- **Self-hosted VM/Server**: Full control, can install FFmpeg
- **Docker Containers**: Can include FFmpeg in image
- **Cloud Run (GCP)**: Custom Docker image with FFmpeg
- **Railway/Render/Fly.io**: Can install FFmpeg in build

#### ⚠️ Limited On:
- **Vercel**: 
  - Hobby: 10s timeout (too short for video transcoding)
  - Pro: 60s timeout (may work for short videos)
  - FFmpeg not available by default (would need custom runtime)
- **Netlify Functions**: Similar timeout limits
- **Serverless Functions**: Generally too short for video processing

## Usage

The transcoding is automatically triggered after video upload completes. The flow:

```typescript
// In video-upload.tsx onUploadComplete callback:
1. Save video to Storage → get storagePath
2. Update lesson: { videoStatus: "processing", sourceVideoPath }
3. Call POST /api/video/transcode with { platformId, courseId, lessonId, sectionId, sourceVideoPath }
4. API downloads, transcodes, uploads HLS, updates lesson
5. Lesson: { hlsManifestPath: ".../hls/manifest.m3u8", videoStatus: "ready" }
```

## API Endpoint

### `POST /api/video/transcode`

**Request Body:**
```json
{
  "platformId": "ZOhztzmaWMIwumG40zJB",
  "courseId": "75UrXKFhXcq0oEtiOpp8",
  "lessonId": "ryvOF8dRj0XhZ6gXfIRT",
  "sectionId": "I2vICwSK7NB06dS2AVXy",
  "sourceVideoPath": "platforms/.../lessons/.../video.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "hlsManifestPath": "platforms/.../lessons/.../hls/manifest.m3u8",
  "hlsManifestUrl": "https://...",
  "segmentCount": 15,
  "message": "Video transcoded successfully"
}
```

**Errors:**
- `503`: FFmpeg not available on server
- `400`: Missing fields or lesson not in "processing" state
- `404`: Lesson not found
- `500`: Transcoding failed (check server logs)

## FFmpeg Configuration

Current settings (in `/api/video/transcode`):
- **Codec**: H.264 (libx264) for video, AAC for audio
- **Segment Duration**: 10 seconds
- **Format**: HLS (.m3u8 manifest + .ts segments)

To customize:
1. Edit `transcodeToHLS()` function in `/api/video/transcode/route.ts`
2. Adjust FFmpeg flags:
   - `-hls_time 10`: Segment duration
   - `-crf 23`: Quality (lower = better, 18-28 range)
   - `-preset slow`: Encoding speed (faster = lower quality)

## Alternatives for Production

### Option 1: Background Worker (Recommended)
- Separate Node.js service/Docker container
- Runs transcoding jobs from a queue (Bull, BullMQ, etc.)
- No timeout limits
- Can scale independently

### Option 2: Firebase Storage Trigger + Custom Cloud Function
- Still your code, but hosted on Firebase
- Triggered automatically on upload
- No timeout for background functions

### Option 3: Cloud Run Job
- Docker container with FFmpeg
- Runs on-demand via API trigger
- Up to 24 hours execution time
- Pay per use

### Option 4: Client-Side Transcoding (Not Recommended)
- Use `ffmpeg.wasm` in browser
- Slow, blocks UI, not practical for large files

## Testing Locally

1. Install FFmpeg:
   ```bash
   brew install ffmpeg  # macOS
   # or apt-get install ffmpeg  # Linux
   ```

2. Verify:
   ```bash
   ffmpeg -version
   ```

3. Upload a video in the app and check:
   - Console logs for transcoding progress
   - Firebase Storage for HLS files under `.../hls/`
   - Lesson document: `hlsManifestPath` and `videoStatus: "ready"`

## Troubleshooting

**Error: "FFmpeg not available"**
- Install FFmpeg on server: `apt-get install ffmpeg` or `brew install ffmpeg`
- Verify: `ffmpeg -version`

**Transcoding times out**
- Use background worker instead of API route
- Increase timeout limits (if on Vercel Pro, max 60s)
- Consider Cloud Run Job for longer videos

**HLS files not uploading**
- Check Firebase Storage permissions
- Verify storage rules allow write to `platforms/{platformId}/courses/{courseId}/lessons/{lessonId}/hls/**`

**Video quality issues**
- Adjust FFmpeg `-crf` value (lower = higher quality, larger files)
- Consider multi-bitrate HLS for adaptive streaming

