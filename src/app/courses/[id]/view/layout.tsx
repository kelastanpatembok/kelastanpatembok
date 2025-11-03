"use client";

import { useParams, useRouter } from "next/navigation";
import { CourseViewerProvider, useCourseViewer } from "@/components/course-viewer-context";
import { CommandPalette } from "@/components/command-palette";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CourseMenu } from "@/components/course-menu";

function CourseViewerHeader() {
  const { course, completedLessons } = useCourseViewer();
  const { user } = useAuth();
  const router = useRouter();

  if (!course) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-[110rem] items-center justify-between px-4">
        {/* Left: Brand + Back button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              RWID Community
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/courses/${course.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">{course.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course.totalLessons} lessons • {course.duration}
            </p>
          </div>
        </div>
        
        {/* Right: Search + Progress + User */}
        <div className="flex items-center gap-4">
          <CommandPalette />
          
          {/* Course Progress */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">
                {completedLessons.size} of {course.totalLessons} completed
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((completedLessons.size / course.totalLessons) * 100)}% complete
              </div>
            </div>
            <div className="h-8 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.round((completedLessons.size / course.totalLessons) * 100)}%` }}
              />
            </div>
          </div>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Open profile menu" className="relative inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="h-8 w-8 ring-2 ring-primary shadow-sm">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                    <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/profile">Edit profile</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

function CourseViewerContent({ children }: { children: React.ReactNode }) {
  const { course } = useCourseViewer();

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <p className="text-muted-foreground">The course you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Course Content Sidebar - Always Visible */}
      <aside className="w-80 border-r bg-muted/30 overflow-y-auto">
        <CourseMenu />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function CourseViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <CourseViewerProvider courseId={courseId}>
      <div className="min-h-screen bg-background">
        <CourseViewerHeader />
        <CourseViewerContent>{children}</CourseViewerContent>
      </div>
    </CourseViewerProvider>
  );
}
