"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StoryCardProps {
  story: {
    id?: string;
    author: string;
    role?: string;
    previousRole?: string;
    company?: string;
    location?: string;
    salary?: string;
    previousSalary?: string;
    timeline?: string;
    category?: string;
    industry?: string;
    tags?: string[];
    story: string;
    challenge?: string;
    action?: string;
    result?: string;
    quote?: string;
    avatar?: string;
    companyLogo?: string;
    featured?: boolean;
    views?: number;
    likes?: number;
    createdAt?: string;
    platformId?: string;
  };
  platformId?: string;
  platformSlug?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function StoryCard({
  story,
  platformId,
  platformSlug,
  isExpanded = false,
  onToggleExpand,
  isBookmarked = false,
  onBookmarkToggle,
  onDelete,
  className,
}: StoryCardProps) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const pid = platformId || story.platformId;
        if (!pid) return;
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "platforms", pid));
        const ownerId = (snap.data() as any)?.ownerId;
        setIsOwner(!!ownerId && ownerId === uid);
      } catch {}
    })();
  }, [platformId, story.platformId]);

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!story.id) return;
    const pid = platformId || story.platformId;
    if (!pid) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "platforms", pid, "successStories", story.id));
      toast.success("Kisah sukses berhasil dihapus");
      setDeleteDialogOpen(false);
      if (onDelete) onDelete();
    } catch (e: any) {
      toast.error("Gagal menghapus kisah sukses: " + (e?.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    const pid = platformId || story.platformId;
    const slug = platformSlug;
    if (!slug || !story.id) return;
    router.push(`/platforms/${slug}/success-stories/${story.id}/edit`);
  };


  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      story.featured && "ring-2 ring-primary/20",
      className
    )}>
      {/* Featured Badge */}
      {story.featured && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-primary text-primary-foreground">
            Featured
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-tight">
          {story.author}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Story Content */}
        <div>
          <p className="text-sm leading-6 whitespace-pre-wrap">{story.story}</p>
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="flex items-center justify-end pt-2 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={deleting}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Menghapus..." : "Hapus"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kisah Sukses</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus kisah sukses "{story.author}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed} disabled={deleting}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
