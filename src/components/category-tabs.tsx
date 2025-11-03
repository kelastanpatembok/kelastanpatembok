"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  categories: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}: CategoryTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.id)}
          className="h-9"
        >
          {category.label}
          {category.count > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-background/20 text-xs">
              {category.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
