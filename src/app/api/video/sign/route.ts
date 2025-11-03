import { NextRequest, NextResponse } from "next/server";

// Minimal auth check stub – replace with your real auth/membership logic
async function requireAuthAndAuthorize(req: NextRequest, _objectPath: string) {
  // Example: read a cookie/header or call your existing auth util
  // For now we only ensure the request comes from a logged-in user via Firebase session cookie, etc.
  return { allowed: true };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const objectPath = url.searchParams.get("path");
    if (!objectPath) {
      return NextResponse.json({ error: "Missing 'path' query parameter" }, { status: 400 });
    }

    const authz = await requireAuthAndAuthorize(req, objectPath);
    if (!authz.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Dynamically require to avoid build-time dependency if GCP SDK not installed
    // Module is marked as external in webpack config, so it won't be bundled
    let StorageCtor: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      StorageCtor = require("@google-cloud/storage").Storage;
    } catch (_e) {
      return NextResponse.json(
        {
          error: "@google-cloud/storage not installed on server",
          hint:
            "Install it on your server (npm i @google-cloud/storage) and set GOOGLE_APPLICATION_CREDENTIALS or GCP credentials for V4 signing.",
        },
        { status: 501 }
      );
    }

    const bucketName = process.env.GCS_BUCKET || "rwid-community.firebasestorage.app";
    const expiresMs = Number(process.env.SIGNED_URL_TTL_MS || 60_000);

    const storage = new StorageCtor();
    const file = storage.bucket(bucketName).file(objectPath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresMs,
    });

    return NextResponse.json({ url: signedUrl, expiresInMs: expiresMs });
  } catch (err: any) {
    console.error("/api/video/sign error", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}


