"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Pause, Play, X, CheckCircle2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { toast } from "sonner";

interface VideoUploadProps {
  platformId: string;
  courseId: string;
  lessonId: string;
  onUploadComplete: (videoUrl: string, storagePath: string) => void;
  existingVideoUrl?: string;
}

export function VideoUpload({ platformId, courseId, lessonId, onUploadComplete, existingVideoUrl }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadTask, setUploadTask] = useState<UploadTask | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>(existingVideoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingVideoUrl) {
      setVideoPreview(existingVideoUrl);
    }
  }, [existingVideoUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }

    // Validate file size (e.g., max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error("Video file size must be less than 500MB");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setUploadProgress(0);
    setIsPaused(false);
  };

  const startUpload = async () => {
    if (!videoFile) return;

    setUploading(true);
    setIsPaused(false);

    try {
      // Create storage reference
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const storagePath = `platforms/${platformId}/courses/${courseId}/lessons/${lessonId}/video.${ext}`;
      const storageRef = ref(storage, storagePath);

      // Create resumable upload task
      const task = uploadBytesResumable(storageRef, videoFile, {
        contentType: videoFile.type || `video/${ext}`,
      });

      setUploadTask(task);

      // Monitor upload progress
      task.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);

          switch (snapshot.state) {
            case "paused":
              setIsPaused(true);
              break;
            case "running":
              setIsPaused(false);
              break;
          }
        },
        (error) => {
          console.error("Upload error:", error);
          toast.error(`Upload failed: ${error.message}`);
          setUploading(false);
          setUploadTask(null);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          setVideoPreview(downloadURL);
          setUploading(false);
          setUploadTask(null);
          setUploadProgress(0);
          toast.success("Video uploaded successfully!");
          onUploadComplete(downloadURL, storagePath);
        }
      );
    } catch (error: any) {
      console.error("Failed to start upload:", error);
      toast.error(`Failed to start upload: ${error.message}`);
      setUploading(false);
      setUploadTask(null);
    }
  };

  const pauseUpload = () => {
    if (uploadTask) {
      uploadTask.pause();
      setIsPaused(true);
      toast.info("Upload paused");
    }
  };

  const resumeUpload = () => {
    if (uploadTask) {
      uploadTask.resume();
      setIsPaused(false);
      toast.info("Upload resumed");
    }
  };

  const cancelUpload = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
      setUploading(false);
      setUploadProgress(0);
      setIsPaused(false);
      toast.info("Upload cancelled");
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    setUploadProgress(0);
    setIsPaused(false);
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {!videoPreview ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Video File
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Change Video
            </Button>
            {!uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeVideo}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {videoPreview && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video
            src={videoPreview}
            controls
            className="h-full w-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {videoFile && !uploading && !videoPreview.includes("firebasestorage") && (
        <Button onClick={startUpload} className="w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      )}

      {uploading && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {isPaused ? "Upload paused" : "Uploading..."}
              </span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>

          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resumeUpload}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pauseUpload}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelUpload}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {videoPreview && videoPreview.includes("firebasestorage") && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Video uploaded successfully</span>
        </div>
      )}
    </div>
  );
}
