"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, X, Clock, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLevel: string[];
  onLevelToggle: (level: string) => void;
  selectedDuration: string;
  onDurationChange: (duration: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCourses: number;
  className?: string;
}

const levels = [
  { id: "beginner", label: "Beginner", count: 0 },
  { id: "intermediate", label: "Intermediate", count: 0 },
  { id: "advanced", label: "Advanced", count: 0 },
];

const durations = [
  { id: "all", label: "All Durations" },
  { id: "short", label: "Under 1 hour" },
  { id: "medium", label: "1-3 hours" },
  { id: "long", label: "3+ hours" },
];

const sortOptions = [
  { id: "popular", label: "Most Popular" },
  { id: "newest", label: "Newest" },
  { id: "alphabetical", label: "A-Z" },
  { id: "lessons", label: "Most Lessons" },
  { id: "rating", label: "Highest Rated" },
];

export function CourseFilters({
  searchQuery,
  onSearchChange,
  selectedLevel,
  onLevelToggle,
  selectedDuration,
  onDurationChange,
  sortBy,
  onSortChange,
  totalCourses,
  className,
}: CourseFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearAllFilters = () => {
    onSearchChange("");
    selectedLevel.forEach(level => onLevelToggle(level));
    onDurationChange("all");
    onSortChange("popular");
  };

  const hasActiveFilters = searchQuery || selectedLevel.length > 0 || selectedDuration !== "all" || sortBy !== "popular";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search courses, instructors, or topics..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 h-11"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {[searchQuery, selectedLevel.length, selectedDuration !== "all" ? 1 : 0, sortBy !== "popular" ? 1 : 0].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {totalCourses} course{totalCourses !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Level Filters */}
            <div>
              <h3 className="text-sm font-medium mb-2">Difficulty Level</h3>
              <div className="flex flex-wrap gap-2">
                {levels.map((level) => (
                  <Button
                    key={level.id}
                    variant={selectedLevel.includes(level.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLevelToggle(level.id)}
                    className="h-8"
                  >
                    {level.label}
                    {level.count > 0 && (
                      <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                        {level.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration Filters */}
            <div>
              <h3 className="text-sm font-medium mb-2">Duration</h3>
              <div className="flex flex-wrap gap-2">
                {durations.map((duration) => (
                  <Button
                    key={duration.id}
                    variant={selectedDuration === duration.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onDurationChange(duration.id)}
                    className="h-8"
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-sm font-medium mb-2">Sort By</h3>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={sortBy === option.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSortChange(option.id)}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
              <button
                onClick={() => onSearchChange("")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedLevel.map((level) => (
            <Badge key={level} variant="secondary" className="flex items-center gap-1">
              {level}
              <button
                onClick={() => onLevelToggle(level)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedDuration !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {durations.find(d => d.id === selectedDuration)?.label}
              <button
                onClick={() => onDurationChange("all")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sortBy !== "popular" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {sortOptions.find(s => s.id === sortBy)?.label}
              <button
                onClick={() => onSortChange("popular")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
