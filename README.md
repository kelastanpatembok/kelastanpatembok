RWID Community is a community-focused social learning platform built with Next.js, Tailwind CSS v4, and shadcn/ui.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` with your environment variables (see Environment below).

3. Run the development server (Turbopack by default):

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
npm start
```

## Key Tech

- Next.js 16 (App Router) with React 19
- Tailwind CSS v4
- shadcn/ui components (Radix + CVA)
- Firebase (Auth, Firestore, Storage, optional Analytics)
- Midtrans Snap for payments
- HLS.js for video playback
- Mock data in JSON under `src/data`

## Features

- Multi-platform and community spaces with feeds, forums, and stories
- Courses with multiple lesson types: article, video (HLS), quiz
- Basic auth/session (mock users + cookie session) and Google OAuth ready
- Payments via Midtrans Snap token API
- Video pipeline: self-hosted transcode (FFmpeg) and signed URL delivery
- Command palette, keyboard shortcuts, and rich text editor (Lexical)

## Branding

- Primary color: `#66b132` (RWID brand)

## Project Structure

- `src/app`: routes and layout (App Router)
- `src/components`: shared UI and layout components
- `src/data`: mock JSON data (users, posts, courses, communities)
- `src/lib`: helpers (`firebase.ts`, `session.ts`, `utils.ts`)
- `src/types`: type declarations (incl. `midtrans-client.d.ts`)
- `docs`: setup guides for OAuth, CORS, signed HLS, and transcode

## Scripts

- `npm run dev`: start Next.js dev server
- `npm run build`: build for production
- `npm start`: run production server
- `npm run lint`: run ESLint

## Environment

Create `.env.local` at the project root. Relevant variables found in the codebase:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase (client-side usage)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Midtrans
MIDTRANS_SERVER_KEY=...
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=...

# Google Cloud Storage (for signed URLs)
GCS_BUCKET=your-bucket-name
SIGNED_URL_TTL_MS=60000
```

Notes:
- React Compiler is enabled in `next.config.ts` via `reactCompiler: true`.
- `@google-cloud/storage` is treated as an optional server dependency (see `next.config.ts`). Install it on your server if you use the signing endpoint.
- FFmpeg must be installed on the host if you use self-hosted transcode.

## API Routes (selected)

- Auth
  - `POST /api/auth/login` — mock login using users from `src/data/users.json`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Payments
  - `POST /api/payment/snap-token` — create Midtrans Snap token
- Video
  - `GET /api/video/sign?path=...` — V4 signed URL for GCS object
  - `POST /api/video/transcode` — run FFmpeg HLS transcode and upload to Storage

## Documentation

- CORS setup: `docs/CORS.md`
- Google OAuth setup: `docs/GOOGLE-OAUTH-SETUP.md`
- Signed HLS overview: `docs/SIGNED-HLS.md`
- Video transcode notes: `docs/VIDEO-TRANSCODE.md`
- Self-hosted transcode guide: `docs/SELF-HOSTED-TRANSCODE.md`

## Notes

- Uses Turbopack by default in development.
- Local mock data powers most pages; swap with real backend as needed.
