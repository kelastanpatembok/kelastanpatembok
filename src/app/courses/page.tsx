"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import communities from "@/data/communities.json";
import { communityIdToCourses, getAllCourses } from "@/data/community-courses";
import { CourseCard } from "@/components/course-card";
import { CourseFilters } from "@/components/course-filters";
import { CommunitySection } from "@/components/community-section";
import { CoursesHero } from "@/components/courses-hero";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RecentlyViewed } from "@/components/recently-viewed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, TrendingUp, Star, Clock } from "lucide-react";

// Mock instructor data
const mockInstructors = {
  course_nextjs: { name: "Sarah Chen", avatar: "/avatars/sarah.jpg" },
  course_ml101: { name: "Dr. Alex Kumar", avatar: "/avatars/alex.jpg" },
  course_portfolio_basics: { name: "Mike Rodriguez", avatar: "/avatars/mike.jpg" },
  course_personal_branding: { name: "Emma Wilson", avatar: "/avatars/emma.jpg" },
  course_github_profile: { name: "David Park", avatar: "/avatars/david.jpg" },
  course_va_fundamentals: { name: "Lisa Thompson", avatar: "/avatars/lisa.jpg" },
  course_va_tools: { name: "James Brown", avatar: "/avatars/james.jpg" },
  course_va_client_management: { name: "Anna Davis", avatar: "/avatars/anna.jpg" },
  course_va_automation: { name: "Tom Wilson", avatar: "/avatars/tom.jpg" },
  course_design_basics: { name: "Sophie Lee", avatar: "/avatars/sophie.jpg" },
  course_typography: { name: "Carlos Mendez", avatar: "/avatars/carlos.jpg" },
  course_color_theory: { name: "Rachel Green", avatar: "/avatars/rachel.jpg" },
  course_logo_design: { name: "Kevin Zhang", avatar: "/avatars/kevin.jpg" },
  course_ui_ux_basics: { name: "Nina Patel", avatar: "/avatars/nina.jpg" },
};

