"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export function OwnerCreateCourseButton({ platformId, slug, communityId }: { platformId: string; slug: string; communityId: string; }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid || !platformId) return;
        const snap = await getDoc(doc(db, "platforms", platformId));
        const ownerId = (snap.data() as any)?.ownerId;
        setIsOwner(!!ownerId && ownerId === uid);
      } catch {}
    })();
  }, [platformId]);

  if (!isOwner) return null;

  return (
    <Button asChild size="sm">
      <Link href={`/platforms/${slug}/communities/${communityId}/courses/create`} className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> Create Course
      </Link>
    </Button>
  );
}



