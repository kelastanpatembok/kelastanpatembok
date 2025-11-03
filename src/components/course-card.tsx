"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, Users, Play, Bookmark, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    level: string;
    lessons: number;
    communityId: string;
    platformSlug?: string;
  };
  community: {
    id: string;
    name: string;
    memberCount: number;
  };
  instructor?: {
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
  isEnrolled?: boolean;
  progress?: number;
  isWishlisted?: boolean;
  onWishlistToggle?: (courseId: string) => void;
  onPreview?: (courseId: string) => void;
  className?: string;
}

export function CourseCard({
  course,
  community,
  instructor,
  thumbnail,
  rating = 4.5,
  reviewCount = 128,
  duration = "2h 30m",
  isEnrolled = false,
  progress = 0,
  isWishlisted = false,
  onWishlistToggle,
  onPreview,
  className,
}: CourseCardProps) {
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      isEnrolled && "ring-2 ring-primary/20",
      className
    )}>
      {/* Course Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-6xl opacity-20">{getCommunityIcon(community.id)}</div>
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={() => onWishlistToggle?.(course.id)}
            >
              <Bookmark className={cn("h-4 w-4", isWishlisted && "fill-current")} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={() => onPreview?.(course.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar for Enrolled Courses */}
        {isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-lg">{getCommunityIcon(community.id)}</span>
                {community.name}
              </span>
              {community.memberCount !== undefined && (
                <>
                  <span>•</span>
                  <span>{(community.memberCount || 0).toLocaleString()} members</span>
                </>
              )}
            </CardDescription>
          </div>
          <Badge className={cn("shrink-0", getLevelColor(course.level))}>
            {course.level}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Instructor Info */}
        {instructor && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={instructor.avatar} alt={instructor.name} />
              <AvatarFallback className="text-xs">{instructor.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{instructor.name}</span>
          </div>
        )}

        {/* Course Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{rating}</span>
            <span>({reviewCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Play className="h-4 w-4" />
            <span>{course.lessons} lessons</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={course.platformSlug ? `/platforms/${course.platformSlug}/courses/${course.id}` : `/courses/${course.id}`}>
              {isEnrolled ? "Continue Learning" : "Start Learning"}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview?.(course.id)}
            className="px-3"
          >
            Preview
          </Button>
        </div>

        {/* Progress for Enrolled Courses */}
        {isEnrolled && (
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
