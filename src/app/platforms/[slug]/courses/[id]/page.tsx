"use client";

import { use as reactUse, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CommunityPaywallSubtle } from "@/components/community-paywall-subtle";
import { useAuth } from "@/components/auth-provider";

type Params = { params: Promise<{ slug: string; id: string }> };

export default function PlatformCourseDetailPage({ params }: Params) {
  const { slug, id } = reactUse(params);
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [platform, setPlatform] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load platform by slug
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const platformsSnap = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)));
        const platformDoc = platformsSnap.docs[0];
        
        if (!platformDoc) {
          router.replace("/platforms");
          return;
        }

        const platformData: any = { id: platformDoc.id, ...(platformDoc.data() as Record<string, any>) };
        setPlatform(platformData);

        // Load course from platform's courses subcollection
        const courseDoc = await getDoc(doc(db, "platforms", platformDoc.id, "courses", id));
        
        if (!courseDoc.exists()) {
          setLoading(false);
          return;
        }

        const courseData: any = { id: courseDoc.id, ...(courseDoc.data() as Record<string, any>) };
        setCourse(courseData);

        // Load community if course has communityId
        if (courseData.communityId) {
          const communityDoc = await getDoc(
            doc(db, "platforms", platformDoc.id, "communities", courseData.communityId)
          );
          if (communityDoc.exists()) {
            setCommunity({ id: communityDoc.id, ...(communityDoc.data() as Record<string, any>) });
          }
        }

        // Check payment/membership access
        const uid = auth.currentUser?.uid;
        if (!uid) {
          // Not logged in = no access
          setHasAccess(false);
        } else {
          // Check if user is platform owner (always has access)
          const ownerCheck = (platformData as any).ownerId === uid;
          if (ownerCheck) {
            setHasAccess(true);
          } else {
            // Check if user has paid membership for this community
            // First check if they're a platform member
            const memberDoc = await getDoc(doc(db, "platforms", platformDoc.id, "members", uid));
            if (memberDoc.exists()) {
              const memberData = memberDoc.data() as any;
              // Check if they have paid access - look for:
              // 1. hasPaid field in membership
              // 2. or completed payments for this community
              let hasPaidAccess = memberData.hasPaid === true;
              
              // Also check payments collection if it exists
              try {
                const paymentsSnap = await getDocs(query(
                  collection(db, "platforms", platformDoc.id, "payments"),
                  where("userId", "==", uid),
                  where("status", "==", "completed")
                ));
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
      } catch (error) {
        console.error("Failed to load course", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id, router, user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course || !platform) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">Course not found.</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Subtle sticky banner for non-members */}
      {hasAccess === false && community && (
        <CommunityPaywallSubtle
          platformSlug={slug}
          communityId={community.id}
          communityName={community.name}
        />
      )}
      
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Platforms", href: "/platforms" },
            { label: platform.name || platform.slug, href: `/platforms/${platform.slug}` },
            { label: "Courses", href: `/platforms/${platform.slug}/courses` },
            ...(community
              ? [
                  {
                    label: community.name,
                    href: `/platforms/${platform.slug}/communities/${community.id}`,
                  },
                ]
              : []),
            { label: course.title },
          ]}
        />
        <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{course.title}</CardTitle>
              <CardDescription className="mt-2">
                {community?.name && `${community.name} • `}
                {course.level} • {course.lessons || 0} lessons
              </CardDescription>
            </div>
            <Badge variant="secondary">{course.level}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.description && <p className="text-muted-foreground">{course.description}</p>}
          <div className="pt-4">
            <Link href={`/platforms/${platform.slug}/communities/${course.communityId}/courses/${id}/view`}>
              <Button size="lg" className="w-full sm:w-auto">
                Start Learning
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

