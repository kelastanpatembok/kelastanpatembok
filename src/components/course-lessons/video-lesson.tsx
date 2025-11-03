"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface VideoLessonProps {
  lesson: {
    id: string;
    title: string;
    videoUrl?: string; // YouTube URL
    transcript?: string;
    duration?: string;
  };
  onComplete: () => void;
  isCompleted?: boolean;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Patterns for various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

export function VideoLesson({ lesson, onComplete, isCompleted = false }: VideoLessonProps) {
  const [completed, setCompleted] = useState(!!isCompleted);
  const youtubeId = lesson.videoUrl ? extractYouTubeId(lesson.videoUrl) : null;

  useEffect(() => {
    setCompleted(!!isCompleted);
  }, [isCompleted]);

  const handleMarkComplete = () => {
    setCompleted(true);
    toast.success("Lesson marked as complete!");
    onComplete();
  };

  if (!lesson.videoUrl || !youtubeId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed bg-muted p-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No video URL provided yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          title={lesson.title || "Video lesson"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* Transcript */}
      {lesson.transcript && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Transcript</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{lesson.transcript}</p>
        </div>
      )}

      {/* Manual Complete Button */}
      {!completed && (
        <div className="flex justify-end">
          <Button onClick={handleMarkComplete}>
            Mark as Complete
          </Button>
        </div>
      )}

      {/* Completion Status */}
      {completed && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">You've completed this lesson!</span>
        </div>
      )}
    </div>
  );
}
