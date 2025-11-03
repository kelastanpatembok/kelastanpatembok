"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RecentlyViewedCourse {
  id: string;
  title: string;
  communityName: string;
  viewedAt: number;
  thumbnail?: string;
}

interface RecentlyViewedProps {
  className?: string;
}

export function RecentlyViewed({ className }: RecentlyViewedProps) {
  const [recentCourses, setRecentCourses] = useState<RecentlyViewedCourse[]>([]);

  useEffect(() => {
    // Load recently viewed courses from localStorage
    const stored = localStorage.getItem("rwid_recently_viewed");
    if (stored) {
      try {
        const courses = JSON.parse(stored);
        setRecentCourses(courses.slice(0, 3)); // Show only 3 most recent
      } catch (error) {
        console.error("Error loading recently viewed courses:", error);
      }
    }
  }, []);

  const removeCourse = (courseId: string) => {
    const updated = recentCourses.filter(course => course.id !== courseId);
    setRecentCourses(updated);
    localStorage.setItem("rwid_recently_viewed", JSON.stringify(updated));
  };

  const clearAll = () => {
    setRecentCourses([]);
    localStorage.removeItem("rwid_recently_viewed");
  };

  if (recentCourses.length === 0) {
    return null;
  }

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently Viewed
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentCourses.map((course) => (
            <div
              key={course.id}
              className="group relative p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.communityName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(course.viewedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCourse(course.id)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Button asChild size="sm" className="w-full mt-2">
                <Link href={`/courses/${course.id}`}>
                  Continue Learning
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
