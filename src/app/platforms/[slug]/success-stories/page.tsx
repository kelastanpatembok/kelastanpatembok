"use client";

import { use as reactUse, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { StoryCard } from "@/components/story-card";
// removed filters for simplified view
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

type Params = { params: Promise<{ slug: string }> };

export default function PlatformStoriesPage({ params }: Params) {
  const { slug } = reactUse(params);
  const [platform, setPlatform] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
      setPlatform(p);
      if (p) {
        const ss = await getDocs(collection(db, "platforms", p.id, "successStories"));
        setStories(ss.docs.map(d => ({ id: d.id, ...d.data() })) as any[]);
        try {
          const uid = auth.currentUser?.uid;
          setIsOwner(!!(uid && (p as any)?.ownerId === uid));
        } catch {}
      } else {
        setStories([]);
        setIsOwner(false);
      }
    })();
  }, [slug]);

  // filters removed

  const platformStories = useMemo(() => {
    const scoped = stories.filter((s: any) => platform && s.platformId === platform.id);
    scoped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return scoped;
  }, [platform, stories]);

  // removed category tabs

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Kisah Sukses" }]} />
      {isOwner && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/platforms/${slug}/success-stories/create`} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Buat Kisah Sukses
            </Link>
          </Button>
        </div>
      )}
      {/* filters removed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platformStories.map((s) => (
          <StoryCard 
            key={s.id} 
            story={s as any} 
            platformId={platform?.id}
            platformSlug={slug}
            onDelete={() => {
              setStories(prev => prev.filter(st => st.id !== s.id));
            }}
          />
        ))}
      </div>
    </div>
  );
}


