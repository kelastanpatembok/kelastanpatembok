"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, BookOpen, TrendingUp, MoreVertical, Pencil, Trash2, Plus, MessageSquare, MessageCircle, GraduationCap } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommunityFeed } from "@/components/community-feed";
import { CommunityPaywall } from "@/components/community-paywall";
import { CommunityPaywallSubtle } from "@/components/community-paywall-subtle";
import { CommunityChat } from "@/components/community-chat";
import { CommunityForum } from "@/components/community-forum";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Params = { params: Promise<{ slug: string; id: string }> };

export default function PlatformCommunityDetailPage({ params }: Params) {
  const { slug, id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteCourseDialogOpen, setDeleteCourseDialogOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<any>(null);
  
  // Initialize active tab from URL param or default to "feed"
  const tabParam = searchParams.get("tab");
  const validTab = (tabParam === "feed" || tabParam === "courses" || tabParam === "forum" || tabParam === "chat") ? tabParam : "feed";
  const [activeTab, setActiveTab] = useState<"feed" | "courses" | "forum" | "chat">(validTab);
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Function to handle tab change and update URL
  const handleTabChange = (tab: "feed" | "courses" | "forum" | "chat") => {
    setActiveTab(tab);
    router.push(`${pathname}?tab=${tab}`);
  };

  useEffect(() => {
    (async () => {
      try {
        // Load platform
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...(ps.docs[0].data() as Record<string, any>) } : null;
        if (!p) {
          router.replace("/platforms");
          return;
        }
        setPlatform(p);

        // Load community
        const commDoc = await getDoc(doc(db, "platforms", p.id as string, "communities", id));
        const comm = commDoc.exists() ? ({ id: commDoc.id, ...(commDoc.data() as Record<string, any>) } as any) : null;
        if (!comm) {
          router.replace("/platforms");
          return;
        }
        setCommunity(comm);

        // Load courses
        const courseSnap = await getDocs(query(collection(db, "platforms", p.id as string, "courses"), where("communityId", "==", id)) as any);
        const coursesList = courseSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
        // Sort by order field (if exists), then by createdAt
        coursesList.sort((a, b) => {
          const aOrder = a.order ?? 999999;
          const bOrder = b.order ?? 999999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aTime = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setCourses(coursesList);

        // Load mentors
        const mentorIds = comm.mentorIds || [];
        if (mentorIds.length > 0) {
          const mentorsData: any[] = [];
          for (const mentorId of mentorIds) {
            try {
              const mentorDoc = await getDoc(doc(db, "users", mentorId));
              if (mentorDoc.exists()) {
                mentorsData.push({ id: mentorDoc.id, ...(mentorDoc.data() as Record<string, any>) });
              }
            } catch (err) {
              console.error(`Error loading mentor ${mentorId}:`, err);
            }
          }
          setMentors(mentorsData);
        }

          // Check payment/membership access
          const uid = auth.currentUser?.uid;
          // Check if user is platform owner (always has access)
          const ownerCheck = uid && (p as any).ownerId === uid;
          setIsOwner(!!ownerCheck);
          
          if (!uid) {
            // Not logged in = no access
            setHasAccess(false);
          } else {
            if (ownerCheck) {
              setHasAccess(true);
            } else {
              // Check if user has paid membership for this community
              // First check if they're a platform member
              const memberDoc = await getDoc(doc(db, "platforms", p.id as string, "members", uid));
              if (memberDoc.exists()) {
                const memberData = memberDoc.data() as any;
                // Check if they have paid access - look for:
                // 1. hasPaid field in membership
                // 2. or completed payments for this community
                let hasPaidAccess = memberData.hasPaid === true || memberData.communities?.includes(id);
                
                // Also check payments collection if it exists
                try {
                  const paymentsSnap = await getDocs(query(
                    collection(db, "platforms", p.id as string, "payments"),
                    where("userId", "==", uid),
                    where("communityId", "==", id),
                    where("status", "==", "completed")
                  ) as any);
                  if (paymentsSnap.docs.length > 0) {
                    hasPaidAccess = true;
                  }
                } catch (e) {
                  // Payments collection might not exist yet, that's okay
                }
                
                setHasAccess(hasPaidAccess);
              } else {
                setHasAccess(false);
              }
            }
          }
      } catch (e) {
        console.error("Failed to load community", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id, router, user]);

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

  if (loading || !platform || !community) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_: any, i: number) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  async function handleDeleteCommunity() {
    if (!platform || !community || !isOwner) return;
    
    setDeleting(true);
    try {
      // Check if there are courses - warn user
      if (courses.length > 0) {
        toast.error(`Cannot delete community with ${courses.length} course(s). Please delete or move courses first.`);
        setDeleting(false);
        setDeleteDialogOpen(false);
        return;
      }

      // Delete the community document
      await deleteDoc(doc(db, "platforms", platform.id as string, "communities", community.id));
      
      // Dispatch event to refresh sidebar
      window.dispatchEvent(new CustomEvent('community-deleted'));
      
      toast.success("Community deleted successfully");
      router.push(`/platforms/${slug}`);
    } catch (error) {
      console.error("Failed to delete community", error);
      toast.error("Failed to delete community");
      setDeleting(false);
    }
  }

  async function handleDeleteCourse() {
    if (!platform || !courseToDelete || !isOwner) return;
    
    setDeletingCourse(true);
    try {
      // Delete the course document
      await deleteDoc(doc(db, "platforms", platform.id as string, "courses", courseToDelete.id));
      
      // Remove from local state
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      
      // Dispatch event to refresh sidebar
      window.dispatchEvent(new CustomEvent('community-deleted'));
      
      toast.success("Course deleted successfully");
      setDeleteCourseDialogOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error("Failed to delete course", error);
      toast.error("Failed to delete course");
    } finally {
      setDeletingCourse(false);
    }
  }

  async function handleCourseReorder(newOrder: any[]) {
    if (!platform || !isOwner) return;
    
    try {
      // Update order for each course
      await Promise.all(
        newOrder.map((course, index) => {
          if (course.order !== index) {
            return updateDoc(
              doc(db, "platforms", platform.id as string, "courses", course.id),
              { order: index }
            );
          }
          return Promise.resolve();
        })
      );
      
      setCourses(newOrder);
      toast.success("Course order updated");
    } catch (error) {
      console.error("Failed to reorder courses", error);
      toast.error("Failed to reorder courses");
      // Reload courses on error
      const courseSnap = await getDocs(query(collection(db, "platforms", platform.id as string, "courses"), where("communityId", "==", id)) as any);
      const coursesList = courseSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
      coursesList.sort((a, b) => {
        const aOrder = a.order ?? 999999;
        const bOrder = b.order ?? 999999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return 0;
      });
      setCourses(coursesList);
    }
  }

  function handleDragStart(e: React.DragEvent, courseId: string) {
    setDraggedCourse(courseId);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  }

  function handleDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDraggedCourse(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (!draggedCourse || !isOwner) return;

    const draggedIndex = courses.findIndex(c => c.id === draggedCourse);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...courses];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    handleCourseReorder(newOrder);
    setDragOverIndex(null);
  }

  // Content component - always visible, no blur
  const ContentArea = () => (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: community.name }]} />

      <Button variant="outline" asChild className="mb-4">
        <Link href={`/platforms/${slug}`} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Platform
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {community.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={community.iconUrl} 
                  alt={community.name || ""} 
                  className="w-16 h-16 rounded-lg object-cover border-2 flex-shrink-0"
                  style={{ 
                    borderColor: community.accentColor || "#e5e7eb",
                    minWidth: "64px",
                    maxWidth: "64px",
                    minHeight: "64px",
                    maxHeight: "64px"
                  }}
                />
              ) : (
                <div className="text-4xl">{getCommunityIcon(community.id)}</div>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl flex items-center gap-3">
                {community.name}
                <Badge className={getCommunityColor(community.id)}>
                  {courses.length} course{courses.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              {community.description && (
                <CardDescription className="text-base mt-3 text-muted-foreground leading-relaxed">
                  {community.description}
                </CardDescription>
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {hasAccess !== false && (
                      <DropdownMenuItem asChild>
                        <Link href={`/platforms/${slug}/communities/${community.id}/courses/create`} className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create Course
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasAccess !== false && <DropdownMenuSeparator />}
                    <DropdownMenuItem asChild>
                      <Link href={`/platforms/${slug}/communities/${community.id}/edit`} className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Community
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="destructive"
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Community
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">{((community.memberCount as number) || 0).toLocaleString()}</span>
              <span>members</span>
            </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="font-medium">{courses.length}</span>
            <span>courses</span>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Mentors Section */}
    {mentors.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Mentors
          </CardTitle>
          <CardDescription>
            Community mentors who can create posts and courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 min-w-[200px]">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={mentor.avatarUrl || mentor.photoURL || ""} alt={mentor.displayName || mentor.name} />
                  <AvatarFallback>{(mentor.displayName || mentor.name || "M").substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{mentor.displayName || mentor.name || "Unknown"}</div>
                  {mentor.bio && <div className="text-sm text-muted-foreground truncate">{mentor.bio}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 -mb-px">
          <Button
            variant={activeTab === "feed" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("feed")}
            className={cn(
              "rounded-b-none border-b-2 h-10",
              activeTab === "feed" 
                ? "border-primary" 
                : "border-transparent hover:bg-muted"
            )}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Mentor Feed
          </Button>
          <Button
            variant={activeTab === "courses" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("courses")}
            className={cn(
              "rounded-b-none border-b-2 h-10",
              activeTab === "courses" 
                ? "border-primary" 
                : "border-transparent hover:bg-muted"
            )}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Courses {courses.length > 0 && `(${courses.length})`}
          </Button>
          <Button
            variant={activeTab === "forum" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("forum")}
            className={cn(
              "rounded-b-none border-b-2 h-10",
              activeTab === "forum" 
                ? "border-primary" 
                : "border-transparent hover:bg-muted"
            )}
          >
            <Users className="h-4 w-4 mr-2" />
            Forum
          </Button>
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("chat")}
            className={cn(
              "rounded-b-none border-b-2 h-10",
              activeTab === "chat" 
                ? "border-primary" 
                : "border-transparent hover:bg-muted"
            )}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Live Chat
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          <CommunityFeed
            platformId={platform.id as string}
            platformSlug={slug}
            communityId={community.id as string}
            communityName={community.name as string}
            onlyPinned={hasAccess === false}
          />
        </div>
      )}

      {activeTab === "courses" && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isOwner ? "Create your first course to get started." : "This community doesn't have any courses yet."}
                </p>
                {isOwner && hasAccess !== false && (
                  <Button asChild>
                    <Link href={`/platforms/${slug}/communities/${community.id}/courses/create`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Course
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              {courses.length > 0 && (
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              )}
              <div className="space-y-6">
                {courses.map((course, index) => (
                  <div
                    key={course.id}
                    draggable={isOwner}
                    onDragStart={(e) => handleDragStart(e, course.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      "relative transition-all",
                      draggedCourse === course.id && "opacity-50",
                      dragOverIndex === index && "scale-[1.02]",
                      isOwner && draggedCourse && draggedCourse !== course.id && "cursor-move"
                    )}
                  >
                    {/* Timeline node */}
                    <div className="absolute left-3 top-4 w-6 h-6 rounded-full border-4 border-background bg-primary shrink-0 z-10" />
                    
                    {/* Course card */}
                    <div
                      className={cn(
                        "ml-12 border rounded-lg p-4 bg-card transition-all hover:shadow-md",
                        dragOverIndex === index && "border-primary border-2 bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {isOwner && (
                          <div className="flex items-center pt-1 cursor-grab active:cursor-grabbing shrink-0">
                            <svg className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-1">
                                {course.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                                <Badge variant="outline">{course.level}</Badge>
                                <span>•</span>
                                <span>{course.lessons} lessons</span>
                              </div>
                            </div>
                            {isOwner && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/platforms/${slug}/communities/${community.id}/courses/${course.id}/edit`} className="flex items-center gap-2">
                                      <Pencil className="h-4 w-4" />
                                      Edit Course
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setCourseToDelete(course);
                                      setDeleteCourseDialogOpen(true);
                                    }}
                                    variant="destructive"
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Course
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {course.description && (
                            <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                          )}
                          <Button asChild size="sm" disabled={hasAccess === false}>
                            <Link href={`/platforms/${slug}/courses/${course.id}`}>View Course</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "forum" && (
        <div className="space-y-4">
          <CommunityForum
            platformId={platform.id as string}
            platformSlug={slug}
            communityId={community.id as string}
            communityName={community.name as string}
          />
        </div>
      )}

      {activeTab === "chat" && (
        <div className="space-y-4">
          <CommunityChat
            platformId={platform.id as string}
            communityId={community.id as string}
            hasAccess={hasAccess !== false}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Opsi 5: Subtle sticky banner for non-members */}
      {hasAccess === false && (
        <CommunityPaywallSubtle
          platformSlug={slug}
          communityId={id}
          communityName={community.name as string}
        />
      )}
      
      <ContentArea />
      
      {/* Opsi 1: Original paywall with blur (currently disabled, uncomment to test) */}
      {/* <div className={hasAccess === false ? "relative pb-96" : ""}>
        <ContentArea />
        
        {hasAccess === false && (
          <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" style={{ backdropFilter: "blur(20px)" }} />
        )}
      </div>
      
      {hasAccess === false && (
        <div className="relative z-10 -mt-96 pt-64">
          <CommunityPaywall
            platformSlug={slug}
            communityId={id}
            communityName={community.name as string}
          />
        </div>
      )} */}
      
      {/* Delete Community Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Community</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{community.name}"? This action cannot be undone.
              {courses.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  This community has {courses.length} course(s) and cannot be deleted until all courses are removed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCommunity}
              disabled={deleting || courses.length > 0}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <Dialog open={deleteCourseDialogOpen} onOpenChange={setDeleteCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteCourseDialogOpen(false);
              setCourseToDelete(null);
            }} disabled={deletingCourse}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
            >
              {deletingCourse ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