// Mock course data with additional fields
const mockCourseData = {
  course_nextjs: { thumbnail: "/thumbnails/nextjs.jpg", duration: "4h 30m", rating: 4.8, reviewCount: 234 },
  course_ml101: { thumbnail: "/thumbnails/ml.jpg", duration: "3h 15m", rating: 4.6, reviewCount: 189 },
  course_portfolio_basics: { thumbnail: "/thumbnails/portfolio.jpg", duration: "2h 45m", rating: 4.7, reviewCount: 156 },
  course_personal_branding: { thumbnail: "/thumbnails/branding.jpg", duration: "3h 20m", rating: 4.5, reviewCount: 98 },
  course_github_profile: { thumbnail: "/thumbnails/github.jpg", duration: "1h 30m", rating: 4.9, reviewCount: 203 },
  course_va_fundamentals: { thumbnail: "/thumbnails/va.jpg", duration: "2h 15m", rating: 4.4, reviewCount: 167 },
  course_va_tools: { thumbnail: "/thumbnails/va-tools.jpg", duration: "1h 45m", rating: 4.6, reviewCount: 134 },
  course_va_client_management: { thumbnail: "/thumbnails/client-mgmt.jpg", duration: "2h 30m", rating: 4.5, reviewCount: 89 },
  course_va_automation: { thumbnail: "/thumbnails/automation.jpg", duration: "3h 10m", rating: 4.7, reviewCount: 112 },
  course_design_basics: { thumbnail: "/thumbnails/design.jpg", duration: "4h 20m", rating: 4.8, reviewCount: 278 },
  course_typography: { thumbnail: "/thumbnails/typography.jpg", duration: "2h 10m", rating: 4.6, reviewCount: 145 },
  course_color_theory: { thumbnail: "/thumbnails/color.jpg", duration: "1h 25m", rating: 4.5, reviewCount: 98 },
  course_logo_design: { thumbnail: "/thumbnails/logo.jpg", duration: "2h 50m", rating: 4.7, reviewCount: 167 },
  course_ui_ux_basics: { thumbnail: "/thumbnails/ui-ux.jpg", duration: "3h 35m", rating: 4.8, reviewCount: 234 },
};

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [collapsedCommunities, setCollapsedCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const allCourses = getAllCourses();
  const totalLessons = allCourses.reduce((acc, course) => acc + course.lessons, 0);

  // Filter and sort courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = allCourses.filter((course) => {
      const community = communities.find(c => c.id === course.communityId);
      const courseData = mockCourseData[course.id as keyof typeof mockCourseData];
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(query);
        const matchesCommunity = community?.name.toLowerCase().includes(query);
        const matchesInstructor = mockInstructors[course.id as keyof typeof mockInstructors]?.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCommunity && !matchesInstructor) return false;
      }

      // Level filter
      if (selectedLevel.length > 0 && !selectedLevel.includes(course.level.toLowerCase())) {
        return false;
      }

      // Duration filter
      if (selectedDuration !== "all") {
        const courseData = mockCourseData[course.id as keyof typeof mockCourseData];
        const duration = courseData?.duration || "2h 30m";
        const hours = parseFloat(duration.split("h")[0]);
        
        switch (selectedDuration) {
          case "short":
            if (hours >= 1) return false;
            break;
          case "medium":
            if (hours < 1 || hours > 3) return false;
            break;
          case "long":
            if (hours <= 3) return false;
            break;
        }
      }

      return true;
    });

    // Sort courses
    filtered.sort((a, b) => {
      const aData = mockCourseData[a.id as keyof typeof mockCourseData];
      const bData = mockCourseData[b.id as keyof typeof mockCourseData];
      
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "lessons":
          return b.lessons - a.lessons;
        case "rating":
          return (bData?.rating || 0) - (aData?.rating || 0);
        case "newest":
          // Mock: newer courses have higher IDs
          return b.id.localeCompare(a.id);
        case "popular":
        default:
          return (bData?.reviewCount || 0) - (aData?.reviewCount || 0);
      }
    });

    return filtered;
  }, [searchQuery, selectedLevel, selectedDuration, sortBy]);

  // Group courses by community
  const coursesByCommunity = useMemo(() => {
    const grouped: Record<string, typeof allCourses> = {};
    
    filteredAndSortedCourses.forEach(course => {
      if (!grouped[course.communityId]) {
        grouped[course.communityId] = [];
      }
      grouped[course.communityId].push(course);
    });

    return grouped;
  }, [filteredAndSortedCourses]);

  const toggleLevel = (level: string) => {
    setSelectedLevel(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleCommunityCollapse = (communityId: string) => {
    setCollapsedCommunities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(communityId)) {
        newSet.delete(communityId);
      } else {
        newSet.add(communityId);
      }
      return newSet;
    });
  };

  const handleWishlistToggle = (courseId: string) => {
    // Mock wishlist toggle
    console.log("Toggle wishlist for course:", courseId);
  };

  const handlePreview = (courseId: string) => {
    // Mock preview
    console.log("Preview course:", courseId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_: any, i: number) => (
            <Card key={i}>
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: "Courses" }]} />

      {/* Hero Section */}
      <CoursesHero
        totalCourses={allCourses.length}
        totalCommunities={communities.length}
        totalLessons={totalLessons}
      />

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Search and Filters */}
      <CourseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedLevel={selectedLevel}
        onLevelToggle={toggleLevel}
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalCourses={filteredAndSortedCourses.length}
      />

      {/* Courses by Community */}
      <div id="courses" className="space-y-6">
        {communities.map((community) => {
          const communityCourses = coursesByCommunity[community.id] || [];
          if (communityCourses.length === 0) return null;

          return (
            <CommunitySection
              key={community.id}
              community={community}
              courses={communityCourses}
              isCollapsed={collapsedCommunities.has(community.id)}
              onToggleCollapse={() => toggleCommunityCollapse(community.id)}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAndSortedCourses.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <Button onClick={() => {
              setSearchQuery("");
              setSelectedLevel([]);
              setSelectedDuration("all");
              setSortBy("popular");
            }}>
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}