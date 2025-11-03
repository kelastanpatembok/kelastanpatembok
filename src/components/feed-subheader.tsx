"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  SortAsc, 
  Clock, 
  TrendingUp, 
  Users, 
  Bookmark,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedSubheaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectedFilters: string[];
  onFilterToggle: (filter: string) => void;
  totalPosts: number;
  className?: string;
}

const tabs = [
  { id: "all", label: "All Posts", icon: Users },
  { id: "my-communities", label: "My Communities", icon: Bookmark },
  { id: "saved", label: "Saved", icon: Bookmark },
];

const sortOptions = [
  { id: "top", label: "Top", icon: TrendingUp },
  { id: "new", label: "New", icon: Clock },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

const filterOptions = [
  { id: "react", label: "React", color: "bg-blue-100 text-blue-800" },
  { id: "job-hunting", label: "Job Hunting", color: "bg-green-100 text-green-800" },
  { id: "design", label: "Design", color: "bg-purple-100 text-purple-800" },
  { id: "portfolio", label: "Portfolio", color: "bg-orange-100 text-orange-800" },
  { id: "va", label: "Virtual Assistant", color: "bg-pink-100 text-pink-800" },
];

export function FeedSubheader({
  activeTab,
  onTabChange,
  sortBy,
  onSortChange,
  selectedFilters,
  onFilterToggle,
  totalPosts,
  className,
}: FeedSubheaderProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeSort = sortOptions.find(s => s.id === sortBy);
  const hasActiveFilters = selectedFilters.length > 0;

  return (
    <div className={cn(
      "transition-all duration-200",
      isSticky ? "sticky top-14 z-30 bg-background/95 backdrop-blur border-b shadow-sm" : "",
      className
    )}>
      <div className="px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(tab.id)}
                  className="h-8 flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Post count */}
            <div className="text-sm text-muted-foreground hidden sm:block">
              {totalPosts} posts
            </div>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {activeSort?.icon && <activeSort.icon className="h-4 w-4 mr-2" />}
                  {activeSort?.label || "Sort"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => onSortChange(option.id)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                      {selectedFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {filterOptions.map((filter) => (
                  <DropdownMenuItem
                    key={filter.id}
                    onClick={() => onFilterToggle(filter.id)}
                    className="flex items-center gap-2"
                  >
                    <div className={cn("w-3 h-3 rounded-full", filter.color)} />
                    {filter.label}
                    {selectedFilters.includes(filter.id) && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {selectedFilters.map((filter) => {
              const filterData = filterOptions.find(f => f.id === filter);
              return (
                <Badge
                  key={filter}
                  variant="secondary"
                  className={cn("flex items-center gap-1", filterData?.color)}
                  onClick={() => onFilterToggle(filter)}
                >
                  {filterData?.label}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterToggle(filter);
                    }}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
