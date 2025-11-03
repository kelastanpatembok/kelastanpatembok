"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Play, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  type: "video" | "article" | "quiz";
  duration: string;
  order: number;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  sections: Section[];
}

interface CourseSidebarProps {
  course: Course;
  currentLessonId: string | null;
  completedLessons: Set<string>;
  onLessonSelect: (lessonId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseSidebar({
  course,
  currentLessonId,
  completedLessons,
  onLessonSelect,
  open,
  onOpenChange,
}: CourseSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(course.sections.map((s) => s.id)));

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const totalLessons = course.sections.reduce((acc, section) => acc + section.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <>
      {/* Mobile Toggle */}
      <div className="fixed left-4 top-20 z-30 lg:hidden">
        <Button onClick={() => onOpenChange(!open)} variant="outline" size="sm">
          {open ? "Hide" : "Show"} Course Content
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-[320px] overflow-y-auto border-r bg-background transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4">
          {/* Course Progress */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {totalLessons} lessons completed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Course Content */}
          <div className="space-y-1">
            {course.sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const sectionLessons = section.lessons.length;
              const sectionCompleted = section.lessons.filter((l) => completedLessons.has(l.id)).length;

              return (
                <div key={section.id} className="space-y-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>{section.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sectionCompleted}/{sectionLessons}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {section.lessons.map((lesson) => {
                        const isActive = currentLessonId === lesson.id;
                        const isCompleted = completedLessons.has(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              onLessonSelect(lesson.id);
                              onOpenChange(false); // Close sidebar on mobile after selection
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent",
                              isCompleted && !isActive && "text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              getLessonIcon(lesson.type)
                            )}
                            <span className="flex-1 truncate">{lesson.title}</span>
                            <span className="text-xs opacity-70">{lesson.duration}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
