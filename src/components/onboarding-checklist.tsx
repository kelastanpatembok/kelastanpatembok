"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  onDismiss?: () => void;
  className?: string;
}

const checklistItems = [
  {
    id: "join-community",
    title: "Join a Community",
    description: "Connect with like-minded learners",
    href: "/courses",
    completed: false,
  },
  {
    id: "start-course",
    title: "Start Your First Course",
    description: "Begin your learning journey",
    href: "/courses",
    completed: false,
  },
  {
    id: "post-intro",
    title: "Post an Introduction",
    description: "Introduce yourself to the community",
    href: "/",
    completed: false,
  },
];

export function OnboardingChecklist({ onDismiss, className }: OnboardingChecklistProps) {
  const [items, setItems] = useState(checklistItems);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Load completion status from localStorage
    const stored = localStorage.getItem("rwid_onboarding_checklist");
    if (stored) {
      try {
        const completed = JSON.parse(stored);
        setItems(prev => prev.map(item => ({
          ...item,
          completed: completed[item.id] || false
        })));
      } catch (error) {
        console.error("Error loading onboarding checklist:", error);
      }
    }

    // Check if dismissed
    const dismissed = localStorage.getItem("rwid_onboarding_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleItemComplete = (itemId: string) => {
    setItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      
      // Save to localStorage
      const completed = updated.reduce((acc, item) => {
        acc[item.id] = item.completed;
        return acc;
      }, {} as Record<string, boolean>);
      localStorage.setItem("rwid_onboarding_checklist", JSON.stringify(completed));
      
      return updated;
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("rwid_onboarding_dismissed", "true");
    onDismiss?.();
  };

  if (isDismissed) return null;

  const completedCount = items.filter(item => item.completed).length;
  const allCompleted = completedCount === items.length;

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <CardTitle className="text-lg">Welcome to RWID!</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete these steps to get the most out of your learning experience.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              item.completed 
                ? "bg-green-50 border-green-200" 
                : "bg-background hover:bg-muted/50 cursor-pointer"
            )}
            onClick={() => handleItemComplete(item.id)}
          >
            <div className="flex-shrink-0">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-medium text-sm",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.title}
                </h4>
                {item.completed && (
                  <Badge variant="secondary" className="text-xs">
                    Done
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-8">
              <Link href={item.href}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
        
        {allCompleted && (
          <div className="mt-4 p-3 rounded-lg bg-green-100 border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-sm text-green-800">
                Congratulations! You're all set up.
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              You've completed the onboarding checklist. Start exploring and learning!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
