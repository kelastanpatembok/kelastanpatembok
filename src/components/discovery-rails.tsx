"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  ChevronRight,
  Star
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DiscoveryRailProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  viewAllHref?: string;
  className?: string;
}

function DiscoveryRail({ title, icon: Icon, children, viewAllHref, className }: DiscoveryRailProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {viewAllHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={viewAllHref} className="flex items-center gap-1">
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {children}
      </div>
    </div>
  );
}


// Success Story Spotlight
interface SuccessStorySpotlightProps {
  story: {
    id: string;
    author: string;
    role: string;
    company: string;
    salaryIncrease: number;
    quote: string;
    avatar?: string;
  };
}

function SuccessStorySpotlight({ story }: SuccessStorySpotlightProps) {
  return (
    <Card className="min-w-[320px] group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={story.avatar} alt={story.author} />
            <AvatarFallback>{story.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{story.author}</h4>
            <p className="text-xs text-muted-foreground">
              {story.role} at {story.company}
            </p>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-bold">+{story.salaryIncrease}%</span>
          </div>
        </div>
        <blockquote className="text-sm italic text-muted-foreground mb-3">
          "{story.quote}"
        </blockquote>
        <Button asChild size="sm" className="w-full">
          <Link href="/success-stories">
            <Star className="h-4 w-4 mr-2" />
            Read Full Story
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Main Discovery Rails Component
interface DiscoveryRailsProps {
  featuredStories?: SuccessStorySpotlightProps['story'][];
  className?: string;
}

export function DiscoveryRails({ 
  featuredStories = [],
  className 
}: DiscoveryRailsProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Success Story Spotlight */}
      {featuredStories.length > 0 && (
        <DiscoveryRail
          title="Success Story Spotlight"
          icon={Star}
          viewAllHref="/success-stories"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredStories.map((story) => (
              <SuccessStorySpotlight key={story.id} story={story} />
            ))}
          </div>
        </DiscoveryRail>
      )}
    </div>
  );
}
