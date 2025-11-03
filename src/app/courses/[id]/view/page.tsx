"use client";

import { VideoLesson } from "@/components/course-lessons/video-lesson";
import { ArticleLesson } from "@/components/course-lessons/article-lesson";
import { QuizLesson } from "@/components/course-lessons/quiz-lesson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCourseViewer } from "@/components/course-viewer-context";

export default function CourseViewerPage() {
  const {
    currentLesson,
    handleLessonComplete,
    previousLesson,
    nextLesson,
    setCurrentLessonId,
  } = useCourseViewer();

  const handleNextLesson = () => {
    if (nextLesson) {
      setCurrentLessonId(nextLesson.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousLesson = () => {
    if (previousLesson) {
      setCurrentLessonId(previousLesson.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="p-8">
          <CardTitle>No lesson selected</CardTitle>
          <p className="text-muted-foreground mt-2">
            Please select a lesson from the sidebar to get started.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Lesson Content */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{currentLesson.type}</Badge>
                  <span className="text-sm text-muted-foreground">{currentLesson.duration}</span>
                </div>
                <CardTitle className="text-2xl">{currentLesson.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentLesson.type === "video" && (
              <VideoLesson lesson={currentLesson} onComplete={() => handleLessonComplete(currentLesson.id)} />
            )}
            {currentLesson.type === "article" && (
              <ArticleLesson lesson={currentLesson as any} onComplete={() => handleLessonComplete(currentLesson.id)} />
            )}
            {currentLesson.type === "quiz" && (
              <QuizLesson lesson={currentLesson as any} onComplete={() => handleLessonComplete(currentLesson.id)} />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={handlePreviousLesson}
            disabled={!previousLesson}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleNextLesson}
            disabled={!nextLesson}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}