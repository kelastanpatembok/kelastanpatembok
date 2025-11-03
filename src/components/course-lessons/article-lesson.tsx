"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ArticleLessonProps {
  lesson: {
    id: string;
    title: string;
    content: string;
    duration: string;
  };
  onComplete: () => void;
  isCompleted?: boolean;
}

export function ArticleLesson({ lesson, onComplete, isCompleted = false }: ArticleLessonProps) {
  const [readProgress, setReadProgress] = useState(0);
  const [completed, setCompleted] = useState(!!isCompleted);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCompleted(!!isCompleted);
  }, [isCompleted]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementHeight = element.scrollHeight;
        const scrolled = Math.max(0, windowHeight - elementTop);
        const progress = Math.min(100, (scrolled / elementHeight) * 100);
        setReadProgress(progress);

        // Mark as completed if 80% scrolled
        if (progress >= 80 && !completed) {
          setCompleted(true);
          toast.success("Article read! Lesson marked as complete.");
          onComplete();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [completed, onComplete]);

  return (
    <div className="space-y-4">
      {/* Reading Progress */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Article Content */}
      <div
        ref={contentRef}
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: formatArticleContent(lesson.content) }}
      />

      {/* Manual Complete Button */}
      {!completed && (
        <div className="flex justify-end">
          <Button onClick={() => {
            setCompleted(true);
            toast.success("Lesson marked as complete!");
            onComplete();
          }}>
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

function formatArticleContent(content: string): string {
  // Simple formatting - in production, use a proper markdown parser
  return content
    .split("\n\n")
    .map((paragraph) => {
      if (paragraph.startsWith("# ")) {
        return `<h1>${paragraph.slice(2)}</h1>`;
      }
      if (paragraph.startsWith("## ")) {
        return `<h2>${paragraph.slice(3)}</h2>`;
      }
      if (paragraph.startsWith("- ")) {
        return `<ul><li>${paragraph.slice(2)}</li></ul>`;
      }
      return `<p>${paragraph}</p>`;
    })
    .join("");
}
