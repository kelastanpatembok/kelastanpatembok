"use client";

import { useState, useMemo, useEffect } from "react";
import successStories from "@/data/success-stories.json";
import { StoryCard } from "@/components/story-card";
import { StoriesHero } from "@/components/stories-hero";
import { StoryFilters } from "@/components/story-filters";
import { CategoryTabs } from "@/components/category-tabs";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, TrendingUp, Users } from "lucide-react";

export default function SuccessStoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [selectedTab, setSelectedTab] = useState("all");
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [bookmarkedStories, setBookmarkedStories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load bookmarked stories from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("rwid_bookmarked_stories");
    if (stored) {
      try {
        setBookmarkedStories(new Set(JSON.parse(stored)));
      } catch (error) {
        console.error("Error loading bookmarked stories:", error);
      }
    }
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const validStories = successStories.filter(s => s.previousSalary && s.salary);
    const salaryIncreases = validStories.map(s => {
      const prev = parseFloat(s.previousSalary!.replace(/[^0-9]/g, ''));
      const curr = parseFloat(s.salary.replace(/[^0-9]/g, ''));
      return ((curr - prev) / prev) * 100;
    });
    const avgIncrease = salaryIncreases.length > 0
      ? Math.round(salaryIncreases.reduce((a, b) => a + b, 0) / salaryIncreases.length)
      : 0;

    const timelines = successStories.map(s => parseInt(s.timeline.split(' ')[0]));
    const avgTimeline = Math.round(timelines.reduce((a, b) => a + b, 0) / timelines.length);

    return {
      totalStories: successStories.length,
      averageSalaryIncrease: avgIncrease,
      averageTimeline: `${avgTimeline} months`,
      successRate: 98,
    };
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: successStories.length };
    successStories.forEach(story => {
      counts[story.category] = (counts[story.category] || 0) + 1;
    });
    return counts;
  }, []);

  const categories = [
    { id: "all", label: "All Stories", count: categoryCounts.all },
    { id: "career-change", label: "Career Change", count: categoryCounts["career-change"] || 0 },
    { id: "salary-increase", label: "Salary Increase", count: categoryCounts["salary-increase"] || 0 },
    { id: "remote-work", label: "Remote Work", count: categoryCounts["remote-work"] || 0 },
  ];

  // Filter and sort stories
  const filteredAndSortedStories = useMemo(() => {
    let filtered = successStories.filter((story) => {
      // Tab filter
      if (selectedTab !== "all" && story.category !== selectedTab) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesAuthor = story.author.toLowerCase().includes(query);
        const matchesRole = story.role.toLowerCase().includes(query);
        const matchesCompany = story.company.toLowerCase().includes(query);
        const matchesStory = story.story.toLowerCase().includes(query);
        const matchesTags = story.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesAuthor && !matchesRole && !matchesCompany && !matchesStory && !matchesTags) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory.length > 0 && !selectedCategory.includes(story.category)) {
        return false;
      }

      // Industry filter
      if (selectedIndustry.length > 0 && !selectedIndustry.includes(story.industry)) {
        return false;
      }

      return true;
    });

    // Sort stories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.views || 0) - (a.views || 0);
        case "salary":
          const aSalary = parseFloat(a.salary.replace(/[^0-9]/g, ''));
          const bSalary = parseFloat(b.salary.replace(/[^0-9]/g, ''));
          return bSalary - aSalary;
        case "timeline":
          const aTimeline = parseInt(a.timeline.split(' ')[0]);
          const bTimeline = parseInt(b.timeline.split(' ')[0]);
          return aTimeline - bTimeline;
        case "recent":
        default:
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, selectedIndustry, sortBy, selectedTab]);

  // Featured stories
  const featuredStories = useMemo(() => {
    return filteredAndSortedStories.filter(s => s.featured).slice(0, 3);
  }, [filteredAndSortedStories]);

  // Regular stories (non-featured)
  const regularStories = useMemo(() => {
    return filteredAndSortedStories.filter(s => !s.featured);
  }, [filteredAndSortedStories]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategory(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleIndustry = (industryId: string) => {
    setSelectedIndustry(prev =>
      prev.includes(industryId)
        ? prev.filter(i => i !== industryId)
        : [...prev, industryId]
    );
  };

  const toggleStoryExpand = (storyId: string) => {
    setExpandedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const toggleBookmark = (storyId: string) => {
    setBookmarkedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      localStorage.setItem("rwid_bookmarked_stories", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
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
      <Breadcrumbs items={[{ label: "Success Stories" }]} />

      {/* Hero Section */}
      <StoriesHero />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedTab}
        onCategoryChange={setSelectedTab}
      />

      {/* Search and Filters */}
      <StoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryToggle={toggleCategory}
        selectedIndustry={selectedIndustry}
        onIndustryToggle={toggleIndustry}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalStories={filteredAndSortedStories.length}
      />

      {/* Featured Stories */}
      {featuredStories.length > 0 && selectedTab === "all" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Featured Stories
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isExpanded={expandedStories.has(story.id)}
                onToggleExpand={() => toggleStoryExpand(story.id)}
                isBookmarked={bookmarkedStories.has(story.id)}
                onBookmarkToggle={() => toggleBookmark(story.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Stories */}
      <div id="stories" className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {selectedTab === "all" ? "All Success Stories" : categories.find(c => c.id === selectedTab)?.label}
        </h2>
        
        {filteredAndSortedStories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No stories found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria to find what you're looking for.
              </p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedCategory([]);
                setSelectedIndustry([]);
                setSortBy("recent");
                setSelectedTab("all");
              }}>
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isExpanded={expandedStories.has(story.id)}
                onToggleExpand={() => toggleStoryExpand(story.id)}
                isBookmarked={bookmarkedStories.has(story.id)}
                onBookmarkToggle={() => toggleBookmark(story.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}