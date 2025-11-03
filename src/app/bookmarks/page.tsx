"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { EnhancedPostCard } from "@/components/enhanced-post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function BookmarksPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [authorAvatars, setAuthorAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const uid = auth.currentUser?.uid || (user as any)?.uid || (user as any)?.id;
        if (!uid) {
          setLoading(false);
          return;
        }

        // Get bookmarked posts from Firestore
        const bookmarksSnap = await getDocs(collection(db, "users", uid, "bookmarks"));
        
        if (bookmarksSnap.empty) {
          setBookmarkedPosts(new Set());
          setPosts([]);
          setLoading(false);
          return;
        }

        const bookmarks = bookmarksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const bookmarkedIds = new Set(bookmarks.map((b: any) => b.postId));
        setBookmarkedPosts(bookmarkedIds);

        // Fetch posts from their respective platforms
        const postsData: any[] = [];
        
        for (const bookmark of bookmarks) {
          const { platformId, postId } = bookmark;
          if (!platformId || !postId) continue;
          
          try {
            const postDoc = await getDoc(doc(db, "platforms", platformId, "posts", postId));
            if (postDoc.exists()) {
              const postData: any = { id: postDoc.id, ...postDoc.data() };
              // Convert Timestamps to ISO strings
              if (postData.createdAt && postData.createdAt.toDate) {
                postData.createdAt = postData.createdAt.toDate().toISOString();
              }
              if (postData.eventDate && typeof postData.eventDate === 'string') {
                // Keep as is
              } else if (postData.eventDate && postData.eventDate.toDate) {
                postData.eventDate = postData.eventDate.toDate().toISOString();
              }
              
              // Get platform data
              const platformDoc = await getDoc(doc(db, "platforms", platformId));
              const platformData = platformDoc.exists() ? { id: platformDoc.id, ...platformDoc.data() } : null;
              
              postsData.push({
                ...postData,
                platformId,
                platformName: (platformData as any)?.name,
                platformSlug: (platformData as any)?.slug,
                platformPrimaryColor: (platformData as any)?.primaryColor || (platformData as any)?.branding?.primaryColor,
              });
            }
          } catch (error) {
            console.error(`Error fetching post ${postId}:`, error);
          }
        }

        setPosts(postsData);

        // Load like states
        try {
          const uid = auth.currentUser?.uid || (user as any)?.uid || (user as any)?.id;
          if (uid) {
            const liked = new Set<string>();
            await Promise.all(postsData.map(async (post: any) => {
              try {
                const r = await getDoc(doc(db, "platforms", post.platformId, "posts", post.id, "reactions", uid));
                if (r.exists()) liked.add(post.id);
              } catch {}
            }));
            setLikedPosts(liked);
          }
        } catch {}

      } catch (error) {
        console.error("Error loading bookmarks:", error);
        toast.error("Failed to load bookmarks");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleLike = async (postId: string, platformId: string) => {
    if (!auth.currentUser) { toast.error("Sign in to like"); return; }
    const uid = auth.currentUser.uid;
    try {
      const { setDoc, deleteDoc, updateDoc, increment } = await import("firebase/firestore");
      const isLiked = likedPosts.has(postId);
      if (isLiked) {
        await deleteDoc(doc(db, "platforms", platformId, "posts", postId, "reactions", uid));
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p?.likes || 0) - 1) } : p));
        toast.success("Unliked");
      } else {
        await setDoc(doc(db, "platforms", platformId, "posts", postId, "reactions", uid), { likedAt: new Date() });
        setLikedPosts(prev => new Set([...prev, postId]));
        await updateDoc(doc(db, "platforms", platformId, "posts", postId), { likes: increment(1) });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p?.likes || 0) + 1 } : p));
        toast.success("Liked");
      }
    } catch { toast.error("Failed to like"); }
  };

  const handleBookmark = async (postId: string) => {
    if (!auth.currentUser) { toast.error("Sign in to bookmark"); return; }
    const uid = auth.currentUser.uid;
    const post = posts.find(p => p.id === postId);
    if (!post || !post.platformId) {
      toast.error("Post not found");
      return;
    }
    const bookmarkId = `${post.platformId}_${postId}`;
    try {
      const { setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
      const isBookmarked = bookmarkedPosts.has(postId);
      if (isBookmarked) {
        await deleteDoc(doc(db, "users", uid, "bookmarks", bookmarkId));
        setBookmarkedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast.success("Bookmark removed");
      } else {
        await setDoc(doc(db, "users", uid, "bookmarks", bookmarkId), {
          platformId: post.platformId,
          postId,
          createdAt: serverTimestamp(),
        });
        setBookmarkedPosts(prev => new Set([...prev, postId]));
        toast.success("Bookmarked");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-sm text-muted-foreground">You need to be signed in to view your bookmarks.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Bookmarks" }]} />
        <div>
          <h1 className="text-2xl font-semibold mb-2">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">Your saved posts</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const currentUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Bookmarks" }]} />
      <div>
        <h1 className="text-2xl font-semibold mb-2">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">Your saved posts</p>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          description="Save posts by clicking the bookmark icon on any post."
          icon={<Bookmark className="h-12 w-12 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => {
            const isSelf = !!currentUid && post.authorId === currentUid;
            const authorName = post.authorName || (isSelf ? ((user as any).displayName || (user as any).name || (user as any).email || "You") : "Unknown User");
            const authorAvatar = post.authorAvatar || ((isSelf ? ((user as any).photoURL || "") : ""));

            return (
              <EnhancedPostCard
                key={post.id}
                post={{
                  ...post,
                  authorName,
                  authorAvatar,
                  communityName: post.communityName || "",
                  platformName: post.platformName,
                  platformSlug: post.platformSlug,
                  platformPrimaryColor: post.platformPrimaryColor,
                  isLiked: likedPosts.has(post.id),
                  isBookmarked: bookmarkedPosts.has(post.id),
                }}
                canDelete={isSelf}
                canEdit={isSelf}
                canComment={false}
                canReact={true}
                canPin={false}
                onLike={() => handleLike(post.id, post.platformId)}
                onBookmark={handleBookmark}
                onShare={() => toast.success("Post shared!")}
                onReport={() => {}}
                onDelete={async () => {
                  toast.error("Please delete from the original post");
                }}
                onEditSubmit={async () => {
                  toast.error("Please edit from the original post");
                }}
                onAddComment={async () => {
                  toast.error("Please comment from the original post");
                }}
                onVotePoll={async () => {
                  toast.error("Please vote from the original post");
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

