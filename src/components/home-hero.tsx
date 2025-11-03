"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, TrendingUp, Award } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

interface HomeHeroProps {
  className?: string;
}

export function HomeHero({ className }: HomeHeroProps) {
  const { loginWithGoogle } = useAuth();
  return (
    <Card className={`bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              Welcome to RWID Community
            </h1>
            <p className="text-muted-foreground mb-4 max-w-2xl">
              Join thousands of learners building their dream careers. Learn from experts, 
              connect with mentors, and land your next remote job.
            </p>
            
            {/* Why RWID Points */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Expert Mentors
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Hands-on Courses
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Real Results
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                Community Support
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" variant="outline" className="bg-white text-foreground hover:bg-white/90 gap-2" onClick={async ()=>{ await loginWithGoogle(); }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c11.046 0 20-8.954 20-20 0-1.341-.138-2.651-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.655 16.108 18.961 14 24 14c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.145 35.091 26.691 36 24 36c-5.202 0-9.62-3.317-11.281-7.946l-6.513 5.02C9.521 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.233-2.231 4.166-4.095 5.565.001-.001 6.191 5.238 6.191 5.238C39.244 35.659 44 30 44 24c0-1.341-.138-2.651-.389-3.917z"/>
              </svg>
              Continue with Google
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/courses">
                Browse Courses
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
