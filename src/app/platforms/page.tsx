"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDocs, limit, query, where } from "firebase/firestore";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { useAuth } from "@/components/auth-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PlatformsBrowserPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const enableCreate = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_CREATION === "1";
  const enableSwitcher = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_SWITCHER === "1";

  useEffect(() => {
    (async () => {
      // Only show platforms with public: true
      const snap = await getDocs(query(collection(db, "platforms"), where("public", "==", true)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setPlatforms(list);
    })();
  }, []);

  const items = useMemo(() => platforms, [platforms]);

  const isPlatformOwner = (platform: any) => {
    return user?.role === "owner" && platform.ownerId === user.id;
  };

  const handleDelete = (platform: any) => {
    setPlatformToDelete(platform);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!platformToDelete) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "platforms", platformToDelete.id));
      setPlatforms(prev => prev.filter(p => p.id !== platformToDelete.id));
      toast.success("Platform deleted successfully");
      setDeleteDialogOpen(false);
      setPlatformToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete platform", error);
      toast.error("Failed to delete platform: " + (error?.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (platform: any) => {
    router.push(`/platforms/${platform.slug}/edit`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Platform browser</h1>
        <div className="flex items-center gap-2">
          {enableSwitcher ? <PlatformSwitcher /> : null}
          {enableCreate && user?.role === "owner" ? (
            <Button asChild>
              <Link href="/platforms/create">Create platform</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const isOwner = isPlatformOwner(p);
          return (
            <div key={p.id} className="group relative rounded-md border p-4 hover:border-primary transition-colors">
              <Link href={`/platforms/${p.slug}`} className="block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.branding.logoUrl ? <img src={p.branding.logoUrl} alt="logo" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: p.branding.primaryColor }}>{p.name}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                  {p.settings.features.communities ? <span className="rounded bg-muted px-2 py-0.5">Communities</span> : null}
                  {p.settings.features.courses ? <span className="rounded bg-muted px-2 py-0.5">Courses</span> : null}
                  {p.settings.features.successStories ? <span className="rounded bg-muted px-2 py-0.5">Success stories</span> : null}
                </div>
              </Link>
              {isOwner && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(p); }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(p); }} 
                        variant="destructive"
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Platform</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{platformToDelete?.name}"? This action cannot be undone and will delete all associated data including communities, courses, and posts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


