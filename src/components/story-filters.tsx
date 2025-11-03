"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string[];
  onCategoryToggle: (category: string) => void;
  selectedIndustry: string[];
  onIndustryToggle: (industry: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalStories: number;
  className?: string;
}

const categories = [
  { id: "career-change", label: "Perubahan Karir" },
  { id: "salary-increase", label: "Kenaikan Gaji" },
  { id: "remote-work", label: "Kerja Remote" },
];

const industries = [
  { id: "Technology", label: "Technology" },
  { id: "Design", label: "Design" },
  { id: "Data Science", label: "Data Science" },
  { id: "Virtual Assistance", label: "Virtual Assistance" },
];

const sortOptions = [
  { id: "recent", label: "Terbaru" },
  { id: "popular", label: "Paling Populer" },
  { id: "salary", label: "Gaji Tertinggi" },
  { id: "timeline", label: "Waktu Tercepat" },
];

export function StoryFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryToggle,
  selectedIndustry,
  onIndustryToggle,
  sortBy,
  onSortChange,
  totalStories,
  className,
}: StoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const clearAllFilters = () => {
    onSearchChange("");
    selectedCategory.forEach(cat => onCategoryToggle(cat));
    selectedIndustry.forEach(ind => onIndustryToggle(ind));
    onSortChange("recent");
  };

  const hasActiveFilters = searchQuery || selectedCategory.length > 0 || selectedIndustry.length > 0 || sortBy !== "recent";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan nama, peran, perusahaan, atau kisah..."
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
            Filter
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {[searchQuery, selectedCategory.length, selectedIndustry.length, sortBy !== "recent" ? 1 : 0].filter(Boolean).length}
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
              Hapus semua
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {totalStories} {totalStories === 1 ? "kisah" : "kisah"} ditemukan
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-medium mb-2">Kategori</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory.includes(category.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => onCategoryToggle(category.id)}
                    className="h-8"
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Industry Filters */}
            <div>
              <h3 className="text-sm font-medium mb-2">Industri</h3>
              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <Button
                    key={industry.id}
                    variant={selectedIndustry.includes(industry.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => onIndustryToggle(industry.id)}
                    className="h-8"
                  >
                    {industry.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-sm font-medium mb-2">Urutkan</h3>
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
              Pencarian: "{searchQuery}"
              <button
                onClick={() => onSearchChange("")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategory.map((cat) => (
            <Badge key={cat} variant="secondary" className="flex items-center gap-1">
              {categories.find(c => c.id === cat)?.label}
              <button
                onClick={() => onCategoryToggle(cat)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedIndustry.map((ind) => (
            <Badge key={ind} variant="secondary" className="flex items-center gap-1">
              {ind}
              <button
                onClick={() => onIndustryToggle(ind)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {sortBy !== "recent" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {sortOptions.find(s => s.id === sortBy)?.label}
              <button
                onClick={() => onSortChange("recent")}
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
