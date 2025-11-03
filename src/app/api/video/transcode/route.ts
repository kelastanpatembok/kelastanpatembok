import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Self-hosted video transcoding using FFmpeg
 * 
 * Requirements:
 * - FFmpeg must be installed on the server
 * - For Vercel: Use Vercel Pro (60s timeout) or consider Firebase Functions/Cloud Run
 * - For self-hosted/VM: Install FFmpeg: `apt-get install ffmpeg` or `brew install ffmpeg`
 * 
 * This endpoint:
 * 1. Downloads the source video from Storage
 * 2. Transcodes it to HLS using FFmpeg
 * 3. Uploads HLS segments and manifest back to Storage
 * 4. Updates the lesson document with hlsManifestPath
 */

// Check if FFmpeg is available
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

// Transcode video to HLS
async function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  lessonId: string
): Promise<{ manifestPath: string; segmentCount: number }> {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  const manifestPath = path.join(outputDir, "manifest.m3u8");
  const segmentPattern = path.join(outputDir, `segment_%03d.ts`);

  // FFmpeg command to generate HLS with multiple bitrates (adaptive streaming)
  // For simplicity, generating single bitrate. Expand to multi-bitrate if needed.
  const ffmpegCmd = [
    "ffmpeg",
    "-i",
    inputPath,
    "-c:v",
    "libx264", // H.264 codec
    "-c:a",
    "aac", // AAC audio
    "-hls_time",
    "10", // 10 second segments
    "-hls_list_size",
    "0", // Include all segments in manifest
    "-hls_segment_filename",
    segmentPattern,
    "-f",
    "hls",
    manifestPath,
  ].join(" ");

  await execAsync(ffmpegCmd);

  // Count generated segments
  const files = await fs.readdir(outputDir);
  const segmentCount = files.filter((f) => f.endsWith(".ts")).length;

  return { manifestPath, segmentCount };
}

export async function POST(req: NextRequest) {
  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        {
          error: "FFmpeg not available on server",
          hint: "Install FFmpeg on your server: apt-get install ffmpeg (Linux) or brew install ffmpeg (macOS)",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { platformId, courseId, lessonId, sectionId, sourceVideoPath } = body;

    if (!platformId || !courseId || !lessonId || !sectionId || !sourceVideoPath) {
      return NextResponse.json(
        { error: "Missing required fields: platformId, courseId, lessonId, sectionId, sourceVideoPath" },
        { status: 400 }
      );
    }

    // Verify lesson exists and is in "processing" state
    const lessonRef = doc(
      db,
      "platforms",
      platformId,
      "courses",
      courseId,
      "sections",
      sectionId,
      "lessons",
      lessonId
    );

    const lessonDoc = await getDoc(lessonRef);
    if (!lessonDoc.exists()) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const lessonData = lessonDoc.data();
    if (lessonData.videoStatus !== "processing") {
      return NextResponse.json(
        { error: "Lesson is not in processing state", currentStatus: lessonData.videoStatus },
        { status: 400 }
      );
    }

    // Create temporary directories
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "transcode-"));
    const inputPath = path.join(tempDir, "input.mp4");
    const outputDir = path.join(tempDir, "hls");

    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Download source video from Storage
      const storageRef = ref(storage, sourceVideoPath);
      const downloadURL = await getDownloadURL(storageRef);
      const videoResponse = await fetch(downloadURL);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      await fs.writeFile(inputPath, videoBuffer);

      // Transcode to HLS
      const { manifestPath, segmentCount } = await transcodeToHLS(inputPath, outputDir, lessonId);

      // Read manifest content
      const manifestContent = await fs.readFile(manifestPath, "utf-8");

      // Upload HLS segments and manifest to Storage
      const hlsBasePath = `platforms/${platformId}/courses/${courseId}/lessons/${lessonId}/hls`;
      const manifestStoragePath = `${hlsBasePath}/manifest.m3u8`;

      // Upload manifest
      const manifestRef = ref(storage, manifestStoragePath);
      await uploadBytes(manifestRef, Buffer.from(manifestContent, "utf-8"), {
        contentType: "application/vnd.apple.mpegurl",
      });

      // Upload all segments
      const files = await fs.readdir(outputDir);
      const segmentFiles = files.filter((f) => f.endsWith(".ts"));

      for (const segmentFile of segmentFiles) {
        const segmentPath = path.join(outputDir, segmentFile);
        const segmentContent = await fs.readFile(segmentPath);
        const segmentStoragePath = `${hlsBasePath}/${segmentFile}`;
        const segmentRef = ref(storage, segmentStoragePath);
        await uploadBytes(segmentRef, segmentContent, {
          contentType: "video/mp2t",
        });
      }

      // Get public URL for manifest
      const manifestURL = await getDownloadURL(manifestRef);

      // Update lesson document with hlsManifestPath
      await updateDoc(lessonRef, {
        hlsManifestPath: manifestStoragePath,
        videoStatus: "ready",
      });

      return NextResponse.json({
        success: true,
        hlsManifestPath: manifestStoragePath,
        hlsManifestUrl: manifestURL,
        segmentCount,
        message: "Video transcoded successfully",
      });
    } finally {
      // Cleanup temporary files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Failed to cleanup temp dir:", cleanupError);
      }
    }
  } catch (error: any) {
    console.error("Transcode error:", error);
    return NextResponse.json(
      {
        error: "Transcoding failed",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

