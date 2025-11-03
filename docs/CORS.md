# Firebase Storage CORS – Troubleshooting and Fix

This app performs resumable uploads (video) from `http://localhost:3000` to Firebase Storage. If you see errors like:

"Access to XMLHttpRequest ... has been blocked by CORS policy: Response to preflight request doesn't pass access control check"

it means the browser's preflight (OPTIONS) request didn't receive the expected CORS headers from the bucket endpoint.

## 1) Identify the ACTUAL bucket name

Do not confuse the bucket host with the bucket ID. Check via either:

- Firebase Console → Build → Storage → Files (bucket name shown at the top), or
- gcloud/gsutil:
  - `gcloud config set project <PROJECT_ID>`
  - `gsutil ls -p <PROJECT_ID>`

In this project the bucket is:

```
gs://rwid-community.firebasestorage.app/
```

Ensure your client config (`src/lib/firebase.ts`) uses the same bucket in `storageBucket`.

## 2) Set CORS on that exact bucket

Use either Google Cloud Console or `gsutil`. The JSON below includes headers required by Firebase's resumable uploads.

cors.json
```
[
  {
    "origin": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Authorization",
      "Content-Type",
      "Content-MD5",
      "X-Upload-Content-Type",
      "X-Upload-Content-Length",
      "x-goog-resumable",
      "x-goog-meta-*"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Apply with Console:

- Cloud Console → Storage → Buckets → `rwid-community.firebasestorage.app` → Configuration → CORS → Edit → paste JSON → Save

Or with CLI:

```
gsutil cors set cors.json gs://rwid-community.firebasestorage.app
gsutil cors get gs://rwid-community.firebasestorage.app
```

Common pitfall: applying CORS to a non-existent bucket like `gs://rwid-community.appspot.com` or to the host name without the `gs://` prefix will fail or have no effect.

## 3) Verify Security Rules (separate from CORS)

Storage Rules must allow the write path your code uses. For lesson videos we upload to:

`platforms/{platformId}/courses/{courseId}/lessons/{lessonId}/video.ext`

Example rules snippet:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() { return request.auth != null; }
    function isOwner(platformId) {
      return isSignedIn() &&
             get(/databases/(default)/documents/platforms/$(platformId)).data.ownerId == request.auth.uid;
    }
    function isMember(platformId) {
      return isSignedIn() &&
             exists(/databases/(default)/documents/platforms/$(platformId)/members/$(request.auth.uid));
    }

    match /platforms/{platformId}/courses/{courseId}/lessons/{lessonId}/{file=**} {
      allow read: if true;                // adjust as needed
      allow write: if isOwner(platformId) || isMember(platformId);
    }
  }
}
```

## 4) Client configuration

Ensure `src/lib/firebase.ts` points to the same bucket you configured CORS on:

```
storageBucket: "rwid-community.firebasestorage.app",
```

## 5) After changes

- Hard refresh the app or use a new Incognito window (cache can keep old preflight results)
- In DevTools → Network, check the preflight OPTIONS call returns 200/204 with CORS headers

## Quick checklist

- [ ] Bucket name in code matches the real bucket
- [ ] CORS set on that exact bucket (Console or gsutil)
- [ ] Storage Rules allow your upload path
- [ ] Preflight OPTIONS returns OK with CORS headers


