"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface YouTubeUrlInputProps {
  value?: string;
  onChange: (url: string) => void;
  onSave: (url: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
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

export function YouTubeUrlInput({ value = "", onChange, onSave, onCancel, saving = false }: YouTubeUrlInputProps) {
  const [url, setUrl] = useState(value);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    setUrl(value);
    setPreviewId(value ? extractYouTubeId(value) : null);
  }, [value]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    const id = extractYouTubeId(newUrl);
    setPreviewId(id);
    onChange(newUrl);
  };

  const isValid = previewId !== null && url.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="youtube-url">YouTube URL</Label>
        <Input
          id="youtube-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={handleUrlChange}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Paste a YouTube video URL (youtube.com/watch?v=... or youtu.be/...)
        </p>
      </div>

      {previewId && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${previewId}?rel=0&modestbranding=1`}
              title="Video preview"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <a
              href={`https://www.youtube.com/watch?v=${previewId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Open on YouTube
            </a>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onSave(url)} disabled={!isValid || saving}>
          {saving ? "Saving..." : "Save Video URL"}
        </Button>
      </div>
    </div>
  );
}

