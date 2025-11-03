"use client";

import { use as reactUse, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Params = { params: Promise<{ id: string }> };

export default function CourseDetailPage({ params }: Params) {
  const { id } = reactUse(params);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // First, get all platforms
        const platformsSnap = await getDocs(collection(db, "platforms"));
        
        // Search for the course across all platforms
        for (const platformDoc of platformsSnap.docs) {
          try {
            const courseDoc = await getDoc(doc(db, "platforms", platformDoc.id, "courses", id));
            if (courseDoc.exists()) {
              const platformData = platformDoc.data();
              // Redirect to platform-based route
              router.replace(`/platforms/${platformData.slug}/courses/${id}`);
              return;
            }
          } catch (error) {
            // Course doesn't exist in this platform's subcollection, continue
            continue;
          }
        }
        
        // Course not found, redirect to platforms page
        router.replace("/platforms");
      } catch (error) {
        console.error("Failed to find course", error);
        router.replace("/platforms");
      }
    })();
  }, [id, router]);

  // Show loading state while redirecting
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}


