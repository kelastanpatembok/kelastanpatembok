"use client";

import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

type CommunityPaywallSubtleProps = {
  platformSlug: string;
  communityId: string;
  communityName: string;
};

export function CommunityPaywallSubtle({ platformSlug, communityId, communityName }: CommunityPaywallSubtleProps) {
  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                Unlock full access to <span className="text-primary font-semibold">{communityName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Join {communityName} to access all courses, discussions, and exclusive content
              </p>
            </div>
          </div>
          <Button 
            asChild 
            size="sm" 
            className="shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Link href={`/payment?platform=${platformSlug}&community=${communityId}`} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Subscribe
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

