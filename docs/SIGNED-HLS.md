Tokenized HLS (short‑lived signed URLs)

1) API route: `src/app/api/video/sign/route.ts` returns a V4 signed URL for a given GCS object path. Env:
   - `GCS_BUCKET` (default `rwid-community.firebasestorage.app`)
   - `SIGNED_URL_TTL_MS` (default `60000`)

2) Prereqs: Install `@google-cloud/storage` on the server and provide credentials via `GOOGLE_APPLICATION_CREDENTIALS` (or workload identity).

3) Usage: Player calls `/api/video/sign?path=platforms/<pid>/courses/<cid>/lessons/<lid>/hls/manifest.m3u8` and receives `{ url: <signed> }` to fetch.

4) Notes: Keep TTL small, enforce auth in the API, and store HLS assets under lesson `hls/` path. CORS is not needed for signed URLs to `*.googleapis.com`.


