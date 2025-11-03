import Link from "next/link";
import { notFound } from "next/navigation";
import communities from "@/data/communities.json";
import { communityIdToCourses } from "@/data/community-courses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, BookOpen, TrendingUp } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";

type Params = { params: Promise<{ id: string }> };

export default async function CommunityDetailPage({ params }: Params) {
  const { id } = await params;
  const community = communities.find((c) => c.id === id);
  
  if (!community) {
    notFound();
  }

  const courses = communityIdToCourses[id] || [];
  const totalLessons = courses.reduce((acc, course) => acc + course.lessons, 0);

  const getCommunityIcon = (communityId: string) => {
    switch (communityId) {
      case "c_react":
        return "⚛️";
      case "c_job":
        return "💼";
      case "c_portfolio":
        return "🎨";
      case "c_va":
        return "🤖";
      case "c_design":
        return "🎨";
      default:
        return "📚";
    }
  };

  const getCommunityColor = (communityId: string) => {
    switch (communityId) {
      case "c_react":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "c_job":
        return "bg-green-50 border-green-200 text-green-800";
      case "c_portfolio":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "c_va":
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "c_design":
        return "bg-pink-50 border-pink-200 text-pink-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: "Courses", href: "/courses" },
          { label: community.name }
        ]} 
      />

      {/* Back Button */}
      <Button variant="outline" asChild className="mb-4">
        <Link href="/courses" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
      </Button>

      {/* Community Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{getCommunityIcon(community.id)}</div>
            <div className="flex-1">
              <CardTitle className="text-3xl flex items-center gap-3">
                {community.name}
                <Badge className={getCommunityColor(community.id)}>
                  {courses.length} course{courses.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                {community.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="font-medium">{community.memberCount.toLocaleString()}</span>
              <span>members</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">{totalLessons}</span>
              <span>lessons</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">{courses.length > 0 ? Math.round(totalLessons / courses.length) : 0}</span>
              <span>avg per course</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Courses in {community.name}</h2>
        
        {courses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground">
                This community doesn't have any courses yet. Check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={
                        course.level.toLowerCase() === "beginner" ? "bg-green-100 text-green-800 border-green-200" :
                        course.level.toLowerCase() === "intermediate" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                        "bg-red-100 text-red-800 border-red-200"
                      }
                    >
                      {course.level}
                    </Badge>
                    <span>{course.lessons} lessons</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start or continue this learning path in the {community.name} community.
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/courses/${course.id}`}>
                      View Course
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
