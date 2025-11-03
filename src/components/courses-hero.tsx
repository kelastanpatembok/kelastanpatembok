"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

interface CoursesHeroProps {
  totalCourses: number;
  totalCommunities: number;
  totalLessons: number;
  className?: string;
}

export function CoursesHero({ totalCourses, totalCommunities, totalLessons, className }: CoursesHeroProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative p-8 md:p-12">
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Learn from the Best
            <span className="block text-primary">Community Experts</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Join thousands of learners in our vibrant communities. Master new skills with 
            hands-on courses designed by industry professionals and community mentors.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{totalCourses}</div>
                <div className="text-sm text-muted-foreground">Courses</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{totalCommunities}</div>
                <div className="text-sm text-muted-foreground">Communities</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{totalLessons}</div>
                <div className="text-sm text-muted-foreground">Lessons</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">98%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link href="#courses">
                Browse All Courses
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/success-stories">
                Read Success Stories
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
