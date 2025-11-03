"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Users, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CommunitySectionProps {
  community: {
    id: string;
    name: string;
    description: string;
    memberCount: number;
  };
  courses: Array<{
    id: string;
    title: string;
    level: string;
    lessons: number;
    communityId: string;
  }>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function CommunitySection({
  community,
  courses,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: CommunitySectionProps) {
  const getCommunityIcon = (communityId: string) => {
    switch (communityId) {
      case "c_react":
        return "⚛️";
      case "c_job":
        return "💼";
      case "c_portfolio":
        return "🎨";
      case "c_va":
        return "🤖";
      case "c_design":
        return "🎨";
      default:
        return "📚";
    }
  };

  const getCommunityColor = (communityId: string) => {
    switch (communityId) {
      case "c_react":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "c_job":
        return "bg-green-50 border-green-200 text-green-800";
      case "c_portfolio":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "c_va":
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "c_design":
        return "bg-pink-50 border-pink-200 text-pink-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const totalLessons = courses.reduce((acc, course) => acc + course.lessons, 0);
  const averageLessons = courses.length > 0 ? Math.round(totalLessons / courses.length) : 0;

  return (
    <Card className={cn("overflow-hidden transition-all duration-300", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getCommunityIcon(community.id)}</div>
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                {community.name}
                <Badge variant="outline" className={getCommunityColor(community.id)}>
                  {courses.length} course{courses.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {community.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Community Stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{community.memberCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>~{averageLessons} avg</span>
              </div>
            </div>
            
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.();
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group relative p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs shrink-0",
                      course.level.toLowerCase() === "beginner" && "bg-green-100 text-green-800 border-green-200",
                      course.level.toLowerCase() === "intermediate" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                      course.level.toLowerCase() === "advanced" && "bg-red-100 text-red-800 border-red-200"
                    )}
                  >
                    {course.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {course.lessons} lessons
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/courses/${course.id}`}>
                    View Course
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/communities/${community.id}`}>
                View Community
              </Link>
            </Button>
            {courses.length > 3 && (
              <Button asChild size="sm" variant="ghost">
                <Link href={`/communities/${community.id}`}>
                  All {courses.length} Courses
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
