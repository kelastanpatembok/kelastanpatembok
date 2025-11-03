"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Sparkles, Check } from "lucide-react";
import Link from "next/link";

type CommunityPaywallProps = {
  platformSlug: string;
  communityId: string;
  communityName: string;
};

export function CommunityPaywall({ platformSlug, communityId, communityName }: CommunityPaywallProps) {
  return (
    <div className="relative mt-12">
      {/* Blur gradient fade effect above paywall */}
      <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" style={{ backdropFilter: "blur(8px)" }} />
      
      {/* Paywall section - part of page flow */}
      <Card className="relative bg-background border-2 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold">Unlock {communityName}</CardTitle>
          <CardDescription className="text-base md:text-lg mt-2">
            Get full access to exclusive content, courses, and community discussions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Features list */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm md:text-base">Access all courses and lessons</p>
                <p className="text-xs md:text-sm text-muted-foreground">Learn at your own pace with structured content</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm md:text-base">Join community discussions</p>
                <p className="text-xs md:text-sm text-muted-foreground">Connect with peers and experts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm md:text-base">Get exclusive updates</p>
                <p className="text-xs md:text-sm text-muted-foreground">Be the first to know about new content</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-2 md:pt-4">
            <Button asChild size="lg" className="w-full text-base md:text-lg h-12 md:h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
              <Link href={`/payment?platform=${platformSlug}&community=${communityId}`} className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                Subscribe to Unlock Access
              </Link>
            </Button>
            <p className="text-center text-xs md:text-sm text-muted-foreground mt-2 md:mt-3">
              Cancel anytime • Secure payment
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

