"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Repeat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PlatformSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      (async () => {
        try {
          // Only show platforms with public: true
          const snap = await getDocs(query(collection(db, "platforms"), where("public", "==", true)));
          const platformsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          setPlatforms(platformsData);
        } catch (error) {
          console.error("Error loading platforms:", error);
          setPlatforms([]);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [open]);

  const list = platforms.filter(p => 
    (p.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
    (p.slug?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  function goTo(slug: string) {
    // If already under a platform path, replace the slug segment; otherwise go to /platforms/slug
    if (pathname.startsWith("/platforms/")) {
      const parts = pathname.split("/");
      if (parts.length >= 3) {
        parts[2] = slug;
        router.push(parts.join("/"));
      } else {
        router.push(`/platforms/${slug}`);
      }
    } else {
      router.push(`/platforms/${slug}`);
    }
    setOpen(false);
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Switch platform">
            <Repeat className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Switch platform</p>
        </TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch platform</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search platforms..." value={searchQuery} onChange={(e)=> setSearchQuery(e.target.value)} />
            <div className="max-h-72 overflow-auto divide-y rounded-md border">
              {loading ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {list.map(p => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent" onClick={()=> goTo(p.slug)}>
                      <div className="font-medium" style={{ color: p.branding?.primaryColor || p.primaryColor || "#66b132" }}>{p.name || "Unnamed Platform"}</div>
                      <div className="text-xs text-muted-foreground">/{p.slug}</div>
                    </button>
                  ))}
                  {list.length === 0 && !loading && (
                    <div className="p-3 text-sm text-muted-foreground">No platforms match.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


